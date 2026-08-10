/**
 * Command centre state machine (issue #24).
 *
 * The UI flow the demo contract in #17 describes: type a command, see a plan,
 * confirm, apply, verify, undo. The rules are in this reducer rather than in a
 * component so they can be tested without rendering anything.
 *
 * The rule that matters: you cannot get to `applying` without having seen a
 * plan. That mirrors the agent refusing to apply without a plan id, so the UI
 * cannot offer a button the backend would reject.
 */
import { describe, expect, it } from "vitest"
import type { AgentPlan } from "./agent-client.js"
import { commandCenterReducer, initialCommandState, type CommandState } from "./command-center.js"

function plan(overrides: Partial<AgentPlan> = {}): AgentPlan {
  return {
    planId: "add_808-33-48",
    command: "add a dark 808 under the drop",
    intent: "add_808",
    interpretedIntent: "Add a dark 808 bassline under the drop (bars 33-48)",
    target: { section: "drop", startBar: 33, endBar: 48, confidence: 0.81 },
    actions: [{ type: "create_source" }],
    summary: "I will add a dark 808 …",
    safety: "creates_only",
    requiresConfirmation: false,
    ...overrides,
  }
}

/** Drive the reducer through a list of actions. */
function run(actions: Parameters<typeof commandCenterReducer>[1][]): CommandState {
  return actions.reduce(commandCenterReducer, initialCommandState)
}

describe("planning", () => {
  it("starts idle with nothing to apply", () => {
    expect(initialCommandState.status).toBe("idle")
    expect(initialCommandState.plan).toBeUndefined()
  })

  it("moves to planning and clears any previous error", () => {
    const state = run([
      { type: "failed", message: "old error" },
      { type: "planning", command: "add a dark 808 under the drop" },
    ])

    expect(state.status).toBe("planning")
    expect(state.error).toBeUndefined()
    expect(state.command).toBe("add a dark 808 under the drop")
  })

  it("holds the plan for review once it arrives", () => {
    const state = run([{ type: "planning", command: "x" }, { type: "planned", plan: plan() }])

    expect(state.status).toBe("reviewing")
    expect(state.plan?.planId).toBe("add_808-33-48")
    expect(state.canApply).toBe(true)
  })

  it("will not offer apply for a plan that needs confirmation", () => {
    const state = run([
      { type: "planning", command: "x" },
      {
        type: "planned",
        plan: plan({ requiresConfirmation: true, clarification: "Which bar?", actions: [] }),
      },
    ])

    expect(state.status).toBe("needs_answer")
    expect(state.canApply).toBe(false)
    expect(state.question).toBe("Which bar?")
  })

  it("will not offer apply for a plan with no actions, whatever it claims", () => {
    // Belt and braces: zero actions means there is nothing to apply even if
    // requiresConfirmation were somehow false.
    const state = run([
      { type: "planning", command: "x" },
      { type: "planned", plan: plan({ actions: [] }) },
    ])

    expect(state.canApply).toBe(false)
  })
})

describe("applying", () => {
  it("cannot apply before a plan has been seen", () => {
    const state = commandCenterReducer(initialCommandState, { type: "applying" })

    // The agent refuses an apply without a plan id; the UI must not offer it.
    expect(state.status).toBe("idle")
    expect(state.error).toMatch(/plan/i)
  })

  it("moves to applying from reviewing", () => {
    const state = run([
      { type: "planning", command: "x" },
      { type: "planned", plan: plan() },
      { type: "applying" },
    ])

    expect(state.status).toBe("applying")
  })

  it("records the result and offers undo when verification passes", () => {
    const state = run([
      { type: "planning", command: "x" },
      { type: "planned", plan: plan() },
      { type: "applying" },
      {
        type: "applied",
        outcome: {
          action: { actionId: "a1", createdEntityIds: ["x", "y"], timestamp: "t" },
          verification: { ok: true, checked: 3, failures: [] },
          plan: plan(),
          summary: "Created a bassline …",
        },
      },
    ])

    expect(state.status).toBe("applied")
    expect(state.canUndo).toBe(true)
    expect(state.lastActionId).toBe("a1")
    expect(state.result?.summary).toMatch(/bassline/)
  })

  it("surfaces a failed verification as an error but still allows undo", () => {
    // The entities exist even though a check failed, so undo must stay live -
    // otherwise the user is stuck with content they cannot remove.
    const state = run([
      { type: "planning", command: "x" },
      { type: "planned", plan: plan() },
      { type: "applying" },
      {
        type: "applied",
        outcome: {
          action: { actionId: "a1", createdEntityIds: ["x"], timestamp: "t" },
          verification: { ok: false, checked: 3, failures: ["not routed to the mixer"] },
          plan: plan(),
          summary: "…",
        },
      },
    ])

    expect(state.error).toMatch(/not routed/)
    expect(state.canUndo).toBe(true)
  })
})

describe("undo", () => {
  it("clears the undo affordance once used", () => {
    const state = run([
      { type: "planning", command: "x" },
      { type: "planned", plan: plan() },
      { type: "applying" },
      {
        type: "applied",
        outcome: {
          action: { actionId: "a1", createdEntityIds: ["x"], timestamp: "t" },
          verification: { ok: true, checked: 1, failures: [] },
          plan: plan(),
          summary: "…",
        },
      },
      { type: "undone", summary: "Removed 22 entities" },
    ])

    expect(state.status).toBe("idle")
    expect(state.canUndo).toBe(false)
    expect(state.notice).toMatch(/Removed 22/)
  })

  it("does not offer undo before anything has been applied", () => {
    expect(initialCommandState.canUndo).toBe(false)
  })
})

describe("failure", () => {
  it("returns to a usable state and keeps the message", () => {
    const state = run([
      { type: "planning", command: "x" },
      { type: "failed", message: "The agent is not running." },
    ])

    expect(state.status).toBe("idle")
    expect(state.error).toBe("The agent is not running.")
  })

  it("keeps undo available if the failure came after an apply", () => {
    const state = run([
      { type: "planning", command: "x" },
      { type: "planned", plan: plan() },
      { type: "applying" },
      {
        type: "applied",
        outcome: {
          action: { actionId: "a1", createdEntityIds: ["x"], timestamp: "t" },
          verification: { ok: true, checked: 1, failures: [] },
          plan: plan(),
          summary: "…",
        },
      },
      { type: "failed", message: "later failure" },
    ])

    expect(state.canUndo).toBe(true)
    expect(state.lastActionId).toBe("a1")
  })
})

describe("reset", () => {
  it("clears the plan but remembers what can still be undone", () => {
    const state = run([
      { type: "planning", command: "x" },
      { type: "planned", plan: plan() },
      { type: "applying" },
      {
        type: "applied",
        outcome: {
          action: { actionId: "a1", createdEntityIds: ["x"], timestamp: "t" },
          verification: { ok: true, checked: 1, failures: [] },
          plan: plan(),
          summary: "…",
        },
      },
      { type: "reset" },
    ])

    expect(state.plan).toBeUndefined()
    expect(state.status).toBe("idle")
    expect(state.canUndo).toBe(true)
  })
})
