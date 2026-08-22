/**
 * App side of the push-to-talk extension bridge (issue #55).
 *
 * The extension's content script dispatches a window event; the app listens for
 * it and toggles the mic. This pins the event name (the wire contract) and the
 * toggle decision. The DOM listener itself lives in a thin hook.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PTT_EVENT, isExtensionMessage, togglePtt } from "./ptt-bridge"

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

describe("isExtensionMessage", () => {
  const PAYLOAD = { source: "dr-zay-extension", type: "drzay:ptt-toggle" }
  const EXTENSION_ORIGIN = "chrome-extension://abcdefghijklmnopabcdefghijklmnop"

  /** The app only accepts the message when embedded, so tests need a window
   * whose parent is a different object (vitest runs in a node environment). */
  const embedded = { parent: {} } as unknown as Window & typeof globalThis

  beforeEach(() => {
    vi.stubGlobal("window", embedded)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("accepts the toggle payload from an extension page", () => {
    expect(isExtensionMessage(PAYLOAD, EXTENSION_ORIGIN)).toBe(true)
  })

  it("rejects the identical payload from a web origin (spoof)", () => {
    // A malicious site iframing the app can copy the payload but can never
    // forge a chrome-extension:// origin — the browser sets event.origin.
    expect(isExtensionMessage(PAYLOAD, "https://evil.example")).toBe(false)
  })

  it("rejects the payload from the app's own origin", () => {
    expect(isExtensionMessage(PAYLOAD, "https://zaylegend.com")).toBe(false)
  })

  it("rejects a wrong payload even from an extension origin", () => {
    expect(isExtensionMessage({ source: "someone-else", type: "drzay:ptt-toggle" }, EXTENSION_ORIGIN)).toBe(false)
    expect(isExtensionMessage({ source: "dr-zay-extension", type: "other" }, EXTENSION_ORIGIN)).toBe(false)
    expect(isExtensionMessage(null, EXTENSION_ORIGIN)).toBe(false)
  })

  it("rejects everything when the app is not embedded", () => {
    const top = {} as Window & typeof globalThis
    ;(top as { parent?: unknown }).parent = top
    vi.stubGlobal("window", top)
    expect(isExtensionMessage(PAYLOAD, EXTENSION_ORIGIN)).toBe(false)
  })

  it("rejects a scheme that merely starts with the extension scheme string", () => {
    expect(isExtensionMessage(PAYLOAD, "chrome-extension.example.com")).toBe(false)
  })
})
