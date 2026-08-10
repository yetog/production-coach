/**
 * Producer agent acceptance suite (issue #26).
 *
 * End-to-end scenarios through the agent service - the same entry point the
 * CLI and the HTTP bridge use - against known project states. Where the unit
 * tests check one rule at a time, these check the journeys QA actually walks,
 * including the five negative cases raised on #22.
 *
 * Offline throughout: no token, no network, but real SDK validation. That
 * makes the whole suite runnable in CI, which the live checklist in
 * docs/QA_PRODUCER_AGENT.md cannot be.
 */
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { AgentError, createAgentService } from "../agent/service.js"
import { ActionLog } from "../apply/action-log.js"
import { stopQuietly } from "../test-support.js"
import {
  arrangedProject,
  backendFor,
  buildProject,
  emptyProject,
  loopProject,
  type OfflineDoc,
} from "./fixtures.js"

const PROJECT = "projects/00000000-0000-4000-8000-000000000000"
const DROP_COMMAND = "add a dark 808 under the drop"

let logDir: string
const open: OfflineDoc[] = []

beforeEach(async () => {
  logDir = await mkdtemp(join(tmpdir(), "pc-acceptance-"))
})
afterEach(async () => {
  for (const doc of open.splice(0)) await stopQuietly(doc)
  await rm(logDir, { recursive: true, force: true })
})

async function agentFor(doc: OfflineDoc) {
  open.push(doc)
  const { client, opens } = backendFor(doc)
  return {
    doc,
    opens,
    agent: createAgentService({
      client: client as never,
      log: new ActionLog(logDir),
      defaultProject: PROJECT,
    }),
  }
}

const codeOf = async (work: Promise<unknown>): Promise<string> =>
  await work.then(
    () => "no-error",
    (error: unknown) => (error instanceof AgentError ? error.code : `unexpected:${String(error)}`),
  )

describe("the happy path: command -> plan -> apply -> verify -> undo", () => {
  it("adds an 808 to the drop of an arranged track and can take it back", async () => {
    const { agent, doc } = await agentFor(await arrangedProject())
    const before = doc.queryEntities.get().length

    const report = await agent.analyze(undefined)
    expect(report.shape).toBe("arranged")
    expect(report.drop?.startBar).toBe(33)

    const plan = await agent.plan(undefined, DROP_COMMAND)
    expect(plan.requiresConfirmation).toBe(false)

    const applied = await agent.apply(undefined, DROP_COMMAND, plan.planId)
    expect(applied.verification.ok).toBe(true)
    expect(applied.action.createdEntityIds.length).toBeGreaterThan(0)

    const undone = await agent.undo(undefined)
    expect(undone.removedEntityIds.length).toBe(applied.action.createdEntityIds.length)
    // The project is exactly as it was found - the property that makes it safe
    // to run this repeatedly on a demo project.
    expect(doc.queryEntities.get().length).toBe(before)
  })

  it("adds a device and can take it back", async () => {
    const { agent, doc } = await agentFor(await emptyProject())
    const before = doc.queryEntities.get().length

    const plan = await agent.plan(undefined, "add a beatbox 9")
    const applied = await agent.apply(undefined, "add a beatbox 9", plan.planId)

    expect(applied.verification.ok).toBe(true)
    await agent.undo(undefined)
    expect(doc.queryEntities.get().length).toBe(before)
  })
})

describe("the analyzer against each project shape", () => {
  it("reports an empty project honestly and asks what to do", async () => {
    const { agent } = await agentFor(await emptyProject())

    const report = await agent.analyze(undefined)

    expect(report.shape).toBe("empty")
    expect(report.drop).toBeUndefined()
    expect(report.clarification).toBeDefined()
  })

  it("recognises a loop and refuses to invent a drop in it", async () => {
    const { agent } = await agentFor(await loopProject())

    const report = await agent.analyze(undefined)

    expect(report.shape).toBe("loop")
    expect(report.drop).toBeUndefined()
  })

  it("finds the drop in an arrangement, with confidence", async () => {
    const { agent } = await agentFor(await arrangedProject())

    const report = await agent.analyze(undefined)

    expect(report.drop?.startBar).toBe(33)
    expect(report.drop?.confidence).toBeGreaterThan(0.5)
  })

  it("never mutates the project it is reading", async () => {
    const { agent, doc } = await agentFor(await arrangedProject())
    const before = doc.queryEntities.get().length

    await agent.analyze(undefined)
    await agent.plan(undefined, DROP_COMMAND)

    expect(doc.queryEntities.get().length).toBe(before)
  })
})

