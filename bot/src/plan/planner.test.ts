/**
 * Producer planner (issue #20).
 *
 * The plan is a contract between three consumers: the frontend renders it
 * (#23/#24), `apply` replays it (#18), and `verify` checks against it (#22).
 * So the tests care as much about the shape and its stability as about the
 * musical decision.
 *
 * Deterministic for the MVP commands - no LLM anywhere on this path.
 */
import { describe, expect, it } from "vitest"
import type { SessionReport } from "../analyze/analyzer.js"
import { planCommand } from "./planner.js"

function report(overrides: Partial<SessionReport> = {}): SessionReport {
  return {
    tempoBpm: 128,
    signature: "4/4",
    lengthBars: 64,
    shape: "arranged",
    inventory: {
      drums: 1,
      bass: 0,
      synths: 2,
      effects: 0,
      sequencers: 0,
      mixers: 1,
      routing: 0,
      other: 0,
    },
    sections: [],
    drop: { label: "drop", startBar: 33, endBar: 48, confidence: 0.81, density: 6 },
    risks: [],
    ...overrides,
  }
}

describe("planCommand - the flagship command", () => {
  it('turns "add a dark 808 under the drop" into an add_808 plan at the drop', () => {
    const plan = planCommand("add a dark 808 under the drop", report())

    expect(plan.intent).toBe("add_808")
    expect(plan.target.startBar).toBe(33)
    expect(plan.target.endBar).toBe(48)
    expect(plan.target.section).toBe("drop")
    expect(plan.requiresConfirmation).toBe(false)
  })

  it("orders the low-level actions so routing exists before notes are placed", () => {
    const plan = planCommand("add a dark 808 under the drop", report())
    const types = plan.actions.map((a) => a.type)

    expect(types).toContain("create_source")
    expect(types).toContain("route_to_mixer")
    expect(types).toContain("create_note_region")
    expect(types.indexOf("create_source")).toBeLessThan(types.indexOf("route_to_mixer"))
    expect(types.indexOf("create_note_track")).toBeLessThan(
      types.indexOf("create_note_region"),
    )
  })

  it("carries a user-facing summary that names the bars", () => {
    const plan = planCommand("add a dark 808 under the drop", report())

    expect(plan.summary).toMatch(/33/)
    expect(plan.summary).toMatch(/48/)
    expect(plan.summary.toLowerCase()).toContain("808")
  })

  it('reads "dark" as a tone hint rather than ignoring it', () => {
    const dark = planCommand("add a dark 808 under the drop", report())
    const plain = planCommand("add an 808 under the drop", report())

    expect(dark.interpretedIntent).toMatch(/dark/i)
    expect(dark.actions).not.toEqual(plain.actions)
  })
})

describe("planCommand - explicit bars beat section detection", () => {
  it('uses the stated bar for "put the 808 at bar 33"', () => {
    const plan = planCommand("put the 808 at bar 33", report({ drop: undefined }))

    expect(plan.intent).toBe("add_808")
    expect(plan.target.startBar).toBe(33)
    expect(plan.target.confidence).toBe(1)
    expect(plan.requiresConfirmation).toBe(false)
  })

  it("prefers an explicit bar even when a drop was detected elsewhere", () => {
    const plan = planCommand("put the 808 at bar 9", report())

    expect(plan.target.startBar).toBe(9)
    expect(plan.target.section).toBeUndefined()
  })

  it("rejects a bar beyond the end of the project instead of writing off the timeline", () => {
    const plan = planCommand("put the 808 at bar 900", report())

    expect(plan.requiresConfirmation).toBe(true)
    expect(plan.clarification).toMatch(/64|beyond|length/i)
  })
})

describe("planCommand - asking rather than guessing", () => {
  it("asks for confirmation when the analyzer had low confidence", () => {
    const plan = planCommand(
      "add an 808 under the drop",
      report({
        drop: { label: "drop", startBar: 17, endBar: 32, confidence: 0.2, density: 2 },
      }),
    )

    expect(plan.requiresConfirmation).toBe(true)
    expect(plan.clarification).toBeDefined()
  })

  it("asks when there is no drop at all", () => {
    const plan = planCommand("add an 808 under the drop", report({ drop: undefined, shape: "loop" }))

    expect(plan.requiresConfirmation).toBe(true)
    expect(plan.actions).toEqual([])
  })

  it("returns an unknown intent rather than pretending, for a command it cannot do", () => {
    const plan = planCommand("master this track for vinyl", report())

    expect(plan.intent).toBe("unknown")
    expect(plan.actions).toEqual([])
    expect(plan.requiresConfirmation).toBe(true)
    expect(plan.summary).toMatch(/can't|cannot|don't|do not/i)
  })

  it("previews without acting for a command that has no executor yet", () => {
    const plan = planCommand("make the intro less crowded", report())

    expect(plan.intent).toBe("preview_only")
    expect(plan.actions).toEqual([])
    expect(plan.summary.length).toBeGreaterThan(0)
  })
})

