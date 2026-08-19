import { describe, it, expect } from "vitest"
import {
  parseExplicitDuration,
  parseBarRange,
  parseSectionType,
  parseStructureType,
  getStructure,
  listStructures,
  STRUCTURES,
  barsToTicks,
  ticksToBars,
  sectionLabel,
  mentionsArrangement,
  isCopyCommand,
  isExtendCommand,
  isStructureCommand,
} from "./arrangement.js"
import { Ticks } from "@audiotool/nexus/utils"

describe("parseExplicitDuration", () => {
  it('parses "for X bars" format', () => {
    expect(parseExplicitDuration("add drums for 32 bars")).toBe(32)
    expect(parseExplicitDuration("add melody for 16 bars at bar 1")).toBe(16)
    expect(parseExplicitDuration("for 8 bars")).toBe(8)
  })

  it('parses "X bars long" format', () => {
    expect(parseExplicitDuration("add a 32 bars long pattern")).toBe(32)
    expect(parseExplicitDuration("16 bars long")).toBe(16)
  })

  it('parses "lasting X bars" format', () => {
    expect(parseExplicitDuration("add drums lasting 24 bars")).toBe(24)
  })

  it('parses "across X bars" format', () => {
    expect(parseExplicitDuration("spread across 16 bars")).toBe(16)
  })

  it("returns undefined for no duration", () => {
    expect(parseExplicitDuration("add drums at bar 1")).toBeUndefined()
    expect(parseExplicitDuration("add melody")).toBeUndefined()
  })

  it("rejects unreasonable durations", () => {
    expect(parseExplicitDuration("for 0 bars")).toBeUndefined()
    expect(parseExplicitDuration("for 500 bars")).toBeUndefined()
  })
})

describe("parseBarRange", () => {
  it('parses "bars X-Y" format', () => {
    expect(parseBarRange("add drums bars 1-32")).toEqual({ startBar: 1, endBar: 32 })
    expect(parseBarRange("from bars 17-24")).toEqual({ startBar: 17, endBar: 24 })
  })

  it('parses "bar X to Y" format', () => {
    expect(parseBarRange("bar 1 to 16")).toEqual({ startBar: 1, endBar: 16 })
    expect(parseBarRange("bar 9 to bar 24")).toEqual({ startBar: 9, endBar: 24 })
  })

  it('parses "from bar X to bar Y" format', () => {
    expect(parseBarRange("from bar 1 to bar 32")).toEqual({ startBar: 1, endBar: 32 })
    expect(parseBarRange("from bar 17 to 24")).toEqual({ startBar: 17, endBar: 24 })
  })

  it("returns undefined for no range", () => {
    expect(parseBarRange("add drums at bar 1")).toBeUndefined()
    expect(parseBarRange("for 32 bars")).toBeUndefined()
  })

  it("rejects invalid ranges", () => {
    expect(parseBarRange("bars 32-1")).toBeUndefined() // end before start
  })
})

describe("parseSectionType", () => {
  it("parses intro", () => {
    expect(parseSectionType("add to the intro")).toBe("intro")
    expect(parseSectionType("introduction section")).toBe("intro")
  })

  it("parses verse", () => {
    expect(parseSectionType("during the verse")).toBe("verse")
  })

  it("parses chorus", () => {
    expect(parseSectionType("in the chorus")).toBe("chorus")
    expect(parseSectionType("add a hook")).toBe("chorus")
  })

  it("parses drop", () => {
    expect(parseSectionType("under the drop")).toBe("drop")
    expect(parseSectionType("at the climax")).toBe("drop")
  })

  it("parses breakdown", () => {
    expect(parseSectionType("in the breakdown")).toBe("breakdown")
    expect(parseSectionType("during the break")).toBe("breakdown")
  })

  it("parses bridge", () => {
    expect(parseSectionType("add a bridge")).toBe("bridge")
    expect(parseSectionType("middle 8")).toBe("bridge")
  })

  it("parses outro", () => {
    expect(parseSectionType("in the outro")).toBe("outro")
    expect(parseSectionType("at the ending")).toBe("outro")
  })

  it("returns undefined for no section", () => {
    expect(parseSectionType("add drums")).toBeUndefined()
  })
})

describe("parseStructureType", () => {
  it("parses EDM/electronic", () => {
    expect(parseStructureType("edm structure")).toBe("edm")
    expect(parseStructureType("electronic layout")).toBe("edm")
    expect(parseStructureType("dance structure")).toBe("edm")
  })

  it("parses hip-hop", () => {
    expect(parseStructureType("hip-hop structure")).toBe("hiphop")
    expect(parseStructureType("trap arrangement")).toBe("hiphop")
    expect(parseStructureType("rap song")).toBe("hiphop")
  })

  it("parses pop", () => {
    expect(parseStructureType("pop structure")).toBe("pop")
  })

  it("parses simple", () => {
    expect(parseStructureType("simple structure")).toBe("simple")
    expect(parseStructureType("basic layout")).toBe("simple")
  })

  it("parses loop", () => {
    expect(parseStructureType("loop structure")).toBe("loop")
    expect(parseStructureType("beat layout")).toBe("loop")
  })

  it("returns undefined for no structure", () => {
    expect(parseStructureType("add drums")).toBeUndefined()
  })
})