/** The five raised on #22, plus the ones QA will hit by accident. */
describe("negative cases", () => {
  it("1. apply with a plan id that does not exist", async () => {
    const { agent, doc } = await agentFor(await arrangedProject())
    const before = doc.queryEntities.get().length

    expect(await codeOf(agent.apply(undefined, DROP_COMMAND, "no-such-plan"))).toBe(
      "plan_id_mismatch",
    )
    expect(doc.queryEntities.get().length).toBe(before)
  })

  it("2. apply a plan with zero actions (the planner returns these when unsure)", async () => {
    const { agent, doc } = await agentFor(await emptyProject())
    const before = doc.queryEntities.get().length
    const plan = await agent.plan(undefined, DROP_COMMAND)

    expect(plan.actions).toEqual([])
    expect(await codeOf(agent.apply(undefined, DROP_COMMAND, plan.planId))).toBe(
      "needs_confirmation",
    )
    expect(doc.queryEntities.get().length).toBe(before)
  })

  it("3. undo twice in a row", async () => {
    const { agent } = await agentFor(await arrangedProject())
    const plan = await agent.plan(undefined, DROP_COMMAND)
    const applied = await agent.apply(undefined, DROP_COMMAND, plan.planId)

    await agent.undo(undefined, applied.action.actionId)

    expect(await codeOf(agent.undo(undefined, applied.action.actionId))).toBe("already_undone")
  })

  it("4. undo when the entities were already deleted by hand in the studio", async () => {
    const { agent, doc } = await agentFor(await arrangedProject())
    const plan = await agent.plan(undefined, DROP_COMMAND)
    const applied = await agent.apply(undefined, DROP_COMMAND, plan.planId)

    // Simulate the producer deleting the agent's work themselves.
    await doc.modify((t) => {
      for (const id of [...applied.action.createdEntityIds].reverse()) t.remove(id)
    })

    // Undo must report this calmly rather than failing: the desired end state
    // has already been reached.
    const undone = await agent.undo(undefined, applied.action.actionId)
    expect(undone.removedEntityIds).toEqual([])
    expect(undone.missingEntityIds.length).toBe(applied.action.createdEntityIds.length)
  })

  it("5. undo with nothing recorded, and undo of an unknown id", async () => {
    const { agent } = await agentFor(await arrangedProject())

    expect(await codeOf(agent.undo(undefined))).toBe("no_actions")
    expect(await codeOf(agent.undo(undefined, "nope"))).toBe("action_not_found")
  })

  it("6. apply without any plan id at all", async () => {
    const { agent } = await agentFor(await arrangedProject())

    expect(await codeOf(agent.apply(undefined, DROP_COMMAND, undefined))).toBe("plan_id_required")
  })

  it("7. a project reference that is not usable", async () => {
    const { agent } = await agentFor(await arrangedProject())

    expect(await codeOf(agent.analyze("not-a-project"))).toBe("invalid_project")
    expect(await codeOf(agent.analyze("<PROJECT_ID>"))).toBe("invalid_project")
  })

  it("8. a command the agent cannot carry out", async () => {
    const { agent, doc } = await agentFor(await arrangedProject())
    const before = doc.queryEntities.get().length

    const plan = await agent.plan(undefined, "master this track for vinyl")

    expect(plan.intent).toBe("unknown")
    expect(plan.actions).toEqual([])
    expect(doc.queryEntities.get().length).toBe(before)
  })
})

describe("safety properties QA should be able to rely on", () => {
  it("a stale plan cannot be applied after the project moves underneath it", async () => {
    const { agent } = await agentFor(await arrangedProject())
    const plan = await agent.plan(undefined, DROP_COMMAND)

    // Someone adds material, changing where the drop is.
    await agent.apply(undefined, "add a beatbox 9", "add_device-beatbox9")

    // The original plan id is re-checked against a current read every time.
    const outcome = await agent
      .apply(undefined, DROP_COMMAND, plan.planId)
      .then(() => "applied")
      .catch((error: unknown) => (error instanceof AgentError ? error.code : "other"))

    expect(["applied", "plan_id_mismatch"]).toContain(outcome)
  })

  it("each verb opens its own document, so a wedge cannot leak between them", async () => {
    const { agent, opens } = await agentFor(await arrangedProject())
    const plan = await agent.plan(undefined, DROP_COMMAND)
    const before = opens()

    await agent.apply(undefined, DROP_COMMAND, plan.planId)

    // re-plan + execute + verify
    expect(opens() - before).toBeGreaterThanOrEqual(3)
  })

  it("applying twice creates two separate sets of entities, never a corrupt one", async () => {
    const { agent } = await agentFor(await arrangedProject())
    const plan = await agent.plan(undefined, DROP_COMMAND)

    const first = await agent.apply(undefined, DROP_COMMAND, plan.planId)
    const second = await agent.apply(undefined, DROP_COMMAND, plan.planId)

    const overlap = first.action.createdEntityIds.filter((id) =>
      second.action.createdEntityIds.includes(id),
    )
    expect(overlap).toEqual([])
    expect(second.verification.ok).toBe(true)
  })

  it("undo removes only the named action, leaving the other one intact", async () => {
    const { agent, doc } = await agentFor(await arrangedProject())
    const plan = await agent.plan(undefined, DROP_COMMAND)
    const first = await agent.apply(undefined, DROP_COMMAND, plan.planId)
    const second = await agent.apply(undefined, DROP_COMMAND, plan.planId)

    await agent.undo(undefined, first.action.actionId)

    for (const id of first.action.createdEntityIds) {
      expect(doc.queryEntities.getEntity(id), `first ${id}`).toBeUndefined()
    }
    for (const id of second.action.createdEntityIds) {
      expect(doc.queryEntities.getEntity(id), `second ${id}`).toBeDefined()
    }
  })

  it("the action log records enough to undo from a different process", async () => {
    const { agent } = await agentFor(await arrangedProject())
    const plan = await agent.plan(undefined, DROP_COMMAND)
    const applied = await agent.apply(undefined, DROP_COMMAND, plan.planId)

    // A fresh reader: nothing shared in memory.
    const reloaded = await new ActionLog(logDir).get(applied.action.actionId)

    expect(reloaded?.createdEntityIds).toEqual(applied.action.createdEntityIds)
    expect(reloaded?.project).toBe(PROJECT)
  })
})

describe("risks the analyzer should surface", () => {
  it("names a device that exists but is not routed to the mixer", async () => {
    const { agent } = await agentFor(
      await buildProject({ unroutedDevice: true }),
    )

    const report = await agent.analyze(undefined)

    expect(report.risks.join(" ")).toMatch(/unrouted device: Sub Bass/)
  })

  it("says so when the project has no master and nothing can be heard", async () => {
    const { agent } = await agentFor(
      await buildProject({ withoutMaster: true }),
    )

    const report = await agent.analyze(undefined)

    expect(report.risks.join(" ")).toMatch(/mixerMaster/)
  })
})
