/**
 * Turn a CoachAction into the pipeline that should apply it (issue #53).
 *
 * The chat suggests two kinds of move, both surfaced as one "Add it" button:
 *  - a device add (#40) -> addDevice(deviceType, displayName)
 *  - an 808 / musical move carrying a producer command -> the command pipeline
 *    (plan -> apply), which is where anything that writes notes belongs.
 *
 * A command always wins over a device: it is the more specific, musical intent,
 * and the server only attaches one when it means it.
 */
import type { CoachAction } from "@/types"

export type ActionRoute =
  | { kind: "command"; command: string }
  | { kind: "device"; deviceType: string; displayName?: string }
  | { kind: "none" }

export function resolveActionRoute(action: CoachAction): ActionRoute {
  const params = action.params ?? {}

  const command = params.command
  if (typeof command === "string" && command.trim() !== "") {
    return { kind: "command", command: command.trim() }
  }

  const deviceType = params.deviceType
  if (action.type === "add_device" && typeof deviceType === "string" && deviceType !== "") {
    const displayName = params.displayName
    return {
      kind: "device",
      deviceType,
      displayName: typeof displayName === "string" ? displayName : undefined,
    }
  }

  return { kind: "none" }
}
