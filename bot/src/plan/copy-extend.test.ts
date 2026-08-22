/**
 * Tests for copy and extend command parsing.
 */
import { describe, expect, it } from "vitest"
import { planCommand } from "./planner.js"
import type { SessionReport } from "../analyze/analyzer.js"

// Minimal session fixture
function makeSession(overrides: Partial<SessionReport> = {}): SessionReport {
  return {
    tempoBpm: 128,
    signature: "4/4",
    lengthBars: 64,
    shape: "arranged",
    inventory: { drums: 1, bass: 1, synths: 1, effects: 0, sequencers: 0, mixers: 1, routing: 1, other: 0 },
    sections: [
      { label: "intro", startBar: 1, endBar: 16, density: 2, confidence: 0.9 },
      { label: "build", startBar: 17, endBar: 32, density: 4, confidence: 0.85 },
      { label: "drop", startBar: 33, endBar: 48, density: 8, confidence: 0.95 },
      { label: "outro", startBar: 49, endBar: 64, density: 2, confidence: 0.8 },
    ],
    drop: { label: "drop", startBar: 33, endBar: 48, density: 8, confidence: 0.95 },
    risks: [],
    ...overrides,
  }
}

describe("Copy Command Detection", () => {
  it("detects copy commands", () => {
    const session = makeSession()

    // Various copy phrasings
    const copyCommands = [
      "copy the drums to bar 49",
      "duplicate the 808 to bar 65",
      "repeat the melody to bar 33",
      "clone the chords to bar 17",
    ]

    for (const cmd of copyCommands) {
      const plan = planCommand(cmd, session)
      expect(plan.intent).toBe("copy_content")
    }
  })

  it("asks for content type if not specified", () => {
    const session = makeSession()
    const plan = planCommand("copy to bar 49", session)

    expect(plan.intent).toBe("copy_content")
    expect(plan.requiresConfirmation).toBe(true)
    expect(plan.clarification).toContain("drums, 808, melody, or chords")
  })

  it("asks for target bar if not specified", () => {
    const session = makeSession()
    const plan = planCommand("copy the drums", session)

    expect(plan.intent).toBe("copy_content")
    expect(plan.requiresConfirmation).toBe(true)
    expect(plan.clarification).toContain("Which bar")
  })

  it("parses target bar from command", () => {
    const session = makeSession()
    const plan = planCommand("copy the drums to bar 49", session)

    expect(plan.intent).toBe("copy_content")
    expect(plan.target.startBar).toBe(49)
    expect(plan.requiresConfirmation).toBe(false)
  })

  it("creates appropriate actions for drum copy", () => {
    const session = makeSession()
    const plan = planCommand("copy the trap drums to bar 49", session)

    expect(plan.intent).toBe("copy_content")
    expect(plan.actions.length).toBeGreaterThan(0)

    const source = plan.actions.find((a) => a.type === "create_source")
    expect(source).toBeDefined()
    expect(source?.deviceType).toBe("beatbox9")

    const region = plan.actions.find((a) => a.type === "create_note_region")
    expect(region).toBeDefined()
    expect(region?.startBar).toBe(49)
  })

  it("creates appropriate actions for 808 copy", () => {
    const session = makeSession()
    const plan = planCommand("copy the 808 to bar 49", session)

    expect(plan.intent).toBe("copy_content")

    const source = plan.actions.find((a) => a.type === "create_source")
    expect(source).toBeDefined()
    expect(source?.deviceType).toBe("bassline")
  })

  it("creates appropriate actions for melody copy", () => {
    const session = makeSession()
    const plan = planCommand("copy the melody to bar 49", session)

    expect(plan.intent).toBe("copy_content")

    const source = plan.actions.find((a) => a.type === "create_source")
    expect(source).toBeDefined()
    // Default melody device
    expect(["heisenberg", "pulverisateur"]).toContain(source?.deviceType)

    const melodyAction = plan.actions.find((a) => a.type === "create_melody_notes")
    expect(melodyAction).toBeDefined()
  })

  it("creates appropriate actions for chord copy", () => {
    const session = makeSession()
    const plan = planCommand("copy the chords to bar 49", session)

    expect(plan.intent).toBe("copy_content")

    const source = plan.actions.find((a) => a.type === "create_source")
    expect(source).toBeDefined()
    // Default chord device
    expect(["space", "heisenberg"]).toContain(source?.deviceType)

    const chordAction = plan.actions.find((a) => a.type === "create_chord_notes")
    expect(chordAction).toBeDefined()
  })
})

