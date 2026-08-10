/**
 * Agent service (issue #23).
 *
 * The four verbs, extracted so the CLI and the HTTP bridge share ONE copy of
 * the safety rules. That is the whole point of this layer: if the bridge
 * reimplemented the plan-id check or the confirmation gate, the two would
 * drift and the safer path would be whichever one nobody was demoing.
 *
 * Every rule the CLI enforced is asserted here against real offline documents.
 */
import { createOfflineDocument } from "@audiotool/nexus/node"
import { Ticks } from "@audiotool/nexus/utils"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ActionLog } from "../apply/action-log.js"
import { AgentError, createAgentService } from "./service.js"

const UUID = "00000000-0000-4000-8000-000000000000"
const PROJECT = `projects/${UUID}`
const BAR = Ticks.SemiBreve

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "pc-service-"))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

/**
 * A client whose open() always hands back the SAME document, the way a real
 * backend hands back successive views of one persisted project. Counting the
 * calls is how we assert each verb takes its own document.
 */
async function fakeBackend(options: { arranged?: boolean } = {}) {
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
    if (options.arranged !== true) return
    const synth = t.create("heisenberg", { displayName: "Lead" })
    const channel = t.create("mixerChannel", {})
    t.create("desktopAudioCable", {
      fromSocket: synth.fields.audioOutput.location,
      toSocket: channel.fields.audioInput.location,
    })
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

  // Offline documents have no start/stop; the service expects them.
  const view = Object.assign(Object.create(Object.getPrototypeOf(doc) as object), doc, {
    start: async () => undefined,
    stop: async () => undefined,
  })
  const open = vi.fn(async () => view as never)
  return { doc, open, client: { open } }
}

function service(client: { open: unknown }, logDir: string) {
  return createAgentService({
    client: client as never,
    log: new ActionLog(logDir),
  })
}

describe("analyze", () => {
  it("returns the session report for a project reference in any accepted form", async () => {
    const { client } = await fakeBackend({ arranged: true })
    const agent = service(client, dir)

    const report = await agent.analyze(`https://www.audiotool.com/studio?project=${UUID}`)

    expect(report.tempoBpm).toBe(128)
    expect(report.shape).toBe("arranged")
    expect(report.drop?.startBar).toBe(33)
  })

  it("rejects an unusable project reference before opening anything", async () => {
    const { client, open } = await fakeBackend()
    const agent = service(client, dir)

    await expect(agent.analyze("<PROJECT_ID>")).rejects.toBeInstanceOf(AgentError)
    expect(open).not.toHaveBeenCalled()
  })
})

describe("the default project", () => {
  it("falls back to the configured project when none is given", async () => {
    const { client } = await fakeBackend({ arranged: true })
    const agent = createAgentService({
      client: client as never,
      log: new ActionLog(dir),
      defaultProject: PROJECT,
    })

    // The bridge sends no `project` field when the caller omits it; without a
    // fallback here every request would fail as invalid_project.
    const report = await agent.analyze(undefined)

    expect(report.tempoBpm).toBe(128)
  })

  it("prefers an explicit project over the configured default", async () => {
    const other = "11111111-1111-4111-8111-111111111111"
    const { client, open } = await fakeBackend({ arranged: true })
    const agent = createAgentService({
      client: client as never,
      log: new ActionLog(dir),
      defaultProject: PROJECT,
    })

    await agent.analyze(other)

    expect(open).toHaveBeenCalledWith(`projects/${other}`)
  })

  it("still rejects clearly when neither is available", async () => {
    const { client } = await fakeBackend()
    const agent = createAgentService({ client: client as never, log: new ActionLog(dir) })

    const error = await agent.analyze(undefined).catch((e: unknown) => e)

    expect((error as AgentError).code).toBe("invalid_project")
  })
})

describe("plan", () => {
  it("produces an applyable plan when the drop is clear", async () => {
    const { client } = await fakeBackend({ arranged: true })
    const agent = service(client, dir)

    const plan = await agent.plan(PROJECT, "add a dark 808 under the drop")

    expect(plan.intent).toBe("add_808")
    expect(plan.requiresConfirmation).toBe(false)
    expect(plan.target.startBar).toBe(33)
  })

  it("never mutates the project", async () => {
    const { client, doc } = await fakeBackend({ arranged: true })
    const before = doc.queryEntities.get().length
    const agent = service(client, dir)

    await agent.plan(PROJECT, "add a dark 808 under the drop")

    expect(doc.queryEntities.get().length).toBe(before)
  })

  it("returns a plan carrying the question when the target is unclear", async () => {
    const { client } = await fakeBackend() // empty: no drop to find
    const agent = service(client, dir)

    const plan = await agent.plan(PROJECT, "add a dark 808 under the drop")

    expect(plan.requiresConfirmation).toBe(true)
    expect(plan.clarification).toBeDefined()
    expect(plan.actions).toEqual([])
  })
})

