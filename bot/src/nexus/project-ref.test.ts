/**
 * Project reference normalization (issue #18).
 *
 * Aryan and Zay will paste whatever the studio address bar gives them, so the
 * runner has to accept every form rather than demanding one. Fixtures use a
 * zeroed UUID: this repo is public and real project ids must not land in it.
 */
import { describe, expect, it } from "vitest"
import { normalizeProjectRef } from "./project-ref.js"

const UUID = "00000000-0000-4000-8000-000000000000"

describe("normalizeProjectRef", () => {
  it("accepts a bare uuid", () => {
    expect(normalizeProjectRef(UUID)).toBe(`projects/${UUID}`)
  })

  it("accepts the canonical projects/<uuid> name unchanged", () => {
    expect(normalizeProjectRef(`projects/${UUID}`)).toBe(`projects/${UUID}`)
  })

  it("accepts a studio URL on any audiotool host", () => {
    // www is what the live studio actually hands you; beta is what the docs show.
    expect(normalizeProjectRef(`https://www.audiotool.com/studio?project=${UUID}`)).toBe(
      `projects/${UUID}`,
    )
    expect(normalizeProjectRef(`https://beta.audiotool.com/studio?project=${UUID}`)).toBe(
      `projects/${UUID}`,
    )
  })

  it("tolerates extra query params and a trailing slash", () => {
    expect(normalizeProjectRef(`https://www.audiotool.com/studio/?project=${UUID}&foo=1`)).toBe(
      `projects/${UUID}`,
    )
  })

  it("trims surrounding whitespace and quotes from copy-paste", () => {
    expect(normalizeProjectRef(`  "${UUID}"  `)).toBe(`projects/${UUID}`)
  })

  it("is case-insensitive about the uuid but normalizes to lower case", () => {
    expect(normalizeProjectRef(UUID.toUpperCase())).toBe(`projects/${UUID}`)
  })

  it("rejects the unedited placeholder from .env.example", () => {
    expect(() => normalizeProjectRef("<PROJECT_ID>")).toThrow(/placeholder/i)
    expect(() =>
      normalizeProjectRef("https://beta.audiotool.com/studio?project=<PROJECT_ID>"),
    ).toThrow(/placeholder/i)
  })

  it("rejects empty or missing input with an actionable message", () => {
    expect(() => normalizeProjectRef("")).toThrow(/AUDIOTOOL_PROJECT_URL/)
    expect(() => normalizeProjectRef(undefined)).toThrow(/AUDIOTOOL_PROJECT_URL/)
    expect(() => normalizeProjectRef("   ")).toThrow(/AUDIOTOOL_PROJECT_URL/)
  })

  it("rejects anything that does not contain a uuid, rather than passing it to the SDK", () => {
    expect(() => normalizeProjectRef("my cool track")).toThrow(/could not find a project id/i)
    expect(() => normalizeProjectRef("https://www.audiotool.com/studio")).toThrow(
      /could not find a project id/i,
    )
  })
})
