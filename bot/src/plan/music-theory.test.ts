import { describe, expect, it } from "vitest"
import {
  buildChordProgression,
  getChordNotes,
  getChordRootFromDegree,
  getChordTypeForDegree,
  getProgressionRoman,
  getScaleNotes,
  parseKey,
  parseRomanNumerals,
  PROGRESSIONS,
  SCALES,
} from "./music-theory.js"

describe("parseKey", () => {
  it("parses 'C major'", () => {
    const key = parseKey("C major")
    expect(key).toBeDefined()
    expect(key?.root).toBe("C")
    expect(key?.rootPitch).toBe(60)
    expect(key?.mode).toBe("major")
    expect(key?.scale).toEqual(SCALES.major)
  })

  it("parses 'Am' as A minor", () => {
    const key = parseKey("Am")
    expect(key).toBeDefined()
    expect(key?.root).toBe("A")
    expect(key?.rootPitch).toBe(69)
    expect(key?.mode).toBe("minor")
    expect(key?.scale).toEqual(SCALES.minor)
  })

  it("parses 'F# minor'", () => {
    const key = parseKey("F# minor")
    expect(key).toBeDefined()
    expect(key?.root).toBe("F#")
    expect(key?.rootPitch).toBe(66)
    expect(key?.mode).toBe("minor")
  })

  it("parses 'Bb' as Bb major (default)", () => {
    const key = parseKey("Bb")
    expect(key).toBeDefined()
    expect(key?.root).toBe("Bb")
    expect(key?.rootPitch).toBe(70)
    expect(key?.mode).toBe("major")
  })

  it("parses 'D min' as D minor", () => {
    const key = parseKey("D min")
    expect(key).toBeDefined()
    expect(key?.root).toBe("D")
    expect(key?.mode).toBe("minor")
  })

  it("parses 'G maj' as G major", () => {
    const key = parseKey("G maj")
    expect(key).toBeDefined()
    expect(key?.root).toBe("G")
    expect(key?.mode).toBe("major")
  })

  it("returns undefined for invalid input", () => {
    expect(parseKey("xyz")).toBeUndefined()
    expect(parseKey("H major")).toBeUndefined()
    expect(parseKey("")).toBeUndefined()
    expect(parseKey("C# maj or")).toBeUndefined()
  })

  it("handles case-insensitive input", () => {
    const lower = parseKey("c major")
    const upper = parseKey("C MAJOR")
    expect(lower?.root).toBe("C")
    expect(upper?.root).toBe("C")
  })
})

describe("getScaleNotes", () => {
  it("returns C major scale starting at C4 (60)", () => {
    const notes = getScaleNotes(60, SCALES.major, 1)
    expect(notes).toEqual([60, 62, 64, 65, 67, 69, 71])
  })

  it("returns A minor scale starting at A4 (69)", () => {
    const notes = getScaleNotes(69, SCALES.minor, 1)
    expect(notes).toEqual([69, 71, 72, 74, 76, 77, 79])
  })

  it("supports multiple octaves", () => {
    const notes = getScaleNotes(60, SCALES.major, 2)
    expect(notes.length).toBe(14)
    expect(notes[7]).toBe(72) // C5
    expect(notes[13]).toBe(83) // B5
  })

  it("returns pentatonic scale correctly", () => {
    const notes = getScaleNotes(60, SCALES.pentatonicMinor, 1)
    expect(notes).toEqual([60, 63, 65, 67, 70])
  })
})

describe("getChordNotes", () => {
  it("returns C major triad", () => {
    const notes = getChordNotes(60, "major")
    expect(notes).toEqual([60, 64, 67]) // C, E, G
  })

  it("returns A minor triad", () => {
    const notes = getChordNotes(69, "minor")
    expect(notes).toEqual([69, 72, 76]) // A, C, E
  })

  it("returns G dominant 7th chord", () => {
    const notes = getChordNotes(67, "dominant7")
    expect(notes).toEqual([67, 71, 74, 77]) // G, B, D, F
  })

  it("returns C major 7th chord", () => {
    const notes = getChordNotes(60, "major7")
    expect(notes).toEqual([60, 64, 67, 71]) // C, E, G, B
  })

  it("returns diminished chord", () => {
    const notes = getChordNotes(71, "diminished")
    expect(notes).toEqual([71, 74, 77]) // B, D, F
  })
})

describe("getChordRootFromDegree", () => {
  const majorScale = SCALES.major

  it("returns correct roots for C major scale degrees", () => {
    expect(getChordRootFromDegree(60, 1, majorScale)).toBe(60) // C
    expect(getChordRootFromDegree(60, 2, majorScale)).toBe(62) // D
    expect(getChordRootFromDegree(60, 3, majorScale)).toBe(64) // E
    expect(getChordRootFromDegree(60, 4, majorScale)).toBe(65) // F
    expect(getChordRootFromDegree(60, 5, majorScale)).toBe(67) // G
    expect(getChordRootFromDegree(60, 6, majorScale)).toBe(69) // A
    expect(getChordRootFromDegree(60, 7, majorScale)).toBe(71) // B
  })

  it("handles octave wrapping", () => {
    // Degree 8 should be the same as degree 1
    expect(getChordRootFromDegree(60, 8, majorScale)).toBe(60)
  })
})

