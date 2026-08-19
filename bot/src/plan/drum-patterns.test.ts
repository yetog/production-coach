import { describe, it, expect } from "vitest"
import {
  DRUM_NOTES,
  PATTERNS,
  getPattern,
  getPatternForGenre,
  parseGenre,
  listPatterns,
  listPatternsByGenre,
} from "./drum-patterns.js"

describe("DRUM_NOTES", () => {
  it("has standard MIDI drum mappings", () => {
    expect(DRUM_NOTES.kick).toBe(36)
    expect(DRUM_NOTES.snare).toBe(38)
    expect(DRUM_NOTES.closedHat).toBe(42)
    expect(DRUM_NOTES.openHat).toBe(46)
    expect(DRUM_NOTES.clap).toBe(39)
  })
})

describe("PATTERNS", () => {
  it("has a trap pattern", () => {
    const trap = PATTERNS.trap
    expect(trap).toBeDefined()
    expect(trap.genre).toBe("trap")
    expect(trap.hits.length).toBeGreaterThan(0)
  })

  it("has a house pattern with four-on-the-floor kick", () => {
    const house = PATTERNS.house
    expect(house).toBeDefined()
    expect(house.genre).toBe("house")
    // Four-on-the-floor: kicks on 0, 4, 8, 12
    const kickHits = house.hits.filter((h) => h.piece === "kick")
    expect(kickHits.map((h) => h.position)).toEqual([0, 4, 8, 12])
  })

  it("has a hip-hop pattern", () => {
    const hiphop = PATTERNS.hipHop
    expect(hiphop).toBeDefined()
    expect(hiphop.genre).toBe("hip-hop")
    // Boom bap has snare on 4 and 12
    const snareHits = hiphop.hits.filter((h) => h.piece === "snare")
    expect(snareHits.map((h) => h.position)).toEqual([4, 12])
  })

  it("has a basic pattern", () => {
    const basic = PATTERNS.basic
    expect(basic).toBeDefined()
    expect(basic.genre).toBe("generic")
  })

  it("all patterns have valid hits", () => {
    for (const [name, pattern] of Object.entries(PATTERNS)) {
      expect(pattern.hits.length, `${name} should have hits`).toBeGreaterThan(0)
      for (const hit of pattern.hits) {
        expect(hit.position, `${name} hit position should be 0-15`).toBeGreaterThanOrEqual(0)
        expect(hit.position, `${name} hit position should be 0-15`).toBeLessThan(16)
        expect(hit.velocity, `${name} hit velocity should be 0-1`).toBeGreaterThan(0)
        expect(hit.velocity, `${name} hit velocity should be 0-1`).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe("getPattern", () => {
  it("returns pattern by exact name", () => {
    expect(getPattern("trap")?.name).toBe("Trap Beat")
    expect(getPattern("house")?.name).toBe("House Beat")
    expect(getPattern("hipHop")?.name).toBe("Hip-Hop Boom Bap")
  })

  it("is case insensitive", () => {
    expect(getPattern("TRAP")?.name).toBe("Trap Beat")
    expect(getPattern("House")?.name).toBe("House Beat")
  })

  it("handles aliases", () => {
    expect(getPattern("boom bap")?.name).toBe("Hip-Hop Boom Bap")
    expect(getPattern("boombap")?.name).toBe("Hip-Hop Boom Bap")
    expect(getPattern("lofi")?.name).toBe("Lo-Fi Chill")
    expect(getPattern("chillhop")?.name).toBe("Lo-Fi Chill")
    expect(getPattern("four on the floor")?.name).toBe("House Beat")
    expect(getPattern("4onthefloor")?.name).toBe("House Beat")
  })

  it("handles genre fallback", () => {
    expect(getPattern("hip-hop")?.genre).toBe("hip-hop")
  })

  it("returns undefined for unknown patterns", () => {
    expect(getPattern("nonexistent")).toBeUndefined()
    expect(getPattern("")).toBeUndefined()
  })
})

describe("getPatternForGenre", () => {
  it("returns default pattern for each genre", () => {
    expect(getPatternForGenre("trap").name).toBe("Trap Beat")
    expect(getPatternForGenre("house").name).toBe("House Beat")
    expect(getPatternForGenre("hip-hop").name).toBe("Hip-Hop Boom Bap")
    expect(getPatternForGenre("rock").name).toBe("Rock Beat")
    expect(getPatternForGenre("generic").name).toBe("Basic Beat")
  })
})

describe("parseGenre", () => {
  it("parses genre from text", () => {
    expect(parseGenre("add some trap drums")).toBe("trap")
    expect(parseGenre("add house beat")).toBe("house")
    expect(parseGenre("add hip-hop drums")).toBe("hip-hop")
    expect(parseGenre("add hip hop drums")).toBe("hip-hop")
    expect(parseGenre("boom bap drums")).toBe("hip-hop")
    expect(parseGenre("add lo-fi drums")).toBe("lo-fi")
    expect(parseGenre("chill beat")).toBe("lo-fi")
    expect(parseGenre("rock drums")).toBe("rock")
    expect(parseGenre("uk drill beat")).toBe("drill")
    expect(parseGenre("dnb drums")).toBe("dnb")
    expect(parseGenre("drum and bass")).toBe("dnb")
    expect(parseGenre("techno beat")).toBe("techno")
  })

  it("returns undefined for no genre hint", () => {
    expect(parseGenre("add some drums")).toBeUndefined()
    expect(parseGenre("beat please")).toBeUndefined()
  })
})

describe("listPatterns", () => {
  it("returns all pattern names", () => {
    const names = listPatterns()
    expect(names).toContain("trap")
    expect(names).toContain("house")
    expect(names).toContain("hipHop")
    expect(names).toContain("basic")
    expect(names.length).toBeGreaterThan(10)
  })
})

describe("listPatternsByGenre", () => {
  it("filters patterns by genre", () => {
    const trapPatterns = listPatternsByGenre("trap")
    expect(trapPatterns.length).toBeGreaterThanOrEqual(2)
    expect(trapPatterns.every((p) => p.genre === "trap")).toBe(true)

    const housePatterns = listPatternsByGenre("house")
    expect(housePatterns.length).toBeGreaterThanOrEqual(2)
    expect(housePatterns.every((p) => p.genre === "house")).toBe(true)
  })
})
