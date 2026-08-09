/**
 * Plan executor / "Add 808 to Drop" (issue #21), against real offline documents.
 *
 * Option B from the issue: a `bassline` synth plus note track -> collection ->
 * region -> notes, routed to a mixer channel. Everything here runs through the
 * SDK validator, so a wrong entity name, field name or socket fails the suite
 * rather than a live session.
 */
import { createOfflineDocument } from "@audiotool/nexus/node"
import { Ticks } from "@audiotool/nexus/utils"
import { describe, expect, it } from "vitest"
import { analyzeSessionReport } from "../analyze/analyzer.js"
import { planCommand } from "../plan/planner.js"
import type { Plan } from "../plan/contract.js"
import { stopQuietly } from "../test-support.js"
import { executePlan } from "./executor.js"
import { verifyAction } from "./safety.js"

type Doc = Awaited<ReturnType<typeof createOfflineDocument>>

const BAR = Ticks.SemiBreve

async function projectWithDrop(): Promise<Doc> {
  const doc = await createOfflineDocument()
  let order = 500
  await doc.modify((t) => {
    const groove = t.create("groove", {})
    t.create("config", {
      tempoBpm: 128,
      defaultGroove: groove.location,
      durationTicks: 64 * BAR,
    })
    t.create("mixerMaster", {})
    const synth = t.create("heisenberg", { displayName: "Lead" })
    const channel = t.create("mixerChannel", {})
    t.create("desktopAudioCable", {
      fromSocket: synth.fields.audioOutput.location,
      toSocket: channel.fields.audioInput.location,
    })
    // intro 1 voice, drop 5 voices - enough contrast to detect confidently.
    for (const [startBar, voices] of [
      [1, 1],
      [33, 5],
    ] as const) {
      for (let v = 0; v < voices; v += 1) {
        const track = t.create("noteTrack", {
          player: synth.location,
          orderAmongTracks: (order += 1),
        })
        const collection = t.create("noteCollection", {})
        t.create("noteRegion", {
          collection: collection.location,
          track: track.location,
          region: { positionTicks: (startBar - 1) * BAR, durationTicks: 16 * BAR },
        })
        t.create("note", { collection: collection.location, pitch: 60, positionTicks: 0 })
      }
    }
  })
  return doc
}

function planFor(doc: Doc, command = "add a dark 808 under the drop"): Plan {
  return planCommand(command, analyzeSessionReport(doc))
}

describe("executePlan - the flagship 808 action", () => {
  it("creates a routed 808 source and notes in the target bars", async () => {
    const doc = await projectWithDrop()
    try {
      const plan = planFor(doc)
      expect(plan.target.startBar).toBe(33)

      const result = await executePlan(doc as never, plan)

      expect(result.createdEntityIds.length).toBeGreaterThan(0)
      const types = result.createdEntityIds.map(
        (id) => (doc.queryEntities.getEntity(id) as { entityType: string }).entityType,
      )
      expect(types).toContain("bassline")
      expect(types).toContain("mixerChannel")
      expect(types).toContain("desktopAudioCable")
      expect(types).toContain("noteTrack")
      expect(types).toContain("noteRegion")
      expect(types).toContain("note")
    } finally {
      await stopQuietly(doc)
    }
  })

  it("places the region at the planned bar, using real tick math", async () => {
    const doc = await projectWithDrop()
    try {
      const plan = planFor(doc)
      const result = await executePlan(doc as never, plan)

      const region = result.createdEntityIds
        .map((id) => doc.queryEntities.getEntity(id) as unknown)
        .find(
          (e) => (e as { entityType?: string } | undefined)?.entityType === "noteRegion",
        ) as { fields: { region: { fields: { positionTicks: { value: number } } } } }
      expect(region).toBeDefined()

      expect(region.fields.region.fields.positionTicks.value).toBe(32 * BAR)
    } finally {
      await stopQuietly(doc)
    }
  })

  it("passes its own verification checks after applying", async () => {
    const doc = await projectWithDrop()
    try {
      const plan = planFor(doc)
      const result = await executePlan(doc as never, plan)

      const verified = await verifyAction(
        doc as never,
        {
          actionId: "a",
          timestamp: new Date().toISOString(),
          project: "projects/x",
          command: plan.command,
          planId: plan.planId,
          createdEntityIds: result.createdEntityIds,
          updatedFields: [],
        },
        plan,
      )

      expect(verified.failures).toEqual([])
      expect(verified.ok).toBe(true)
    } finally {
      await stopQuietly(doc)
    }
  })

  it("does not touch anything that was already in the project", async () => {
    const doc = await projectWithDrop()
    try {
      const before = doc.queryEntities.get().map((e) => e.id)
      const plan = planFor(doc)

      await executePlan(doc as never, plan)

      for (const id of before) {
        expect(doc.queryEntities.getEntity(id), id).toBeDefined()
      }
    } finally {
      await stopQuietly(doc)
    }
  })

  it("gives its note track a unique orderAmongTracks - a duplicate throws and wedges", async () => {
    const doc = await projectWithDrop()
    try {
      const plan = planFor(doc)
      const result = await executePlan(doc as never, plan)

      const orders = doc.queryEntities
        .ofTypes("noteTrack")
        .get()
        .map((t) => (t as { fields: { orderAmongTracks: { value: number } } }).fields.orderAmongTracks.value)

      expect(new Set(orders).size).toBe(orders.length)
      expect(result.createdEntityIds.length).toBeGreaterThan(0)
    } finally {
      await stopQuietly(doc)
    }
  })

  it("refuses a plan with no actions instead of writing something arbitrary", async () => {
    const doc = await createOfflineDocument()
    try {
      const plan = planFor(doc as never) // empty project -> clarification, no actions
      expect(plan.actions).toEqual([])

      // It refuses, and surfaces the planner's own clarification rather than a
      // generic "nothing to do" - the operator needs to know what to fix.
      await expect(executePlan(doc as never, plan)).rejects.toThrow(plan.clarification!)
      expect(doc.queryEntities.ofTypes("bassline").get()).toEqual([])
    } finally {
      await stopQuietly(doc)
    }
  })

  it("validates the device is routable BEFORE opening the transaction", async () => {
    const doc = await projectWithDrop()
    try {
      const plan = planFor(doc)
      // matrixArpeggiator has no audio output: this must fail outside modify().
      const broken: Plan = {
        ...plan,
        actions: plan.actions.map((a) =>
          a.type === "create_source" ? { ...a, deviceType: "matrixArpeggiator" } : a,
        ),
      }

      await expect(executePlan(doc as never, broken)).rejects.toThrow(/desktopNoteCable/)

      // The document must still be usable - proof the throw was pre-transaction.
      await expect(doc.modify((t) => t.create("tinyGain", {}))).resolves.toBeDefined()
    } finally {
      await stopQuietly(doc)
    }
  })

  it("is re-runnable: a second apply creates a separate 808 rather than corrupting the first", async () => {
    const doc = await projectWithDrop()
    try {
      const plan = planFor(doc)
      const first = await executePlan(doc as never, plan)
      const second = await executePlan(doc as never, plan)

      expect(new Set([...first.createdEntityIds, ...second.createdEntityIds]).size).toBe(
        first.createdEntityIds.length + second.createdEntityIds.length,
      )
    } finally {
      await stopQuietly(doc)
    }
  })
})
