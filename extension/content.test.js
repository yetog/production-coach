/**
 * The content script (issue #55) runs in the Dr. Zay page and turns the
 * background worker's toggle message into a window event the app listens for.
 *
 * It is a classic MV3 content script (no ES imports), so it is tested by
 * executing its actual source with a fake `chrome`, `window` and `CustomEvent`
 * — this also guarantees the file itself wires up, not a re-implementation.
 */
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { PTT_EVENT } from "./lib/protocol.js"

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, "content.js"), "utf8")

function loadContentScript() {
  let onMessage = null
  const chrome = { runtime: { onMessage: { addListener: (cb) => { onMessage = cb } } } }
  const dispatched = []
  const win = { dispatchEvent: (event) => dispatched.push(event) }
  class CustomEvent {
    constructor(type, init) {
      this.type = type
      this.detail = init && init.detail
    }
  }
  // eslint-disable-next-line no-new-func
  new Function("chrome", "window", "CustomEvent", source)(chrome, win, CustomEvent)
  if (typeof onMessage !== "function") throw new Error("content.js did not register a message listener")
  return { fire: (msg) => onMessage(msg), dispatched }
}

describe("content script", () => {
  it("dispatches the app window event when a toggle message arrives", () => {
    const { fire, dispatched } = loadContentScript()

    fire({ type: PTT_EVENT })

    expect(dispatched).toHaveLength(1)
    expect(dispatched[0].type).toBe(PTT_EVENT)
  })

  it("ignores messages that are not the toggle", () => {
    const { fire, dispatched } = loadContentScript()

    for (const msg of [null, undefined, {}, { type: "other" }, "x", 7]) {
      fire(msg)
    }

    expect(dispatched).toHaveLength(0)
  })
})
