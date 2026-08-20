/**
 * How a CoachAction becomes an apply route (issue #53).
 *
 * The chat can now suggest two kinds of move: a device add (#40) and an 808 /
 * musical move that carries a ready-to-run producer command. Both surface as an
 * "Add it" button; this decides which pipeline the button drives.
 */
import { describe, expect, it } from "vitest"
import type { CoachAction } from "@/types"
import { resolveActionRoute } from "./coach-action"

describe("resolveActionRoute", () => {
  it("routes a command-bearing action through the command pipeline", () => {
    const action: CoachAction = {
      type: "create_notes",
      label: "Add a dark 808",
      description: "Add a dark 808 under the drop",
      params: { command: "add a dark 808 under the drop" },
    }

    expect(resolveActionRoute(action)).toEqual({
      kind: "command",
      command: "add a dark 808 under the drop",
    })
  })

  it("routes a device action through addDevice", () => {
    const action: CoachAction = {
      type: "add_device",
      label: "Add Beatbox 9",
      description: "Add Beatbox 9 to your session",
      params: { deviceType: "beatbox9", displayName: "Beatbox 9" },
    }

    expect(resolveActionRoute(action)).toEqual({
      kind: "device",
      deviceType: "beatbox9",
      displayName: "Beatbox 9",
    })
  })

  it("prefers the command route when both a command and a device are present", () => {
    const action: CoachAction = {
      type: "create_notes",
      label: "Add an 808",
      description: "",
      params: { command: "add an 808 under the drop", deviceType: "bassline" },
    }

    expect(resolveActionRoute(action).kind).toBe("command")
  })

  it("returns 'none' for an action with nothing applyable", () => {
    for (const action of [
      { type: "explain", label: "x", description: "y" } as CoachAction,
      { type: "add_device", label: "x", description: "y", params: {} } as CoachAction,
      { type: "create_notes", label: "x", description: "y", params: { command: "   " } } as CoachAction,
    ]) {
      expect(resolveActionRoute(action).kind).toBe("none")
    }
  })
})