describe("apply - the safety rules the CLI enforced", () => {
  it("refuses without a plan id, naming the one it would accept", async () => {
    const { client, doc } = await fakeBackend({ arranged: true })
    const before = doc.queryEntities.get().length
    const agent = service(client, dir)

    const error = await agent
      .apply(PROJECT, "add a dark 808 under the drop", undefined)
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(AgentError)
    expect((error as AgentError).code).toBe("plan_id_required")
    expect((error as AgentError).message).toMatch(/add_808-33-48/)
    expect(doc.queryEntities.get().length).toBe(before)
  })

  it("refuses a stale plan id rather than applying something else", async () => {
    const { client, doc } = await fakeBackend({ arranged: true })
    const before = doc.queryEntities.get().length
    const agent = service(client, dir)

    const error = await agent
      .apply(PROJECT, "add a dark 808 under the drop", "add_808-99-99")
      .catch((e: unknown) => e)

    expect((error as AgentError).code).toBe("plan_id_mismatch")
    expect(doc.queryEntities.get().length).toBe(before)
  })

  it("refuses a plan that needs confirmation", async () => {
    const { client } = await fakeBackend() // empty project
    const agent = service(client, dir)
    const plan = await agent.plan(PROJECT, "add a dark 808 under the drop")

    const error = await agent
      .apply(PROJECT, "add a dark 808 under the drop", plan.planId)
      .catch((e: unknown) => e)

    expect((error as AgentError).code).toBe("needs_confirmation")
  })

  it("applies, logs the action, and returns the verification result", async () => {
    const { client } = await fakeBackend({ arranged: true })
    const agent = service(client, dir)
    const plan = await agent.plan(PROJECT, "add a dark 808 under the drop")

    const outcome = await agent.apply(PROJECT, plan.command, plan.planId)

    expect(outcome.action.createdEntityIds.length).toBeGreaterThan(0)
    expect(outcome.verification.ok).toBe(true)
    expect(outcome.summary).toMatch(/bassline/i)
    expect(await new ActionLog(dir).get(outcome.action.actionId)).toBeDefined()
  })

  it("verifies against a freshly opened document, not the one that applied", async () => {
    const { client, open } = await fakeBackend({ arranged: true })
    const agent = service(client, dir)
    const plan = await agent.plan(PROJECT, "add a dark 808 under the drop")
    open.mockClear()

    await agent.apply(PROJECT, plan.command, plan.planId)

    // re-plan, apply, verify - three separate documents. A failed apply wedges
    // its document, so reusing it for verification would hang.
    expect(open.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it("records the real project reference in the action log", async () => {
    const { client } = await fakeBackend({ arranged: true })
    const agent = service(client, dir)
    const plan = await agent.plan(PROJECT, "add a dark 808 under the drop")

    const outcome = await agent.apply(PROJECT, plan.command, plan.planId)

    expect(outcome.action.project).toBe(PROJECT)
  })
})

describe("undo", () => {
  it("removes exactly what the last apply created", async () => {
    const { client, doc } = await fakeBackend({ arranged: true })
    const agent = service(client, dir)
    const before = doc.queryEntities.get().length
    const plan = await agent.plan(PROJECT, "add a dark 808 under the drop")
    const applied = await agent.apply(PROJECT, plan.command, plan.planId)

    const outcome = await agent.undo(PROJECT)

    expect(outcome.removedEntityIds.length).toBe(applied.action.createdEntityIds.length)
    expect(doc.queryEntities.get().length).toBe(before)
  })

  it("refuses to undo the same action twice", async () => {
    const { client } = await fakeBackend({ arranged: true })
    const agent = service(client, dir)
    const plan = await agent.plan(PROJECT, "add a dark 808 under the drop")
    const applied = await agent.apply(PROJECT, plan.command, plan.planId)
    await agent.undo(PROJECT, applied.action.actionId)

    const error = await agent
      .undo(PROJECT, applied.action.actionId)
      .catch((e: unknown) => e)

    expect((error as AgentError).code).toBe("already_undone")
  })

  it("reports a clear error when there is nothing to undo", async () => {
    const { client } = await fakeBackend()
    const agent = service(client, dir)

    const error = await agent.undo(PROJECT).catch((e: unknown) => e)

    expect((error as AgentError).code).toBe("no_actions")
  })

  it("reports a clear error for an unknown action id", async () => {
    const { client } = await fakeBackend()
    const agent = service(client, dir)

    const error = await agent.undo(PROJECT, "nope").catch((e: unknown) => e)

    expect((error as AgentError).code).toBe("action_not_found")
  })
})

describe("getAction", () => {
  it("returns a recorded action by id", async () => {
    const { client } = await fakeBackend({ arranged: true })
    const agent = service(client, dir)
    const plan = await agent.plan(PROJECT, "add a dark 808 under the drop")
    const applied = await agent.apply(PROJECT, plan.command, plan.planId)

    const record = await agent.getAction(applied.action.actionId)

    expect(record?.actionId).toBe(applied.action.actionId)
  })

  it("returns undefined rather than throwing for an unknown id", async () => {
    const { client } = await fakeBackend()
    const agent = service(client, dir)

    expect(await agent.getAction("nope")).toBeUndefined()
  })
})

describe("AgentError", () => {
  it("carries a machine-readable code and an HTTP status the UI can act on", () => {
    const error = new AgentError("plan_id_required", "needs a plan id", 409)

    expect(error.code).toBe("plan_id_required")
    expect(error.status).toBe(409)
    expect(error).toBeInstanceOf(Error)
  })

  it("serializes to JSON without leaking a stack trace", () => {
    const json = new AgentError("no_actions", "nothing to undo", 404).toJSON()

    expect(json).toEqual({ error: { code: "no_actions", message: "nothing to undo" } })
    expect(JSON.stringify(json)).not.toMatch(/at .*service/)
  })
})
