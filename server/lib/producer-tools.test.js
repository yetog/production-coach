import { describe, expect, it, vi } from "vitest"
import { createProducerTools, toolDefinitions } from "./producer-tools.js"

function fakeAgent() {
  return {
    analyze: vi.fn().mockResolvedValue({
      tempoBpm: 128,
      signature: "4/4",
      lengthBars: 64,
      shape: "arranged",
      inventory: { drums: 1 },
      sections: [{ label: "drop", startBar: 33, endBar: 48, confidence: 0.9, density: 4 }],
      drop: { label: "drop", startBar: 33, endBar: 48, confidence: 0.9 },
      risks: [],
    }),
    plan: vi.fn().mockResolvedValue({
      planId: "add_808-33-48",
      command: "add a dark 808 at bar 33",
      intent: "add_808",
      interpretedIntent: "Add a dark 808 bassline under bars 33-48",
      target: { startBar: 33, endBar: 48, confidence: 1 },
      actions: [],
      summary: "I will add a dark 808.",
      safety: "creates_only",
      verification: [],
      requiresConfirmation: false,
    }),
    apply: vi.fn().mockResolvedValue({
      action: { actionId: "a1", createdEntityIds: [], timestamp: "now" },
      verification: { ok: true, checked: 1, failures: [] },
      plan: { planId: "add_808-33-48" },
      summary: "Created the 808.",
    }),
    undo: vi.fn().mockResolvedValue({ actionId: "a1", removedEntityIds: [], missingEntityIds: [], summary: "Undone." }),
    getAction: vi.fn(),
  }
}

describe("producer tool contract", () => {
  it("exposes read, plan, apply, and undo tools with stable schemas", () => {
    expect(Object.keys(toolDefinitions)).toEqual([
      "analyze_session",
      "plan_change",
      "apply_plan",
      "undo_last_change",
    ])
    expect(toolDefinitions.plan_change.inputSchema).toBeDefined()
    expect(toolDefinitions.apply_plan.inputSchema).toBeDefined()
  })

  it("routes analysis and planning through the agent service", async () => {
    const agent = fakeAgent()
    const tools = createProducerTools({ agent, project: "projects/p1" })

    expect(await tools.analyze_session.execute({})).toMatchObject({ tempoBpm: 128 })
    expect(await tools.plan_change.execute({ command: "add a dark 808 at bar 33" })).toMatchObject({
      planId: "add_808-33-48",
    })
    expect(agent.analyze).toHaveBeenCalledWith("projects/p1")
    expect(agent.plan).toHaveBeenCalledWith("projects/p1", "add a dark 808 at bar 33")
  })

  it("refuses apply unless the server-side approval flag is present", async () => {
    const agent = fakeAgent()
    const tools = createProducerTools({ agent, project: "projects/p1", approveApply: () => false })

    await expect(tools.apply_plan.execute({
      command: "add a dark 808 at bar 33",
      planId: "add_808-33-48",
    })).rejects.toMatchObject({ code: "approval_required" })
    expect(agent.apply).not.toHaveBeenCalled()
  })

  it("applies only with explicit approval and preserves the plan id", async () => {
    const agent = fakeAgent()
    const tools = createProducerTools({ agent, project: "projects/p1", approveApply: () => true })

    const result = await tools.apply_plan.execute({
      command: "add a dark 808 at bar 33",
      planId: "add_808-33-48",
    })

    expect(result).toMatchObject({ verification: { ok: true } })
    expect(agent.apply).toHaveBeenCalledWith("projects/p1", "add a dark 808 at bar 33", "add_808-33-48")
  })

  it("routes undo to the shared action log", async () => {
    const agent = fakeAgent()
    const tools = createProducerTools({ agent, project: "projects/p1", approveApply: () => true })

    await tools.undo_last_change.execute({ actionId: "a1" })

    expect(agent.undo).toHaveBeenCalledWith("projects/p1", "a1")
  })

  it("refuses undo unless the server-side approval callback allows it", async () => {
    const agent = fakeAgent()
    const tools = createProducerTools({ agent, project: "projects/p1", approveApply: () => false })

    await expect(tools.undo_last_change.execute({ actionId: "a1" })).rejects.toMatchObject({
      code: "approval_required",
    })
    expect(agent.undo).not.toHaveBeenCalled()
  })
})
