/**
 * API base resolution (issue #41).
 *
 * The bug this prevents: the API path was hardcoded as '/production-coach/api'
 * while Vite's `base` was '/production-coach/' and the dev proxy matched
 * '/api'. Three places encoding the same deployment path, and they drifted -
 * so in dev nothing ever reached the server.
 *
 * Deriving the path from BASE_URL means it cannot drift from `base` again.
 */
import { describe, expect, it } from "vitest"
import { API_PATH_SUFFIX, resolveApiBase } from "./api-base.js"

describe("resolveApiBase", () => {
  it("derives the api path from the app's base url", () => {
    expect(resolveApiBase("/production-coach/")).toBe("/production-coach/api")
  })

  it("follows base automatically if the deploy path changes", () => {
    expect(resolveApiBase("/coach/")).toBe("/coach/api")
    expect(resolveApiBase("/a/b/c/")).toBe("/a/b/c/api")
  })

  it("handles a root deployment without doubling the slash", () => {
    expect(resolveApiBase("/")).toBe("/api")
  })

  it("tolerates a base with no trailing slash", () => {
    expect(resolveApiBase("/production-coach")).toBe("/production-coach/api")
  })

  it("falls back to root when base is empty or missing", () => {
    expect(resolveApiBase("")).toBe("/api")
    expect(resolveApiBase(undefined)).toBe("/api")
  })

  it("lets an explicit override win, for pointing at a deployed API", () => {
    expect(resolveApiBase("/production-coach/", "https://api.example.com")).toBe(
      "https://api.example.com",
    )
  })

  it("ignores an override that is empty or whitespace", () => {
    expect(resolveApiBase("/production-coach/", "")).toBe("/production-coach/api")
    expect(resolveApiBase("/production-coach/", "   ")).toBe("/production-coach/api")
  })

  it("strips a trailing slash from an override so paths do not double up", () => {
    expect(resolveApiBase("/", "https://api.example.com/")).toBe("https://api.example.com")
  })

  it("never produces a doubled slash before the api segment", () => {
    for (const base of ["/", "//", "/x/", "/x//"]) {
      expect(resolveApiBase(base), base).not.toMatch(/\/\/api$/)
    }
  })
})

describe("the dev proxy and the app must agree", () => {
  it("exposes the suffix the vite config builds its proxy rule from", () => {
    // vite.config.ts imports API_PATH_SUFFIX to construct `${base}${suffix}`.
    // Sharing the constant is what stops the two drifting apart again.
    expect(API_PATH_SUFFIX).toBe("api")
  })

  it("produces a path that starts with base, which is what the proxy keys on", () => {
    const base = "/production-coach/"
    expect(resolveApiBase(base).startsWith(base)).toBe(true)
  })
})
