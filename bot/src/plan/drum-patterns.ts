/**
 * Drum patterns for the Production Coach.
 *
 * This module provides genre-specific drum patterns using standard MIDI drum
 * mappings. Patterns are defined as arrays of hits per 16th note grid.
 *
 * MIDI Drum Notes (General MIDI):
 *   36 = Kick
 *   38 = Snare
 *   37 = Rim/Side Stick
 *   39 = Clap
 *   42 = Closed Hi-hat
 *   46 = Open Hi-hat
 *   49 = Crash
 *   51 = Ride
 */

// ─────────────────────────────────────────────────────────────────────────────
// Drum MIDI Notes
// ─────────────────────────────────────────────────────────────────────────────

export const DRUM_NOTES = {
  kick: 36,
  snare: 38,
  rim: 37,
  clap: 39,
  closedHat: 42,
  openHat: 46,
  crash: 49,
  ride: 51,
} as const

export type DrumPiece = keyof typeof DRUM_NOTES

// ─────────────────────────────────────────────────────────────────────────────
// Pattern Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single drum hit with timing and velocity.
 * Position is in 16th notes (0-15 for one bar).
 */
export interface DrumHit {
  piece: DrumPiece
  /** Position in 16th notes from bar start (0-15) */
  position: number
  /** Velocity 0-1 */
  velocity: number
}

/**
 * A one-bar drum pattern.
 */
export interface DrumPattern {
  name: string
  /** Genre/style hint */
  genre: DrumGenre
  /** BPM range this pattern works best at */
  bpmRange: [number, number]
  /** The hits in one bar */
  hits: DrumHit[]
  /** Number of bars this pattern spans (default 1) */
  bars?: number
}

export type DrumGenre =
  | "trap"
  | "house"
  | "hip-hop"
  | "rock"
  | "pop"
  | "lo-fi"
  | "drill"
  | "dnb"
  | "techno"
  | "generic"

// ─────────────────────────────────────────────────────────────────────────────
// Pattern Library
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Helper to create hits at specific 16th note positions.
 * Positions: 0=1, 4=2, 8=3, 12=4 (quarter note beats)
 */
function hits(piece: DrumPiece, positions: number[], velocity = 0.8): DrumHit[] {
  return positions.map((position) => ({ piece, position, velocity }))
}

// Basic four-on-the-floor kick pattern
const FOUR_ON_FLOOR_KICK = hits("kick", [0, 4, 8, 12])

// Trap kick pattern (sparse, syncopated)
const TRAP_KICK = hits("kick", [0, 6, 10], 0.9)

// Hip-hop boom bap kick
const BOOM_BAP_KICK = hits("kick", [0, 5, 8, 13], 0.85)

// Rock steady kick
const ROCK_KICK = hits("kick", [0, 8])

// ─────────────────────────────────────────────────────────────────────────────
// Genre Patterns
// ─────────────────────────────────────────────────────────────────────────────

