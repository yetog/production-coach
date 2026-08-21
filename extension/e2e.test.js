/**
 * End-to-end wiring of the extension, headless (issue #55).
 *
 * The isolated tests prove each hop; this proves they connect. It runs the real
 * background-core and the real content.js together — the background worker's
 * sendMessage is piped straight into the content script's onMessage — and
 * asserts a single command press reaches the page as one toggle event.
 */
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { PTT_EVENT } from "./lib/protocol.js"
import { togglePtt } from "../src/lib/ptt-bridge.ts"
import { registerCommandHandler } from "./lib/background-core.js"

const here = dirname(fileURLToPath(import.meta.url))
const contentSource = readFileSync(join(here, "content.js"), "utf8")

function loadContentScript(win) {
  let onMessage = null
  const chrome = { runtime: { onMessage: { addListener: (cb) => { onMessage = cb } } } }
  class CustomEvent {
    constructor(type) { this.type = type }
  }
  // eslint-disable-next-line no-new-func
  new Function("chrome", "window", "CustomEvent", contentSource)(chrome, win, CustomEvent)
  return (message) => onMessage(message)
}

describe("command -> message -> page event, end to end", () => {
  it("turns one Ctrl+Shift+Y command into one page toggle event", () => {
    const dispatched = []
    const win = { dispatchEvent: (event) => dispatched.push(event) }
    const deliverToPage = loadContentScript(win)

    let onCommand = null
    const bgChrome = {
      commands: { onCommand: { addListener: (cb) => { onCommand = cb } } },
      tabs: {
        query: (_info, cb) => cb([{ id: 1 }]),
        // The worker sends to the tab; the content script receives it.
        sendMessage: (_tabId, message) => deliverToPage(message),
      },
    }
    registerCommandHandler(bgChrome)

    onCommand("toggle-ptt")

    expect(dispatched).toHaveLength(1)
    expect(dispatched[0].type).toBe(PTT_EVENT)

    // And the app would act on it: first press starts, next press stops.
    expect(togglePtt(false)).toBe("start")
    expect(togglePtt(true)).toBe("stop")
  })

  it("an unrelated command produces no page event", () => {
    const dispatched = []
    const win = { dispatchEvent: (event) => dispatched.push(event) }
    const deliverToPage = loadContentScript(win)

    let onCommand = null
    const bgChrome = {
      commands: { onCommand: { addListener: (cb) => { onCommand = cb } } },
      tabs: { query: (_info, cb) => cb([{ id: 1 }]), sendMessage: (_id, m) => deliverToPage(m) },
    }
    registerCommandHandler(bgChrome)

    onCommand("_not-ours")

    expect(dispatched).toHaveLength(0)
  })
})
