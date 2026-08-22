/**
 * The favicon is Dr. Zay - the same art the extension icons use. index.html
 * is not part of any component test, so pin the tag and the shipped files
 * here: a dangling href would 404 silently and fall back to the default globe.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(__dirname, "..")
const html = readFileSync(join(root, "index.html"), "utf8")

const isPng = (path: string) =>
  readFileSync(join(root, "public", path)).subarray(0, 4).toString("hex") === "89504e47"

describe("favicon", () => {
  it("links the Dr. Zay png favicon", () => {
    expect(html).toMatch(/<link rel="icon" type="image\/png" href="\/favicon\.png"/)
  })

  it("links an apple touch icon for home-screen saves", () => {
    expect(html).toMatch(/<link rel="apple-touch-icon" href="\/apple-touch-icon\.png"/)
  })

  it("ships both files as real PNGs", () => {
    expect(isPng("favicon.png")).toBe(true)
    expect(isPng("apple-touch-icon.png")).toBe(true)
  })
})
