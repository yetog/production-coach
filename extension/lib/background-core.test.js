/**
 * Background worker logic (issue #55), tested against a fake `chrome`.
 *
 * The worker's whole job: when the global command fires, find the Dr. Zay
 * tab(s) and forward a toggle message. It must keep working while the app tab
 * is unfocused/minimised, which is exactly why this lives in the extension and
 * not the page.
 */
import { describe, expect, it, vi } from "vitest"
import { PTT_EVENT } from "./protocol.js"
import { APP_URL_PATTERNS, registerCommandHandler } from "./background-core.js"

function fakeChrome(tabs) {
  let onCommand = null
  const sendMessage = vi.fn()
  const query = vi.fn((info, cb) => cb(tabs))
  return {
    commands: { onCommand: { addListener: (cb) => { onCommand = cb } } },
    tabs: { query, sendMessage },
    fire: (name) => onCommand(name),
    query,
    sendMessage,
  }
}

describe("registerCommandHandler", () => {
  it("forwards a toggle message to every Dr. Zay tab when the command fires", () => {
    const chrome = fakeChrome([{ id: 11 }, { id: 22 }])
    registerCommandHandler(chrome)

    chrome.fire("toggle-ptt")

    expect(chrome.query).toHaveBeenCalledWith(
      { url: APP_URL_PATTERNS },
      expect.any(Function),
    )
    expect(chrome.sendMessage).toHaveBeenCalledTimes(2)
    expect(chrome.sendMessage).toHaveBeenCalledWith(11, { type: PTT_EVENT })
    expect(chrome.sendMessage).toHaveBeenCalledWith(22, { type: PTT_EVENT })
  })

  it("does nothing for a command that is not ours", () => {
    const chrome = fakeChrome([{ id: 11 }])
    registerCommandHandler(chrome)

    chrome.fire("some-other-command")

    expect(chrome.query).not.toHaveBeenCalled()
    expect(chrome.sendMessage).not.toHaveBeenCalled()
  })

  it("skips tabs that have no id", () => {
    const chrome = fakeChrome([{ id: 11 }, {}, { id: undefined }])
    registerCommandHandler(chrome)

    chrome.fire("toggle-ptt")

    expect(chrome.sendMessage).toHaveBeenCalledTimes(1)
    expect(chrome.sendMessage).toHaveBeenCalledWith(11, { type: PTT_EVENT })
  })

  it("targets the Audiotool tab and app origins", () => {
    // Must line up with the manifest's host_permissions / content_scripts
    // matches — a drift test enforces that alignment.
    expect(APP_URL_PATTERNS).toContain("https://zaylegend.com/*")
    expect(APP_URL_PATTERNS).toContain("https://audiotool.com/*")
    expect(APP_URL_PATTERNS).toContain("https://www.audiotool.com/*")
    expect(APP_URL_PATTERNS.some((p) => p.includes("localhost"))).toBe(true)
  })
})
