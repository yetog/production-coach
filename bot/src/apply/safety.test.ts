/**
 * Dry-run, verification and undo (issue #22), against real offline documents.
 *
 * The rules being enforced here are the ones that make it acceptable to point
 * this at a live project during a demo:
 *  - dry-run never opens a transaction
 *  - undo removes only what the agent's own action log says it created
 *  - verification reports a clear failure rather than a hang
 */
import { createOfflineDocument } from "@audiotool/nexus/node"
import { describe, expect, it } from "vitest"
import type { Plan } from "../plan/contract.js"
import { stopQuietly } from "../test-support.js"
import type { ActionRecord } from "./action-log.js"
import { describeDryRun, undoAction, verifyAction } from "./safety.js"

type Doc = Awaited<ReturnType<typeof createOfflineDocument>>

function plan(overrides: Partial<Plan> = {}): Plan {
  return {
    planId: "add_808-33-48",
    command: "add a dark 808 under the drop",
    intent: "add_808",
    interpretedIntent: "Add a dark 808 bassline under the drop (bars 33-48)",
    target: { section: "drop", startBar: 33, endBar: 48, confidence: 0.81 },
    actions: [
      { type: "create_source", deviceType: "bassline", displayName: "Agent 808", tone: "dark" },
      { type: "route_to_mixer", deviceType: "bassline" },
      { type: "create_note_track", displayName: "Agent 808" },
      { type: "create_note_region", startBar: 33, durationBars: 16 },
      { type: "create_notes", pitch: 24, pattern: "sustained", velocity: 0.9 },
    ],
    summary: "I will add a dark 808 bassline across bars 33-48.",
    safety: "creates_only",
    verification: [
      { kind: "entities_exist", description: "everything the apply created" },
      { kind: "entity_count", entityType: "note", atLeast: 1 },
      { kind: "routed_to_mixer", description: "the 808 source reaches a mixer channel" },
    ],
    requiresConfirmation: false,
    ...overrides,
  }
}

function record(createdEntityIds: string[]): ActionRecord {
  return {
    actionId: "20260809T000000000-0001-abcdef",
    timestamp: new Date().toISOString(),
    project: "projects/00000000-0000-4000-8000-000000000000",
    command: "add a dark 808 under the drop",
    planId: "add_808-33-48",
    createdEntityIds,
    updatedFields: [],
  }
}

/** A project with a pre-existing synth the agent must never touch. */
async function projectWithUserContent(): Promise<{ doc: Doc; userSynthId: string }> {
  const doc = await createOfflineDocument()
  const userSynthId = await doc.modify((t) => {
    const groove = t.create("groove", {})
    t.create("config", { tempoBpm: 128, defaultGroove: groove.location })
    t.create("mixerMaster", {})
    return t.create("heisenberg", { displayName: "User Synth" }).id
  })
  return { doc, userSynthId }
}

describe("describeDryRun", () => {
  it("describes every action in the plan without needing a document", () => {
    const lines = describeDryRun(plan())

    expect(lines.length).toBe(plan().actions.length)
    expect(lines.join("\n")).toMatch(/bassline/)
    expect(lines.join("\n")).toMatch(/33/)
  })

  it("says plainly that nothing will change for a plan with no actions", () => {
    const lines = describeDryRun(plan({ actions: [] }))

    expect(lines.join(" ")).toMatch(/nothing|no changes/i)
  })

  it("is pure - it cannot mutate because it never receives a document", () => {
    // Signature-level guarantee: describeDryRun takes only a plan.
    expect(describeDryRun.length).toBe(1)
  })
})

