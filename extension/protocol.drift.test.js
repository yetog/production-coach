/**
 * The event name is duplicated across three files that can't share an import:
 *  - extension/lib/protocol.js  (ES module, background + tests)
 *  - extension/content.js       (classic content script, inlined)
 *  - src/lib/ptt-bridge.ts      (the app, a separate bundle)
 *
 * If any copy drifts, the extension silently stops toggling the mic — the exact
 * kind of break that passes every isolated test. This ties them together.
 */
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { PTT_EVENT } from "./lib/protocol.js"

const here = dirname(fileURLToPath(import.meta.url))
const read = (rel) => readFileSync(join(here, rel), "utf8")

describe("PTT_EVENT stays in sync across the un-shareable copies", () => {
  it("content.js inlines the same literal protocol.js exports", () => {
    expect(read("content.js")).toContain(`"${PTT_EVENT}"`)
  })

  it("the app's ptt-bridge pins the same literal", () => {
    expect(read("../src/lib/ptt-bridge.ts")).toContain(`"${PTT_EVENT}"`)
  })
})