describe("Extend Command Detection", () => {
  it("detects extend commands", () => {
    const session = makeSession()

    const extendCommands = [
      "extend the drums for 16 bars",
      "continue the 808 for 8 more bars",
      "lengthen the melody by 32 bars",
      "extend the chords 16 bars",
    ]

    for (const cmd of extendCommands) {
      const plan = planCommand(cmd, session)
      expect(plan.intent).toBe("extend_content")
    }
  })

  it("asks for content type if not specified", () => {
    const session = makeSession()
    const plan = planCommand("extend for 16 bars", session)

    expect(plan.intent).toBe("extend_content")
    expect(plan.requiresConfirmation).toBe(true)
    expect(plan.clarification).toContain("drums, 808, melody, or chords")
  })

  it("asks for number of bars if not specified", () => {
    const session = makeSession()
    const plan = planCommand("extend the drums", session)

    expect(plan.intent).toBe("extend_content")
    expect(plan.requiresConfirmation).toBe(true)
    expect(plan.clarification).toContain("How many bars")
  })

  it("parses bar count from command", () => {
    const session = makeSession()
    const plan = planCommand("extend the drums for 16 bars", session)

    expect(plan.intent).toBe("extend_content")
    expect(plan.requiresConfirmation).toBe(false)
    // Should start after the drop (bar 49) since that's the default source
    expect(plan.target.startBar).toBe(49)
    expect(plan.target.endBar).toBe(64) // 49 + 16 - 1
  })

  it("handles 'more bars' syntax", () => {
    const session = makeSession()
    const plan = planCommand("extend the 808 8 more bars", session)

    expect(plan.intent).toBe("extend_content")
    expect(plan.requiresConfirmation).toBe(false)
  })

  it("creates actions starting after source section", () => {
    const session = makeSession()
    const plan = planCommand("extend the drums for 16 bars", session)

    const region = plan.actions.find((a) => a.type === "create_note_region")
    expect(region).toBeDefined()
    // Should start after the drop ends (bar 48) -> bar 49
    expect(region?.startBar).toBe(49)
    expect(region?.durationBars).toBe(16)
  })
})

describe("Source Section Resolution", () => {
  it("uses explicit bar range when provided", () => {
    const session = makeSession()
    const plan = planCommand("copy the drums from bars 1-16 to bar 33", session)

    expect(plan.intent).toBe("copy_content")
    // The copy should span the same duration as the source (16 bars)
    expect(plan.target.endBar - plan.target.startBar + 1).toBe(16)
  })

  it("uses section name when provided", () => {
    const session = makeSession()
    const plan = planCommand("copy the intro drums to bar 49", session)

    // Should use intro bars (1-16)
    expect(plan.intent).toBe("copy_content")
    expect(plan.target.startBar).toBe(49)
  })

  it("falls back to drop when no source specified", () => {
    const session = makeSession()
    const plan = planCommand("copy the drums to bar 65", session)

    // Should use drop bars (33-48) as source
    // Duration = 48 - 33 + 1 = 16 bars
    expect(plan.target.endBar - plan.target.startBar + 1).toBe(16)
  })

  it("asks for clarification when no section found for extend", () => {
    const sessionNoSections = makeSession({
      sections: [],
      drop: undefined,
    })

    // Extend needs to know where the existing content ends - should ask for source
    const plan = planCommand("extend the drums for 16 bars", sessionNoSections)

    expect(plan.intent).toBe("extend_content")
    expect(plan.requiresConfirmation).toBe(true)
    expect(plan.clarification).toContain("couldn't identify")
  })
})

describe("Content Type Extraction", () => {
  it("recognizes drum variations", () => {
    const session = makeSession()

    const drumTerms = ["drums", "beat", "rhythm", "percussion"]
    for (const term of drumTerms) {
      const plan = planCommand(`copy the ${term} to bar 49`, session)
      expect(plan.actions.some((a) => a.type === "create_drum_notes")).toBe(true)
    }
  })

  it("recognizes 808 variations", () => {
    const session = makeSession()

    const bassTerms = ["808", "bass", "bassline", "sub"]
    for (const term of bassTerms) {
      const plan = planCommand(`copy the ${term} to bar 49`, session)
      const source = plan.actions.find((a) => a.type === "create_source")
      expect(source?.deviceType).toBe("bassline")
    }
  })

  it("recognizes melody variations", () => {
    const session = makeSession()

    const melodyTerms = ["melody", "lead", "riff", "hook"]
    for (const term of melodyTerms) {
      const plan = planCommand(`copy the ${term} to bar 49`, session)
      expect(plan.actions.some((a) => a.type === "create_melody_notes")).toBe(true)
    }
  })

  it("recognizes chord variations", () => {
    const session = makeSession()

    const chordTerms = ["chords", "chord", "harmony", "progression", "pads"]
    for (const term of chordTerms) {
      const plan = planCommand(`copy the ${term} to bar 49`, session)
      expect(plan.actions.some((a) => a.type === "create_chord_notes")).toBe(true)
    }
  })
})

describe("Edge Cases", () => {
  it("does not confuse copy with add commands", () => {
    const session = makeSession()

    // These should NOT be copy commands
    const plan1 = planCommand("add drums at bar 1", session)
    expect(plan1.intent).toBe("add_drums")

    const plan2 = planCommand("add a melody in C major", session)
    expect(plan2.intent).toBe("add_melody")
  })

  it("does not confuse extend with melody/chord commands", () => {
    const session = makeSession()

    // "add a melody" should not trigger extend
    const plan = planCommand("add a melody in C major at bar 1 for 16 bars", session)
    expect(plan.intent).toBe("add_melody")
  })

  it("handles copy with tone modifiers", () => {
    const session = makeSession()
    const plan = planCommand("copy the dark 808 to bar 49", session)

    expect(plan.intent).toBe("copy_content")
    const source = plan.actions.find((a) => a.type === "create_source")
    expect(source?.tone).toBe("dark")
  })

  it("handles copy with pattern modifiers", () => {
    const session = makeSession()
    const plan = planCommand("copy the trap drums to bar 49", session)

    expect(plan.intent).toBe("copy_content")
    const drumAction = plan.actions.find((a) => a.type === "create_drum_notes")
    expect(drumAction?.patternName).toBe("Trap Beat")
  })
})
