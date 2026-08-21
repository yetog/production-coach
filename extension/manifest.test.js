/**
 * The manifest is the part a browser reads, so its shape is worth pinning
 * (issue #55). These checks encode the constraints that actually bite:
 *  - MV3, with a module service worker (so background.js can import).
 *  - The command exists and is a MODIFIER chord — chrome.commands rejects a
 *    bare "Y", the whole reason this issue needs a rethink.
 *  - The tab-matching in the manifest lines up with APP_URL_PATTERNS, or the
 *    worker would message tabs the content script was never injected into.
 */
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { COMMAND } from "./lib/protocol.js"
import { APP_URL_PATTERNS } from "./lib/background-core.js"

const here = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(readFileSync(join(here, "manifest.json"), "utf8"))

describe("manifest.json", () => {
  it("is a Manifest V3 extension with a name and version", () => {
    expect(manifest.manifest_version).toBe(3)
    expect(typeof manifest.name).toBe("string")
    expect(manifest.name.length).toBeGreaterThan(0)
    expect(typeof manifest.version).toBe("string")
  })

  it("registers the background worker as a module pointing at background.js", () => {
    expect(manifest.background.service_worker).toBe("background.js")
    expect(manifest.background.type).toBe("module")
  })

  it("binds our command to a MODIFIER chord including Y (never a bare key)", () => {
    const command = manifest.commands[COMMAND]
    expect(command, `command ${COMMAND} must exist`).toBeTruthy()
    const key = command.suggested_key.default
    expect(key).toMatch(/Y$/)
    // A bare key has no "+"; chrome.commands requires Ctrl/Command/Alt + (Shift).
    expect(key).toContain("+")
    expect(key).toMatch(/Ctrl|Command|MacCtrl|Alt/)
  })

  it("injects the content script on the app's origins", () => {
    const cs = manifest.content_scripts[0]
    expect(cs.js).toContain("content.js")
    for (const pattern of APP_URL_PATTERNS) {
      expect(cs.matches, `content_scripts must match ${pattern}`).toContain(pattern)
    }
  })

  it("holds host permissions matching every app origin it messages", () => {
    for (const pattern of APP_URL_PATTERNS) {
      expect(manifest.host_permissions, pattern).toContain(pattern)
    }
  })
})
