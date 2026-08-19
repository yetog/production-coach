/**
 * Arrangement utilities for Production Coach.
 *
 * Provides song structure helpers and section management.
 * NEXUS supports region manipulation via nested Region fields:
 * - positionTicks: where the region starts
 * - durationTicks: how long the region spans
 * - displayName: label for the region
 * - enabled: whether the region plays
 */

import { Ticks } from "@audiotool/nexus/utils"

// ─────────────────────────────────────────────────────────────────────────────
// Section Types
// ─────────────────────────────────────────────────────────────────────────────

export type SectionType = "intro" | "verse" | "prechorus" | "chorus" | "drop" | "breakdown" | "bridge" | "outro"

export interface Section {
  type: SectionType
  startBar: number
  durationBars: number
  label?: string
}

export interface SongStructure {
  sections: Section[]
  totalBars: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Common Song Structures
// ─────────────────────────────────────────────────────────────────────────────

export const STRUCTURES: Record<string, SongStructure> = {
  // EDM/Dance structure
  edm: {
    sections: [
      { type: "intro", startBar: 1, durationBars: 8 },
      { type: "breakdown", startBar: 9, durationBars: 8 },
      { type: "drop", startBar: 17, durationBars: 16 },
      { type: "breakdown", startBar: 33, durationBars: 8 },
      { type: "drop", startBar: 41, durationBars: 16 },
      { type: "outro", startBar: 57, durationBars: 8 },
    ],
    totalBars: 64,
  },

  // Hip-hop/Trap structure
  hiphop: {
    sections: [
      { type: "intro", startBar: 1, durationBars: 4 },
      { type: "verse", startBar: 5, durationBars: 16 },
      { type: "chorus", startBar: 21, durationBars: 8 },
      { type: "verse", startBar: 29, durationBars: 16 },
      { type: "chorus", startBar: 45, durationBars: 8 },
      { type: "outro", startBar: 53, durationBars: 4 },
    ],
    totalBars: 56,
  },

  // Pop structure
  pop: {
    sections: [
      { type: "intro", startBar: 1, durationBars: 8 },
      { type: "verse", startBar: 9, durationBars: 8 },
      { type: "prechorus", startBar: 17, durationBars: 4 },
      { type: "chorus", startBar: 21, durationBars: 8 },
      { type: "verse", startBar: 29, durationBars: 8 },
      { type: "prechorus", startBar: 37, durationBars: 4 },
      { type: "chorus", startBar: 41, durationBars: 8 },
      { type: "bridge", startBar: 49, durationBars: 8 },
      { type: "chorus", startBar: 57, durationBars: 8 },
      { type: "outro", startBar: 65, durationBars: 8 },
    ],
    totalBars: 72,
  },

  // Simple/minimal structure
  simple: {
    sections: [
      { type: "intro", startBar: 1, durationBars: 8 },
      { type: "verse", startBar: 9, durationBars: 16 },
      { type: "chorus", startBar: 25, durationBars: 16 },
      { type: "outro", startBar: 41, durationBars: 8 },
    ],
    totalBars: 48,
  },

  // Loop/beat structure (for demos)
  loop: {
    sections: [
      { type: "intro", startBar: 1, durationBars: 4 },
      { type: "drop", startBar: 5, durationBars: 16 },
      { type: "outro", startBar: 21, durationBars: 4 },
    ],
    totalBars: 24,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse explicit duration from command text.
 *
 * Matches: "for 32 bars", "32 bars long", "lasting 16 bars"
 */
export function parseExplicitDuration(text: string): number | undefined {
  const patterns = [
    /\bfor\s+(\d+)\s*bars?\b/i,
    /\b(\d+)\s*bars?\s+long\b/i,
    /\blasting\s+(\d+)\s*bars?\b/i,
    /\b(\d+)\s*bar\s+(?:pattern|loop)\b/i,
    /\bacross\s+(\d+)\s*bars?\b/i,
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match !== null) {
      const bars = parseInt(match[1]!, 10)
      if (bars > 0 && bars <= 256) return bars
    }
  }

  return undefined
}

/**
 * Parse a bar range from command text.
 *
 * Matches: "bars 1-8", "bar 1 to 8", "from bar 1 to bar 8"
 */
export function parseBarRange(text: string): { startBar: number; endBar: number } | undefined {
  const patterns = [
    /\bbars?\s+(\d+)\s*[-–to]+\s*(\d+)\b/i,
    /\bfrom\s+bar\s+(\d+)\s+to\s+(?:bar\s+)?(\d+)\b/i,
    /\bbar\s+(\d+)\s+(?:to|through)\s+(?:bar\s+)?(\d+)\b/i,
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match !== null) {
      const startBar = parseInt(match[1]!, 10)
      const endBar = parseInt(match[2]!, 10)
      if (startBar > 0 && endBar >= startBar && endBar <= 256) {
        return { startBar, endBar }
      }
    }
  }

  return undefined
}

/**
 * Parse section type from command text.
 */
export function parseSectionType(text: string): SectionType | undefined {
  const normalized = text.toLowerCase()

  if (/\b(intro|introduction)\b/.test(normalized)) return "intro"
  if (/\b(verse)\b/.test(normalized)) return "verse"
  if (/\b(pre[\s-]?chorus|prechorus)\b/.test(normalized)) return "prechorus"
  if (/\b(chorus|hook)\b/.test(normalized)) return "chorus"
  if (/\b(drop|climax)\b/.test(normalized)) return "drop"
  if (/\b(break(?:down)?)\b/.test(normalized)) return "breakdown"
  if (/\b(bridge|middle\s*8)\b/.test(normalized)) return "bridge"
  if (/\b(outro|ending|end)\b/.test(normalized)) return "outro"

  return undefined
}

/**
 * Parse structure type from command text.
 */
export function parseStructureType(text: string): string | undefined {
  const normalized = text.toLowerCase()

  if (/\b(edm|electronic|dance)\b/.test(normalized)) return "edm"
  if (/\b(hip[\s-]?hop|rap|trap)\b/.test(normalized)) return "hiphop"
  if (/\b(pop)\b/.test(normalized)) return "pop"
  if (/\b(simple|basic|minimal)\b/.test(normalized)) return "simple"
  if (/\b(loop|beat)\b/.test(normalized)) return "loop"

  return undefined
}

/**
 * Get a structure by name.
 */
export function getStructure(name: string): SongStructure | undefined {
  return STRUCTURES[name.toLowerCase()]
}

/**
 * Check if text mentions arrangement/structure commands.
 */
export function mentionsArrangement(text: string): boolean {
  return /\b(copy|duplicate|repeat|extend|structure|arrangement|section|loop\s+(?:all|everything))\b/.test(text.toLowerCase())
}

/**
 * Check if text is a copy/duplicate command.
 */
export function isCopyCommand(text: string): boolean {
  return /\b(copy|duplicate)\b/.test(text.toLowerCase()) && parseBarRange(text) !== undefined
}

/**
 * Check if text is an extend command.
 */
export function isExtendCommand(text: string): boolean {
  return /\b(extend|stretch|lengthen|continue)\b/.test(text.toLowerCase())
}

/**
 * Check if text is a structure command.
 */
export function isStructureCommand(text: string): boolean {
  return /\b(create|make|set up).*\b(structure|arrangement|layout)\b/.test(text.toLowerCase())
}

// ─────────────────────────────────────────────────────────────────────────────
// Bar/Tick Conversion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert bars to ticks (at 4/4 time signature).
 */
export function barsToTicks(bars: number): number {
  return bars * Ticks.SemiBreve
}

/**
 * Convert ticks to bars (at 4/4 time signature).
 */
export function ticksToBars(ticks: number): number {
  return Math.round(ticks / Ticks.SemiBreve)
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Labels
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a human-readable label for a section.
 */
export function sectionLabel(section: Section): string {
  const typeLabels: Record<SectionType, string> = {
    intro: "Intro",
    verse: "Verse",
    prechorus: "Pre-Chorus",
    chorus: "Chorus",
    drop: "Drop",
    breakdown: "Breakdown",
    bridge: "Bridge",
    outro: "Outro",
  }
  return section.label ?? typeLabels[section.type]
}

/**
 * List all available structure names.
 */
export function listStructures(): string[] {
  return Object.keys(STRUCTURES)
}