describe("undoAction", () => {
  it("removes exactly the entities the action log recorded", async () => {
    const { doc, userSynthId } = await projectWithUserContent()
    try {
      const agentIds = await doc.modify((t) => [
        t.create("bassline", { displayName: "Agent 808" }).id,
        t.create("mixerChannel", {}).id,
      ])

      const result = await undoAction(doc as never, record(agentIds))

      expect(result.removedEntityIds.sort()).toEqual([...agentIds].sort())
      for (const id of agentIds) {
        expect(doc.queryEntities.getEntity(id)).toBeUndefined()
      }
      // The user's own device is untouched: this is the whole point.
      expect(doc.queryEntities.getEntity(userSynthId)).toBeDefined()
    } finally {
      await stopQuietly(doc)
    }
  })

  it("never removes user content even if the log is wrong about an id", async () => {
    const { doc, userSynthId } = await projectWithUserContent()
    try {
      const agentId = await doc.modify((t) => t.create("bassline", {}).id)

      // A log naming an id that was already deleted must not derail the rest.
      const result = await undoAction(doc as never, record([agentId, "does-not-exist"]))

      expect(result.removedEntityIds).toContain(agentId)
      expect(result.missingEntityIds).toContain("does-not-exist")
      expect(doc.queryEntities.getEntity(userSynthId)).toBeDefined()
    } finally {
      await stopQuietly(doc)
    }
  })

  it("is idempotent - undoing twice does not fail", async () => {
    const { doc } = await projectWithUserContent()
    try {
      const agentId = await doc.modify((t) => t.create("bassline", {}).id)

      await undoAction(doc as never, record([agentId]))
      const second = await undoAction(doc as never, record([agentId]))

      expect(second.removedEntityIds).toEqual([])
      expect(second.missingEntityIds).toEqual([agentId])
    } finally {
      await stopQuietly(doc)
    }
  })

  it("does nothing at all when the log recorded no created entities", async () => {
    const { doc, userSynthId } = await projectWithUserContent()
    try {
      const result = await undoAction(doc as never, record([]))

      expect(result.removedEntityIds).toEqual([])
      expect(doc.queryEntities.getEntity(userSynthId)).toBeDefined()
    } finally {
      await stopQuietly(doc)
    }
  })
})

describe("verifyAction", () => {
  it("passes when every recorded entity exists and the source is routed", async () => {
    const { doc } = await projectWithUserContent()
    try {
      const ids = await doc.modify((t) => {
        const source = t.create("bassline", { displayName: "Agent 808" })
        const channel = t.create("mixerChannel", {})
        const cable = t.create("desktopAudioCable", {
          fromSocket: source.fields.audioOutput.location,
          toSocket: channel.fields.audioInput.location,
        })
        const collection = t.create("noteCollection", {})
        const note = t.create("note", { collection: collection.location, pitch: 24 })
        return [source.id, channel.id, cable.id, collection.id, note.id]
      })

      const result = await verifyAction(doc as never, record(ids), plan())

      expect(result.ok).toBe(true)
      expect(result.failures).toEqual([])
    } finally {
      await stopQuietly(doc)
    }
  })

  it("fails with a specific reason when a recorded entity is missing", async () => {
    const { doc } = await projectWithUserContent()
    try {
      const result = await verifyAction(doc as never, record(["ghost-entity"]), plan())

      expect(result.ok).toBe(false)
      expect(result.failures.join(" ")).toMatch(/ghost-entity/)
    } finally {
      await stopQuietly(doc)
    }
  })

  it("fails when the source was created but never routed to a mixer", async () => {
    const { doc } = await projectWithUserContent()
    try {
      const ids = await doc.modify((t) => {
        const collection = t.create("noteCollection", {})
        return [
          t.create("bassline", { displayName: "Agent 808" }).id,
          collection.id,
          t.create("note", { collection: collection.location, pitch: 24 }).id,
        ]
      })

      const result = await verifyAction(doc as never, record(ids), plan())

      expect(result.ok).toBe(false)
      expect(result.failures.join(" ")).toMatch(/rout/i)
    } finally {
      await stopQuietly(doc)
    }
  })

  it("reports which check failed rather than a single opaque boolean", async () => {
    const { doc } = await projectWithUserContent()
    try {
      const result = await verifyAction(
        doc as never,
        record([]),
        plan({ verification: [{ kind: "entity_count", entityType: "note", atLeast: 4 }] }),
      )

      expect(result.ok).toBe(false)
      expect(result.failures[0]).toMatch(/note/)
      expect(result.checked).toBe(1)
    } finally {
      await stopQuietly(doc)
    }
  })
})