export const PATTERNS: Record<string, DrumPattern> = {
  // ─── Trap ──────────────────────────────────────────────────────────────────
  trap: {
    name: "Trap Beat",
    genre: "trap",
    bpmRange: [130, 160],
    hits: [
      ...hits("kick", [0, 6, 10], 0.9),
      ...hits("snare", [4, 12], 0.85),
      ...hits("closedHat", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], 0.6), // rolling hats
      ...hits("openHat", [2, 6, 10, 14], 0.5), // accent hats
    ],
  },

  trapMinimal: {
    name: "Minimal Trap",
    genre: "trap",
    bpmRange: [130, 160],
    hits: [
      ...hits("kick", [0, 10], 0.9),
      ...hits("snare", [4, 12], 0.8),
      ...hits("closedHat", [0, 2, 4, 6, 8, 10, 12, 14], 0.65),
    ],
  },

  // ─── House ─────────────────────────────────────────────────────────────────
  house: {
    name: "House Beat",
    genre: "house",
    bpmRange: [120, 130],
    hits: [
      ...FOUR_ON_FLOOR_KICK,
      ...hits("clap", [4, 12], 0.8),
      ...hits("closedHat", [2, 6, 10, 14], 0.7), // offbeat hats
      ...hits("openHat", [6, 14], 0.5),
    ],
  },

  deepHouse: {
    name: "Deep House",
    genre: "house",
    bpmRange: [118, 125],
    hits: [
      ...FOUR_ON_FLOOR_KICK,
      ...hits("clap", [4, 12], 0.75),
      ...hits("closedHat", [2, 6, 10, 14], 0.6),
      ...hits("rim", [4, 12], 0.4),
    ],
  },

  // ─── Hip-Hop ───────────────────────────────────────────────────────────────
  hipHop: {
    name: "Hip-Hop Boom Bap",
    genre: "hip-hop",
    bpmRange: [85, 100],
    hits: [
      ...hits("kick", [0, 5, 8, 13], 0.85),
      ...hits("snare", [4, 12], 0.9),
      ...hits("closedHat", [0, 2, 4, 6, 8, 10, 12, 14], 0.65),
    ],
  },

  hipHopModern: {
    name: "Modern Hip-Hop",
    genre: "hip-hop",
    bpmRange: [75, 95],
    hits: [
      ...hits("kick", [0, 7, 10], 0.9),
      ...hits("snare", [4, 12], 0.85),
      ...hits("closedHat", [0, 2, 4, 6, 8, 10, 12, 14], 0.6),
      ...hits("openHat", [6, 14], 0.4),
    ],
  },

  // ─── Lo-Fi ─────────────────────────────────────────────────────────────────
  lofi: {
    name: "Lo-Fi Chill",
    genre: "lo-fi",
    bpmRange: [70, 90],
    hits: [
      ...hits("kick", [0, 6, 10], 0.7),
      ...hits("snare", [4, 12], 0.65),
      ...hits("closedHat", [0, 2, 4, 6, 8, 10, 12, 14], 0.5),
      ...hits("rim", [2, 10], 0.35),
    ],
  },

  // ─── Rock ──────────────────────────────────────────────────────────────────
  rock: {
    name: "Rock Beat",
    genre: "rock",
    bpmRange: [100, 140],
    hits: [
      ...hits("kick", [0, 8], 0.9),
      ...hits("snare", [4, 12], 0.95),
      ...hits("closedHat", [0, 2, 4, 6, 8, 10, 12, 14], 0.7),
    ],
  },

  rockDriving: {
    name: "Driving Rock",
    genre: "rock",
    bpmRange: [110, 150],
    hits: [
      ...hits("kick", [0, 4, 8, 12], 0.85),
      ...hits("snare", [4, 12], 0.95),
      ...hits("closedHat", [0, 2, 4, 6, 8, 10, 12, 14], 0.75),
      ...hits("crash", [0], 0.6),
    ],
  },

  // ─── Pop ───────────────────────────────────────────────────────────────────
  pop: {
    name: "Pop Beat",
    genre: "pop",
    bpmRange: [100, 130],
    hits: [
      ...hits("kick", [0, 8], 0.85),
      ...hits("snare", [4, 12], 0.9),
      ...hits("closedHat", [0, 2, 4, 6, 8, 10, 12, 14], 0.65),
      ...hits("clap", [4, 12], 0.5),
    ],
  },

  // ─── Drill ─────────────────────────────────────────────────────────────────
  drill: {
    name: "UK Drill",
    genre: "drill",
    bpmRange: [140, 150],
    hits: [
      ...hits("kick", [0, 3, 6, 10], 0.9),
      ...hits("snare", [4, 12], 0.85),
      ...hits("closedHat", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], 0.55),
      ...hits("openHat", [4, 12], 0.5),
    ],
  },

  // ─── DnB ───────────────────────────────────────────────────────────────────
  dnb: {
    name: "Drum & Bass",
    genre: "dnb",
    bpmRange: [165, 180],
    hits: [
      ...hits("kick", [0, 10], 0.9),
      ...hits("snare", [4, 12], 0.95),
      ...hits("closedHat", [0, 2, 4, 6, 8, 10, 12, 14], 0.7),
    ],
  },

  // ─── Techno ────────────────────────────────────────────────────────────────
  techno: {
    name: "Techno",
    genre: "techno",
    bpmRange: [125, 140],
    hits: [
      ...FOUR_ON_FLOOR_KICK,
      ...hits("clap", [4, 12], 0.75),
      ...hits("closedHat", [2, 6, 10, 14], 0.65),
      ...hits("ride", [0, 4, 8, 12], 0.4),
    ],
  },

  // ─── Generic ───────────────────────────────────────────────────────────────
  basic: {
    name: "Basic Beat",
    genre: "generic",
    bpmRange: [80, 140],
    hits: [
      ...hits("kick", [0, 8], 0.85),
      ...hits("snare", [4, 12], 0.85),
      ...hits("closedHat", [0, 2, 4, 6, 8, 10, 12, 14], 0.65),
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Pattern Selection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a pattern by name (case-insensitive, with aliases).
 */
export function getPattern(name: string): DrumPattern | undefined {
  const normalized = name.toLowerCase().replace(/[\s-_]/g, "")

  // Direct match
  for (const [key, pattern] of Object.entries(PATTERNS)) {
    if (key.toLowerCase() === normalized) return pattern
  }

  // Alias matching
  const aliases: Record<string, string> = {
    "boombap": "hipHop",
    "hiphopboombap": "hipHop",
    "modernhiphop": "hipHopModern",
    "lofi": "lofi",
    "chillhop": "lofi",
    "fourfloor": "house",
    "4floor": "house",
    "4onthefloor": "house",
    "fouronthefloor": "house",
    "ukdrill": "drill",
    "drumandbass": "dnb",
    "drumandbase": "dnb",
    "drumnbass": "dnb",
    "minimal": "trapMinimal",
    "minimaltrap": "trapMinimal",
    "deep": "deepHouse",
    "deephouse": "deepHouse",
    "driving": "rockDriving",
    "drivingrock": "rockDriving",
    "simple": "basic",
    "default": "basic",
  }

  const aliasKey = aliases[normalized]
  if (aliasKey && PATTERNS[aliasKey]) return PATTERNS[aliasKey]

  // Genre fallback
  for (const pattern of Object.values(PATTERNS)) {
    if (pattern.genre === normalized) return pattern
  }

  return undefined
}

/**
 * Get a pattern for a specific genre.
 */
export function getPatternForGenre(genre: DrumGenre): DrumPattern {
  // Return the primary pattern for each genre
  const genreDefaults: Record<DrumGenre, string> = {
    trap: "trap",
    house: "house",
    "hip-hop": "hipHop",
    rock: "rock",
    pop: "pop",
    "lo-fi": "lofi",
    drill: "drill",
    dnb: "dnb",
    techno: "techno",
    generic: "basic",
  }

  return PATTERNS[genreDefaults[genre]] ?? PATTERNS.basic
}

/**
 * Parse a genre hint from user text.
 */
export function parseGenre(text: string): DrumGenre | undefined {
  const normalized = text.toLowerCase()

  const patterns: [RegExp, DrumGenre][] = [
    [/\btrap\b/, "trap"],
    [/\bhouse\b/, "house"],
    [/\bdeep\s*house\b/, "house"],
    [/\bhip[\s-]?hop\b/, "hip-hop"],
    [/\bboom\s*bap\b/, "hip-hop"],
    [/\brap\b/, "hip-hop"],
    [/\brock\b/, "rock"],
    [/\bpop\b/, "pop"],
    [/\blo[\s-]?fi\b/, "lo-fi"],
    [/\bchill\b/, "lo-fi"],
    [/\bdrill\b/, "drill"],
    [/\buk\s*drill\b/, "drill"],
    [/\bd&?n&?b\b/, "dnb"],
    [/\bdrum\s*(and|&|n)\s*bass\b/, "dnb"],
    [/\bjungle\b/, "dnb"],
    [/\btechno\b/, "techno"],
    [/\bminimal\b/, "techno"],
  ]

  for (const [regex, genre] of patterns) {
    if (regex.test(normalized)) return genre
  }

  return undefined
}

/**
 * List all available pattern names.
 */
export function listPatterns(): string[] {
  return Object.keys(PATTERNS)
}

/**
 * List patterns by genre.
 */
export function listPatternsByGenre(genre: DrumGenre): DrumPattern[] {
  return Object.values(PATTERNS).filter((p) => p.genre === genre)
}
