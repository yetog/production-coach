/**
 * The wire contract between the extension and the Dr. Zay web app (issue #55).
 *
 * `chrome.commands` cannot bind a bare "Y" and only fires on keydown, so the
 * extension speaks in a single "toggle" verb: each command press flips the mic.
 * The background worker turns a command into a runtime message; the content
 * script turns that message into a window event the app listens for.
 */
import { describe, expect, it } from "vitest"
import { COMMAND, PTT_EVENT, isToggleMessage, messageForCommand } from "./protocol.js"

describe("protocol constants", () => {
  it("uses the agreed command and event names", () => {
    // These strings are the contract; the manifest, the content script and the
    // app all pin the same literals. A drift test cross-checks them.
    expect(COMMAND).toBe("toggle-ptt")
    expect(PTT_EVENT).toBe("drzay:ptt-toggle")
  })
})

describe("messageForCommand", () => {
  it("produces a toggle message for the talk command", () => {
    expect(messageForCommand(COMMAND)).toEqual({ type: PTT_EVENT })
  })

  it("ignores any other command name", () => {
    for (const cmd of ["", "other", undefined, null, "toggle", "ptt"]) {
      expect(messageForCommand(cmd), String(cmd)).toBeNull()
    }
  })
})

describe("isToggleMessage", () => {
  it("accepts only a well-formed toggle message", () => {
    expect(isToggleMessage({ type: PTT_EVENT })).toBe(true)
  })

  it("rejects anything else without throwing", () => {
    for (const msg of [null, undefined, {}, { type: "nope" }, "string", 42]) {
      expect(isToggleMessage(msg), String(msg)).toBe(false)
    }
  })
})