describe("STRUCTURES", () => {
  it("has EDM structure", () => {
    expect(STRUCTURES.edm).toBeDefined()
    expect(STRUCTURES.edm.totalBars).toBe(64)
    expect(STRUCTURES.edm.sections.length).toBeGreaterThan(0)
  })

  it("has hip-hop structure", () => {
    expect(STRUCTURES.hiphop).toBeDefined()
    expect(STRUCTURES.hiphop.sections.some((s) => s.type === "verse")).toBe(true)
  })

  it("has pop structure", () => {
    expect(STRUCTURES.pop).toBeDefined()
    expect(STRUCTURES.pop.sections.some((s) => s.type === "prechorus")).toBe(true)
  })

  it("all structures have valid sections", () => {
    for (const [name, structure] of Object.entries(STRUCTURES)) {
      expect(structure.sections.length, `${name} should have sections`).toBeGreaterThan(0)
      expect(structure.totalBars, `${name} should have totalBars`).toBeGreaterThan(0)

      for (const section of structure.sections) {
        expect(section.startBar, `${name} section startBar`).toBeGreaterThanOrEqual(1)
        expect(section.durationBars, `${name} section durationBars`).toBeGreaterThan(0)
      }
    }
  })
})

describe("getStructure", () => {
  it("returns structure by name", () => {
    expect(getStructure("edm")).toEqual(STRUCTURES.edm)
    expect(getStructure("hiphop")).toEqual(STRUCTURES.hiphop)
  })

  it("is case insensitive", () => {
    expect(getStructure("EDM")).toEqual(STRUCTURES.edm)
    expect(getStructure("HipHop")).toEqual(STRUCTURES.hiphop)
  })

  it("returns undefined for unknown", () => {
    expect(getStructure("nonexistent")).toBeUndefined()
  })
})

describe("listStructures", () => {
  it("returns all structure names", () => {
    const names = listStructures()
    expect(names).toContain("edm")
    expect(names).toContain("hiphop")
    expect(names).toContain("pop")
    expect(names).toContain("simple")
    expect(names).toContain("loop")
  })
})

describe("barsToTicks and ticksToBars", () => {
  it("converts bars to ticks correctly", () => {
    expect(barsToTicks(1)).toBe(Ticks.SemiBreve)
    expect(barsToTicks(4)).toBe(Ticks.SemiBreve * 4)
  })

  it("converts ticks to bars correctly", () => {
    expect(ticksToBars(Ticks.SemiBreve)).toBe(1)
    expect(ticksToBars(Ticks.SemiBreve * 4)).toBe(4)
  })

  it("round trips correctly", () => {
    expect(ticksToBars(barsToTicks(16))).toBe(16)
  })
})

describe("sectionLabel", () => {
  it("returns human-readable labels", () => {
    expect(sectionLabel({ type: "intro", startBar: 1, durationBars: 8 })).toBe("Intro")
    expect(sectionLabel({ type: "prechorus", startBar: 17, durationBars: 4 })).toBe("Pre-Chorus")
    expect(sectionLabel({ type: "drop", startBar: 17, durationBars: 16 })).toBe("Drop")
  })

  it("uses custom label if provided", () => {
    expect(sectionLabel({ type: "verse", startBar: 9, durationBars: 16, label: "Verse 1" })).toBe("Verse 1")
  })
})

describe("mentionsArrangement", () => {
  it("detects copy commands", () => {
    expect(mentionsArrangement("copy bars 1-8 to bar 17")).toBe(true)
    expect(mentionsArrangement("duplicate the intro")).toBe(true)
  })

  it("detects extend commands", () => {
    expect(mentionsArrangement("extend to bar 32")).toBe(true)
  })

  it("detects structure commands", () => {
    expect(mentionsArrangement("create a song structure")).toBe(true)
    expect(mentionsArrangement("set up the arrangement")).toBe(true)
  })

  it("detects loop all", () => {
    expect(mentionsArrangement("loop all content")).toBe(true)
    expect(mentionsArrangement("loop everything")).toBe(true)
  })

  it("returns false for regular commands", () => {
    expect(mentionsArrangement("add drums at bar 1")).toBe(false)
    expect(mentionsArrangement("add melody in C major")).toBe(false)
  })
})

describe("isCopyCommand", () => {
  it("detects copy with bar range", () => {
    expect(isCopyCommand("copy bars 1-8 to bar 17")).toBe(true)
    expect(isCopyCommand("duplicate bar 1 to 8")).toBe(true)
  })

  it("returns false without bar range", () => {
    expect(isCopyCommand("copy the intro")).toBe(false)
    expect(isCopyCommand("add drums")).toBe(false)
  })
})

describe("isExtendCommand", () => {
  it("detects extend commands", () => {
    expect(isExtendCommand("extend to bar 32")).toBe(true)
    expect(isExtendCommand("stretch the pattern")).toBe(true)
    expect(isExtendCommand("continue the drums")).toBe(true)
  })

  it("returns false for non-extend", () => {
    expect(isExtendCommand("add drums")).toBe(false)
  })
})

describe("isStructureCommand", () => {
  it("detects structure commands", () => {
    expect(isStructureCommand("create a song structure")).toBe(true)
    expect(isStructureCommand("make an arrangement")).toBe(true)
    expect(isStructureCommand("set up the layout")).toBe(true)
  })

  it("returns false for non-structure", () => {
    expect(isStructureCommand("add drums")).toBe(false)
  })
})
