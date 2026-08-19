/**
 * Music theory utilities for melody and chord generation (issue #29).
 *
 * MIDI note numbers: 60 = C4 (middle C), 72 = C5, 48 = C3
 * Intervals are in semitones from the root.
 *
 * This module is deliberately pure: no SDK imports, no side effects, everything
 * is testable with plain data. The planner uses these utilities to build note
 * arrays that the executor writes to the document.
 */

// Scale definitions (intervals from root in semitones)
export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonicMajor: [0, 2, 4, 7, 9],
  pentatonicMinor: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
} as const

export type ScaleName = keyof typeof SCALES

// Chord definitions (intervals from root in semitones)
export const CHORD_TYPES = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  dominant7: [0, 4, 7, 10],
  suspended2: [0, 2, 7],
  suspended4: [0, 5, 7],
} as const

export type ChordType = keyof typeof CHORD_TYPES

// Note name to MIDI pitch conversion (octave 4 = middle C octave)
const NOTE_BASE: Record<string, number> = {
  C: 60,
  "C#": 61,
  Db: 61,
  D: 62,
  "D#": 63,
  Eb: 63,
  E: 64,
  Fb: 64,
  F: 65,
  "F#": 66,
  Gb: 66,
  G: 67,
  "G#": 68,
  Ab: 68,
  A: 69,
  "A#": 70,
  Bb: 70,
  B: 71,
  Cb: 71,
}

export interface KeySignature {
  /** Note name, e.g., "C", "F#", "Bb" */
  root: string
  /** MIDI pitch of root in octave 4 */
  rootPitch: number
  /** Major or minor mode */
  mode: "major" | "minor"
  /** Scale intervals from root */
  scale: readonly number[]
}

/**
 * Parse a key string into a KeySignature.
 *
 * Accepts: "C major", "Am", "F# minor", "Bb", "D min"
 * Returns undefined for invalid input.
 */