describe("getChordTypeForDegree", () => {
  describe("major key", () => {
    it("returns major for degrees I, IV, V", () => {
      expect(getChordTypeForDegree(1, "major")).toBe("major")
      expect(getChordTypeForDegree(4, "major")).toBe("major")
      expect(getChordTypeForDegree(5, "major")).toBe("major")
    })

    it("returns minor for degrees ii, iii, vi", () => {
      expect(getChordTypeForDegree(2, "major")).toBe("minor")
      expect(getChordTypeForDegree(3, "major")).toBe("minor")
      expect(getChordTypeForDegree(6, "major")).toBe("minor")
    })

    it("returns diminished for degree vii", () => {
      expect(getChordTypeForDegree(7, "major")).toBe("diminished")
    })
  })

  describe("minor key", () => {
    it("returns minor for degrees i, iv, v", () => {
      expect(getChordTypeForDegree(1, "minor")).toBe("minor")
      expect(getChordTypeForDegree(4, "minor")).toBe("minor")
      expect(getChordTypeForDegree(5, "minor")).toBe("minor")
    })

    it("returns major for degrees III, VI, VII", () => {
      expect(getChordTypeForDegree(3, "minor")).toBe("major")
      expect(getChordTypeForDegree(6, "minor")).toBe("major")
      expect(getChordTypeForDegree(7, "minor")).toBe("major")
    })

    it("returns diminished for degree ii", () => {
      expect(getChordTypeForDegree(2, "minor")).toBe("diminished")
    })
  })
})

describe("buildChordProgression", () => {
  it("builds a I-V-vi-IV progression in C major", () => {
    const progression = buildChordProgression(48, SCALES.major, "major", PROGRESSIONS.pop)
    expect(progression.length).toBe(4)
    // I = C major: [48, 52, 55]
    expect(progression[0]).toEqual([48, 52, 55])
    // V = G major: [55, 59, 62]
    expect(progression[1]).toEqual([55, 59, 62])
    // vi = A minor: [57, 60, 64]
    expect(progression[2]).toEqual([57, 60, 64])
    // IV = F major: [53, 57, 60]
    expect(progression[3]).toEqual([53, 57, 60])
  })

  it("builds a ii-V-I progression in C major (jazz)", () => {
    const progression = buildChordProgression(48, SCALES.major, "major", [2, 5, 1])
    expect(progression.length).toBe(3)
    // ii = D minor: [50, 53, 57]
    expect(progression[0]).toEqual([50, 53, 57])
    // V = G major: [55, 59, 62]
    expect(progression[1]).toEqual([55, 59, 62])
    // I = C major: [48, 52, 55]
    expect(progression[2]).toEqual([48, 52, 55])
  })
})

describe("getProgressionRoman", () => {
  it("returns correct Roman numerals for pop progression in major", () => {
    expect(getProgressionRoman("pop", "major")).toBe("I-V-vi-IV")
  })

  it("returns correct Roman numerals for jazz progression in major", () => {
    expect(getProgressionRoman("jazz", "major")).toBe("ii-V-I-vi")
  })

  it("returns correct Roman numerals for sad progression in major", () => {
    expect(getProgressionRoman("sad", "major")).toBe("vi-IV-I-V")
  })

  it("returns lowercase numerals for minor keys", () => {
    expect(getProgressionRoman("pop", "minor")).toBe("i-v-VI-iv")
  })
})

describe("parseRomanNumerals", () => {
  it("parses hyphen-separated progression", () => {
    expect(parseRomanNumerals("I-IV-V-I")).toEqual([1, 4, 5, 1])
  })

  it("parses space-separated progression", () => {
    expect(parseRomanNumerals("I IV V I")).toEqual([1, 4, 5, 1])
  })

  it("parses lowercase numerals", () => {
    expect(parseRomanNumerals("i-iv-V-i")).toEqual([1, 4, 5, 1])
  })

  it("parses vi-IV-I-V (sad progression)", () => {
    expect(parseRomanNumerals("vi-IV-I-V")).toEqual([6, 4, 1, 5])
  })

  it("handles diminished symbols", () => {
    expect(parseRomanNumerals("I-IV-vii°-I")).toEqual([1, 4, 7, 1])
  })

  it("returns undefined for invalid input", () => {
    expect(parseRomanNumerals("")).toBeUndefined()
    expect(parseRomanNumerals("X-Y-Z")).toBeUndefined()
    expect(parseRomanNumerals("VIII")).toBeUndefined() // 8 is not valid
  })
})
