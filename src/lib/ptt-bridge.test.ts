/**
 * App side of the push-to-talk extension bridge (issue #55).
 *
 * The extension's content script dispatches a window event; the app listens for
 * it and toggles the mic. This pins the event name (the wire contract) and the
 * toggle decision. The DOM listener itself lives in a thin hook.
 */
import { describe, expect, it } from "vitest"
import { PTT_EVENT, togglePtt } from "./ptt-bridge"

describe("PTT_EVENT", () => {
  it("matches the extension's wire contract", () => {
    // Same literal the content script dispatches and protocol.js exports.
    // extension/protocol.drift.test.js fails if these ever diverge.
    expect(PTT_EVENT).toBe("drzay:ptt-toggle")
  })
})

describe("togglePtt", () => {
  it("starts when not already listening", () => {
    expect(togglePtt(false)).toBe("start")
  })

  it("stops when already listening", () => {
    expect(togglePtt(true)).toBe("stop")
  })
})