export function parseKey(keyString: string): KeySignature | undefined {
  const normalized = keyString.trim()
  // Match: note name (C, F#, Bb) + optional mode (m, min, minor, maj, major)
  const match = /^([A-G][#b]?)\s*(m(?:in(?:or)?)?|maj(?:or)?)?$/i.exec(normalized)
  if (match === null) return undefined

  // Normalize root: first char uppercase, rest lowercase
  const rawRoot = match[1]!
  const root = rawRoot.charAt(0).toUpperCase() + rawRoot.slice(1).toLowerCase()

  // Parse mode: "m", "min", "minor" = minor; everything else = major
  const modeStr = match[2]?.toLowerCase() ?? ""
  const isMinor = modeStr.startsWith("m") && modeStr !== "maj" && modeStr !== "major"
  const mode = isMinor ? "minor" : "major"

  const rootPitch = NOTE_BASE[root]
  if (rootPitch === undefined) return undefined

  return {
    root,
    rootPitch,
    mode,
    scale: SCALES[mode],
  }
}

/**
 * Get all notes in a scale starting from a root pitch.
 *
 * @param rootPitch - MIDI pitch of the root note
 * @param scale - Array of intervals from root
 * @param octaves - Number of octaves to generate (default 1)
 */
export function getScaleNotes(
  rootPitch: number,
  scale: readonly number[],
  octaves: number = 1,
): number[] {
  const notes: number[] = []
  for (let octave = 0; octave < octaves; octave++) {
    for (const interval of scale) {
      notes.push(rootPitch + interval + octave * 12)
    }
  }
  return notes
}

/**
 * Get the notes of a chord given a root pitch and chord type.
 */
export function getChordNotes(rootPitch: number, chordType: ChordType): number[] {
  return CHORD_TYPES[chordType].map((interval) => rootPitch + interval)
}

// Common chord progressions (scale degrees, 1-indexed)
export const PROGRESSIONS = {
  pop: [1, 5, 6, 4], // I-V-vi-IV (most common)
  jazz: [2, 5, 1, 6], // ii-V-I-vi
  blues: [1, 1, 4, 1, 4, 4, 1, 1, 5, 4, 1, 5], // 12-bar blues
  sad: [6, 4, 1, 5], // vi-IV-I-V
  rock: [1, 4, 5, 4], // I-IV-V-IV
  fifties: [1, 6, 4, 5], // I-vi-IV-V (50s progression)
} as const

export type ProgressionName = keyof typeof PROGRESSIONS

/**
 * Get the roman numeral representation of a progression.
 */
export function getProgressionRoman(name: ProgressionName, mode: "major" | "minor"): string {
  const romanMap: Record<number, string> =
    mode === "major"
      ? { 1: "I", 2: "ii", 3: "iii", 4: "IV", 5: "V", 6: "vi", 7: "vii°" }
      : { 1: "i", 2: "ii°", 3: "III", 4: "iv", 5: "v", 6: "VI", 7: "VII" }

  return PROGRESSIONS[name].map((degree) => romanMap[degree] ?? String(degree)).join("-")
}

/**
 * Get the chord root pitch from a scale degree.
 *
 * @param keyRoot - MIDI pitch of the key's root
 * @param degree - Scale degree (1-7)
 * @param scale - Scale intervals
 */
export function getChordRootFromDegree(
  keyRoot: number,
  degree: number,
  scale: readonly number[],
): number {
  // degree 1 = index 0, degree 2 = index 1, etc.
  const scaleIndex = ((degree - 1) % scale.length + scale.length) % scale.length
  return keyRoot + scale[scaleIndex]!
}

/**
 * Determine the chord quality for a scale degree.
 *
 * In major: I, IV, V are major; ii, iii, vi are minor; vii is diminished
 * In minor: i, iv are minor; III, VI, VII are major; ii is diminished; v is minor
 */
export function getChordTypeForDegree(degree: number, mode: "major" | "minor"): ChordType {
  if (mode === "major") {
    const types: Record<number, ChordType> = {
      1: "major",
      2: "minor",
      3: "minor",
      4: "major",
      5: "major",
      6: "minor",
      7: "diminished",
    }
    return types[degree] ?? "major"
  } else {
    const types: Record<number, ChordType> = {
      1: "minor",
      2: "diminished",
      3: "major",
      4: "minor",
      5: "minor",
      6: "major",
      7: "major",
    }
    return types[degree] ?? "minor"
  }
}

/**
 * Build a chord progression as arrays of MIDI pitches.
 *
 * @param keyRoot - MIDI pitch of the key's root (e.g., 48 for C3)
 * @param scale - Scale intervals
 * @param mode - Major or minor
 * @param progression - Array of scale degrees
 */
export function buildChordProgression(
  keyRoot: number,
  scale: readonly number[],
  mode: "major" | "minor",
  progression: readonly number[],
): number[][] {
  return progression.map((degree) => {
    const chordRoot = getChordRootFromDegree(keyRoot, degree, scale)
    const chordType = getChordTypeForDegree(degree, mode)
    return getChordNotes(chordRoot, chordType)
  })
}

/**
 * Parse Roman numeral progression from user input.
 *
 * Accepts: "I-IV-V-I", "i-iv-V-i", "I IV V I"
 * Returns array of scale degrees, or undefined if parsing fails.
 */
export function parseRomanNumerals(input: string): number[] | undefined {
  const romanToNumber: Record<string, number> = {
    i: 1,
    I: 1,
    ii: 2,
    II: 2,
    iii: 3,
    III: 3,
    iv: 4,
    IV: 4,
    v: 5,
    V: 5,
    vi: 6,
    VI: 6,
    vii: 7,
    VII: 7,
  }

  // Split on hyphens, spaces, or commas
  const parts = input.split(/[-\s,]+/).filter((s) => s.length > 0)
  if (parts.length === 0) return undefined

  const degrees: number[] = []
  for (const part of parts) {
    // Remove diminished/augmented symbols for lookup
    const cleaned = part.replace(/[°+]/g, "")
    const degree = romanToNumber[cleaned]
    if (degree === undefined) return undefined
    degrees.push(degree)
  }

  return degrees
}

/** Common keys for random selection when user doesn't specify */
export const COMMON_KEYS = ["C major", "G major", "A minor", "D minor", "F major"] as const

/**
 * Pick a random key from the common keys pool.
 */
export function randomKey(): KeySignature {
  const keyString = COMMON_KEYS[Math.floor(Math.random() * COMMON_KEYS.length)]!
  return parseKey(keyString)!
}