describe("plan contract", () => {
  it("is JSON-serializable and stable across a round trip", () => {
    const plan = planCommand("add a dark 808 under the drop", report())

    expect(JSON.parse(JSON.stringify(plan))).toEqual(plan)
  })

  it("carries every field the frontend and executor need", () => {
    const plan = planCommand("add a dark 808 under the drop", report())

    for (const key of [
      "planId",
      "command",
      "intent",
      "interpretedIntent",
      "target",
      "actions",
      "summary",
      "safety",
      "verification",
      "requiresConfirmation",
    ]) {
      expect(plan, key).toHaveProperty(key)
    }
  })

  it("is deterministic - the same command and session produce the same plan", () => {
    const a = planCommand("add a dark 808 under the drop", report())
    const b = planCommand("add a dark 808 under the drop", report())

    expect(a).toEqual(b)
  })

  it("declares verification checks the executor can act on", () => {
    const plan = planCommand("add a dark 808 under the drop", report())

    expect(plan.verification.length).toBeGreaterThan(0)
    expect(plan.verification.some((v) => v.kind === "entities_exist")).toBe(true)
  })

  it("marks a plan that only creates entities as low risk", () => {
    const plan = planCommand("add a dark 808 under the drop", report())

    expect(plan.safety).toBe("creates_only")
  })
})

describe("planCommand - add a device (issue #28)", () => {
  it('turns "add a beatbox 9" into an applyable add_device plan', () => {
    const plan = planCommand("add a beatbox 9", report())

    expect(plan.intent).toBe("add_device")
    expect(plan.requiresConfirmation).toBe(false)
    expect(plan.actions.map((a) => a.type)).toEqual(["create_source", "route_to_mixer"])
  })

  it("names the device in the summary the way a human wrote it", () => {
    const plan = planCommand("throw a heisenberg on this", report())

    expect(plan.summary).toMatch(/Heisenberg/)
    expect(plan.interpretedIntent).toMatch(/Heisenberg/)
  })

  it("creates no notes, region or track - adding a device is not composing", () => {
    const plan = planCommand("add a machiniste", report())
    const types = plan.actions.map((a) => a.type)

    expect(types).not.toContain("create_notes")
    expect(types).not.toContain("create_note_region")
    expect(types).not.toContain("create_note_track")
  })

  it("routes the device to the mixer, so it is actually audible", () => {
    const plan = planCommand("add a beatbox 8", report())
    const route = plan.actions.find((a) => a.type === "route_to_mixer")

    expect(route).toBeDefined()
  })

  it("still prefers the 808 flow when the command mentions an 808", () => {
    // "808" resolves to a bassline device, but "add an 808 under the drop" is
    // the flagship musical action, not a bare device add.
    const plan = planCommand("add a dark 808 under the drop", report())

    expect(plan.intent).toBe("add_808")
    expect(plan.actions.map((a) => a.type)).toContain("create_notes")
  })

  it("is marked creates_only, since it never touches existing material", () => {
    expect(planCommand("add a gakki", report()).safety).toBe("creates_only")
  })

  it("gives distinct plan ids to different devices", () => {
    expect(planCommand("add a gakki", report()).planId).not.toBe(
      planCommand("add a heisenberg", report()).planId,
    )
  })

  it("is deterministic", () => {
    expect(planCommand("add a beatbox 9", report())).toEqual(
      planCommand("add a beatbox 9", report()),
    )
  })

  it("declares a verification check that the device reached the mixer", () => {
    const plan = planCommand("add a beatbox 9", report())

    expect(plan.verification.some((v) => v.kind === "routed_to_mixer")).toBe(true)
  })

  it("still returns unknown for a device that does not exist", () => {
    const plan = planCommand("add a parametricEq", report())

    expect(plan.intent).toBe("unknown")
    expect(plan.actions).toEqual([])
  })

  it("does not fire on advice that merely mentions a device", () => {
    // The coach saying a device name is not an instruction to create one.
    expect(planCommand("your heisenberg patch sounds great", report()).intent).toBe("unknown")
  })
})
