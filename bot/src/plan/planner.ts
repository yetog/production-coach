/**
 * Deterministic producer planner (issue #20).
 *
 * Turns a producer command plus the analyzer's report (#19) into a reviewable
 * plan. No LLM: the MVP commands are matched by pattern, and an LLM layer can
 * be added later behind the same contract without the demo depending on it.
 *
 * The rule this file exists to enforce: when the target is ambiguous, return a
 * question rather than a guess. Every path that cannot be certain sets
 * `requiresConfirmation` and fills in `clarification`.
 */
import type { SessionReport } from "../analyze/analyzer.js"
import { CONFIDENCE_THRESHOLD } from "../analyze/sections.js"
import { resolveDeviceName } from "./device-names.js"
import type {
  ChordVoicing,
  ContentType,
  MelodicPattern,
  NotePattern,
  NoteDuration,
  Plan,
  PlanAction,
  PlanTarget,
  ToneHint,
  VerificationCheck,
} from "./contract.js"
import {
  buildChordProgression,
  getProgressionRoman,
  getScaleNotes,
  parseKey,
  parseRomanNumerals,
  PROGRESSIONS,
  type KeySignature,
  type ProgressionName,
} from "./music-theory.js"
import {
  DRUM_NOTES,
  getPattern,
  getPatternForGenre,
  parseGenre,
  type DrumPattern,
} from "./drum-patterns.js"
import {
  parseExplicitDuration,
  parseBarRange,
} from "./arrangement.js"

/** Default span when the user names a bar but no length. */
const DEFAULT_BARS = 16

/** C1 - where an 808 sub actually lives. 60 is C4. */
const PITCH_808 = 24

/** C4 - lead melodies sit in a comfortable range */
const MELODY_OCTAVE = 60

/** C3 - chords sit below melodies */
const CHORD_OCTAVE = 48

/** Default key when user doesn't specify and we don't want to ask */
const DEFAULT_KEY: KeySignature = {
  root: "C",
  rootPitch: 60,
  mode: "major",
  scale: [0, 2, 4, 5, 7, 9, 11],
}

export function planCommand(command: string, session: SessionReport): Plan {
  const text = command.toLowerCase().trim()

  // Check for copy/extend commands first
  if (mentionsCopy(text)) {
    return buildCopyPlan(command, text, session)
  }
  if (mentionsExtend(text)) {
    return buildExtendPlan(command, text, session)
  }

  // Check for melody commands first (before 808 check, since "add melody" != 808)
  if (mentionsMelody(text)) {
    return buildMelodyPlan(command, text, session)
  }

  // Check for chord commands
  if (mentionsChords(text)) {
    return buildChordPlan(command, text, session)
  }

  // Check for drum commands
  if (mentionsDrums(text)) {
    return buildDrumPlan(command, text, session)
  }

  if (!mentions808(text)) {
    // "add a beatbox 9" - a device add, which is a different action from the
    // musical 808 flow: it creates a routed instrument and nothing else.
    if (isAddCommand(text)) {
      const device = resolveDeviceName(text)
      if (device !== undefined) return buildAddDevicePlan(command, device)
    }
    return isPreviewCommand(text) ? previewOnly(command, session) : unknownCommand(command)
  }

  const explicitBar = explicitBarFrom(text)
  const explicitDuration = parseExplicitDuration(text)
  const barRange = parseBarRange(text)
  const tone = toneFrom(text)

  // Check for explicit bar range first (e.g., "808 from bars 1-32")
  if (barRange !== undefined) {
    return build808Plan(command, tone, {
      startBar: barRange.startBar,
      endBar: barRange.endBar,
      confidence: 1,
    })
  }

  if (explicitBar !== undefined) {
    // An explicitly named bar is the user's own instruction: trust it fully,
    // but refuse to write past the end of the arrangement.
    if (session.lengthBars > 0 && explicitBar > session.lengthBars) {
      return needsAnswer(
        command,
        `Bar ${explicitBar} is beyond the end of this project, which is ` +
          `${session.lengthBars} bars long. Which bar did you mean?`,
        { startBar: explicitBar, endBar: explicitBar, confidence: 1 },
      )
    }
    // Use explicit duration if specified, otherwise default
    const duration = explicitDuration ?? DEFAULT_BARS
    return build808Plan(command, tone, {
      startBar: explicitBar,
      endBar: Math.min(
        explicitBar + duration - 1,
        session.lengthBars > 0 ? session.lengthBars : explicitBar + duration - 1,
      ),
      confidence: 1,
    })
  }

  // If only duration specified without bar, start at bar 1
  if (explicitDuration !== undefined) {
    return build808Plan(command, tone, {
      startBar: 1,
      endBar: explicitDuration,
      confidence: 1,
    })
  }

  const drop = session.drop
  if (drop === undefined) {
    return needsAnswer(
      command,
      session.clarification ??
        "I could not find a drop in this project. Which bar should the 808 start at?",
    )
  }
  if (drop.confidence < CONFIDENCE_THRESHOLD) {
    return needsAnswer(
      command,
      `I think the drop is bars ${drop.startBar}-${drop.endBar}, but I am not confident ` +
        `(${drop.confidence.toFixed(2)}). Should I use those bars?`,
      { section: drop.label, startBar: drop.startBar, endBar: drop.endBar, confidence: drop.confidence },
    )
  }

  return build808Plan(command, tone, {
    section: drop.label,
    startBar: drop.startBar,
    endBar: drop.endBar,
    confidence: drop.confidence,
  })
}

function build808Plan(
  command: string,
  tone: ToneHint,
  target: PlanTarget,
): Plan {
  const durationBars = Math.max(1, target.endBar - target.startBar + 1)
  // Dark reads as sustained and lower; bright as a shorter, busier figure.
  const pattern: NotePattern = tone === "dark" ? "sustained" : "downbeats"
  const velocity = tone === "dark" ? 0.9 : 0.75

  const actions: PlanAction[] = [
    { type: "create_source", deviceType: "bassline", displayName: "Agent 808", tone },
    { type: "route_to_mixer", deviceType: "bassline" },
    { type: "create_note_track", displayName: "Agent 808" },
    { type: "create_note_region", startBar: target.startBar, durationBars },
    { type: "create_notes", pitch: PITCH_808, pattern, velocity },
  ]

  const verification: VerificationCheck[] = [
    { kind: "entities_exist", description: "every entity the apply reported creating" },
    { kind: "entity_count", entityType: "note", atLeast: 1 },
    { kind: "routed_to_mixer", description: "the 808 source reaches a mixer channel" },
  ]

  const where =
    target.section === undefined
      ? `bars ${target.startBar}-${target.endBar}`
      : `the ${target.section} (bars ${target.startBar}-${target.endBar})`

  return {
    planId: planId("add_808", target),
    command,
    intent: "add_808",
    interpretedIntent: `Add ${tone === "neutral" ? "an" : `a ${tone}`} 808 bassline under ${where}`,
    target,
    actions,
    summary:
      `I will add ${tone === "neutral" ? "an" : `a ${tone}`} 808 bassline across ` +
      `bars ${target.startBar}-${target.endBar}, on its own track, routed to the mixer ` +
      `so you can hear it. Nothing already in the project is changed.`,
    safety: "creates_only",
    verification,
    requiresConfirmation: false,
  }
}

function buildAddDevicePlan(
  command: string,
  device: { deviceType: string; displayName: string },
): Plan {
  return {
    planId: `add_device-${device.deviceType}`,
    command,
    intent: "add_device",
    interpretedIntent: `Add a ${device.displayName} and route it to the mixer`,
    // A device add has no place on the timeline - it is gear, not material.
    target: { startBar: 0, endBar: 0, confidence: 1 },
    actions: [
      {
        type: "create_source",
        deviceType: device.deviceType,
        displayName: device.displayName,
      },
      { type: "route_to_mixer", deviceType: device.deviceType },
    ],
    summary:
      `I will add a ${device.displayName} and wire it to a new mixer channel so you can ` +
      `hear it. It starts silent - nothing already in the project changes.`,
    safety: "creates_only",
    verification: [
      { kind: "entities_exist", description: "the device and its cable" },
      { kind: "routed_to_mixer", description: `the ${device.displayName} reaches a mixer channel` },
    ],
    requiresConfirmation: false,
  }
}

function isAddCommand(text: string): boolean {
  return /\b(add|throw|grab|drop|create|insert|put)\b/.test(text)
}

function needsAnswer(
  command: string,
  question: string,
  target: PlanTarget = { startBar: 0, endBar: 0, confidence: 0 },
): Plan {
  return {
    planId: planId("clarify", target),
    command,
    intent: "add_808",
    interpretedIntent: "Add an 808, but the target section is not settled yet",
    target,
    actions: [],
    summary: question,
    safety: "creates_only",
    verification: [],
    requiresConfirmation: true,
    clarification: question,
  }
}

function previewOnly(command: string, session: SessionReport): Plan {
  const busiest = [...session.sections].sort((a, b) => b.density - a.density)[0]
  return {
    planId: planId("preview", { startBar: 0, endBar: 0, confidence: 0 }),
    command,
    intent: "preview_only",
    interpretedIntent: "Advice only - no executor for this command yet",
    target: { startBar: 0, endBar: 0, confidence: 0 },
    actions: [],
    summary:
      busiest === undefined
        ? "I can talk about this, but I cannot make the change yet."
        : `The busiest stretch is bars ${busiest.startBar}-${busiest.endBar} with ` +
          `${busiest.density} regions layered. I can advise on thinning it out, but I ` +
          `cannot make that change yet.`,
    safety: "creates_only",
    verification: [],
    requiresConfirmation: true,
  }
}

function unknownCommand(command: string): Plan {
  return {
    planId: planId("unknown", { startBar: 0, endBar: 0, confidence: 0 }),
    command,
    intent: "unknown",
    interpretedIntent: "Command not recognised",
    target: { startBar: 0, endBar: 0, confidence: 0 },
    actions: [],
    summary:
      `I cannot do "${command}" yet. Try commands like:\n` +
      `• "add trap drums for 32 bars at bar 1"\n` +
      `• "add a melody in C major for 16 bars"\n` +
      `• "add jazzy chords in Am from bars 1-32"\n` +
      `• "add a dark 808 under the drop"`,
    safety: "creates_only",
    verification: [],
    requiresConfirmation: true,
  }
}

function mentions808(text: string): boolean {
  return /\b808\b|\bsub\s*bass\b/.test(text)
}

function isPreviewCommand(text: string): boolean {
  return /\b(less crowded|thin out|busy|crowded|declutter|too much)\b/.test(text)
}

/** "at bar 33", "bar 33", "from bar 33". */
function explicitBarFrom(text: string): number | undefined {
  const match = /\bbar\s+(\d{1,4})\b/.exec(text)
  if (match === null) return undefined
  const bar = Number(match[1])
  return Number.isInteger(bar) && bar >= 1 ? bar : undefined
}

function toneFrom(text: string): ToneHint {
  if (/\b(dark|deep|heavy|sub|moody)\b/.test(text)) return "dark"
  if (/\b(bright|light|clean|punchy)\b/.test(text)) return "bright"
  return "neutral"
}

/**
 * Stable id from the intent and target, so replanning the same command against
 * the same session yields the same plan id and `apply --plan <id>` is
 * unambiguous. Not random on purpose.
 */
function planId(kind: string, target: PlanTarget): string {
  return `${kind}-${target.startBar}-${target.endBar}`
}

// ============================================================================
// Melody and Chord Support (issue #29)
// ============================================================================

function mentionsMelody(text: string): boolean {
  return /\b(melody|melodic|lead|riff|hook|synth\s*lead)\b/.test(text)
}

function mentionsChords(text: string): boolean {
  return /\b(chord|chords|harmony|harmonic|progression|pads?)\b/.test(text)
}

/**
 * Extract key from command text, or return undefined to trigger a question.
 *
 * Accepts: "in C major", "in Am", "key of F#", "in D minor"
 */
function extractKey(text: string): KeySignature | undefined {
  const keyMatch = /(?:in|key\s+of)\s+([A-G][#b]?\s*(?:m(?:in(?:or)?)?|maj(?:or)?)?)/i.exec(text)
  if (keyMatch !== null) {
    const parsed = parseKey(keyMatch[1]!)
    if (parsed !== undefined) return parsed
  }
  return undefined
}

/**
 * Extract progression style from command text.
 */
function extractProgression(text: string): ProgressionName {
  if (/\b(jazz|jazzy|smooth)\b/.test(text)) return "jazz"
  if (/\b(blues|bluesy)\b/.test(text)) return "blues"
  if (/\b(sad|melancholic|emotional)\b/.test(text)) return "sad"
  if (/\b(rock|powerful|driving)\b/.test(text)) return "rock"
  if (/\b(50s|fifties|oldies|doo-?wop)\b/.test(text)) return "fifties"
  return "pop" // default
}

/**
 * Extract custom Roman numeral progression from command text.
 *
 * Accepts: "I-IV-V-I chords", "add vi-IV-I-V"
 */
function extractCustomProgression(text: string): number[] | undefined {
  // Look for Roman numerals pattern
  const romanMatch = /\b([IiVv]+(?:[-\s,][IiVv]+)+)\b/.exec(text)
  if (romanMatch !== null) {
    return parseRomanNumerals(romanMatch[1]!)
  }
  return undefined
}

/**
 * Extract chord voicing style from command text.
 */
function extractVoicing(text: string): ChordVoicing {
  if (/\b(arp(?:eggiat)?ed?|rolling)\b/.test(text)) return "arpeggiated"
  if (/\b(broken|spread)\b/.test(text)) return "broken"
  return "block" // default for pads
}

/**
 * Extract melodic pattern from command text.
 */
function extractMelodicPattern(text: string): MelodicPattern {
  if (/\b(ascending|rise|rising|up)\b/.test(text)) return "ascending"
  if (/\b(descending|fall|falling|down)\b/.test(text)) return "descending"
  if (/\b(random|chaotic)\b/.test(text)) return "random"
  return "wave" // default
}

/**
 * Extract section name from command text.
 */
type SectionLabel = "intro" | "build" | "drop" | "breakdown" | "outro"

function extractSectionName(text: string): SectionLabel | undefined {
  if (/\b(intro|introduction)\b/.test(text)) return "intro"
  if (/\b(build(?:up)?|rise)\b/.test(text)) return "build"
  if (/\b(drop|chorus|peak)\b/.test(text)) return "drop"
  if (/\b(break(?:down)?)\b/.test(text)) return "breakdown"
  if (/\b(outro|ending)\b/.test(text)) return "outro"
  return undefined
}

/**
 * Resolve the target section from command text and session analysis.
 */
interface ResolvedTarget extends PlanTarget {
  requiresConfirmation?: boolean
  clarification?: string
}

function resolveTarget(text: string, session: SessionReport): ResolvedTarget {
  const explicitBar = explicitBarFrom(text)
  const explicitDuration = parseExplicitDuration(text)
  const barRange = parseBarRange(text)

  // Check for explicit bar range first (e.g., "bars 1-32")
  if (barRange !== undefined) {
    return {
      startBar: barRange.startBar,
      endBar: barRange.endBar,
      confidence: 1,
    }
  }

  if (explicitBar !== undefined) {
    if (session.lengthBars > 0 && explicitBar > session.lengthBars) {
      return {
        startBar: explicitBar,
        endBar: explicitBar,
        confidence: 0,
        requiresConfirmation: true,
        clarification: `Bar ${explicitBar} is beyond the end of this project (${session.lengthBars} bars). Which bar did you mean?`,
      }
    }
    // Use explicit duration if specified, otherwise default
    const duration = explicitDuration ?? DEFAULT_BARS
    return {
      startBar: explicitBar,
      endBar: Math.min(
        explicitBar + duration - 1,
        session.lengthBars > 0 ? session.lengthBars : explicitBar + duration - 1,
      ),
      confidence: 1,
    }
  }

  // If only duration specified without bar, start at bar 1
  if (explicitDuration !== undefined) {
    return {
      startBar: 1,
      endBar: explicitDuration,
      confidence: 1,
    }
  }

  // Check for section names in command
  const sectionName = extractSectionName(text)
  if (sectionName !== undefined) {
    const section = session.sections.find((s) => s.label === sectionName)
    if (section !== undefined) {
      return {
        section: section.label,
        startBar: section.startBar,
        endBar: section.endBar,
        confidence: section.confidence,
        requiresConfirmation: section.confidence < CONFIDENCE_THRESHOLD,
        clarification:
          section.confidence < CONFIDENCE_THRESHOLD
            ? `I think the ${section.label} is bars ${section.startBar}-${section.endBar}, but I am not confident. Should I use those bars?`
            : undefined,
      }
    }
  }

  // Fall back to drop detection
  const drop = session.drop
  if (drop === undefined) {
    return {
      startBar: 0,
      endBar: 0,
      confidence: 0,
      requiresConfirmation: true,
      clarification: "I could not find a clear section. Which bars should I work with?",
    }
  }

  return {
    section: drop.label,
    startBar: drop.startBar,
    endBar: drop.endBar,
    confidence: drop.confidence,
    requiresConfirmation: drop.confidence < CONFIDENCE_THRESHOLD,
    clarification:
      drop.confidence < CONFIDENCE_THRESHOLD
        ? `I think the ${drop.label} is bars ${drop.startBar}-${drop.endBar}, but I am not confident. Should I use those bars?`
        : undefined,
  }
}

/**
 * Build a melody plan.
 */
function buildMelodyPlan(command: string, text: string, session: SessionReport): Plan {
  const key = extractKey(text)
  const tone = toneFrom(text)
  const target = resolveTarget(text, session)
  const pattern = extractMelodicPattern(text)

  // If no key specified, ask the user
  if (key === undefined) {
    return needsAnswerForMelody(command, target)
  }

  // If target is uncertain, ask for confirmation
  if (target.requiresConfirmation) {
    return {
      planId: planId("clarify_melody", target),
      command,
      intent: "add_melody",
      interpretedIntent: `Add a melody in ${key.root} ${key.mode}, but the target section is not settled yet`,
      target,
      actions: [],
      summary: target.clarification!,
      safety: "creates_only",
      verification: [],
      requiresConfirmation: true,
      clarification: target.clarification,
      harmony: { key: `${key.root} ${key.mode}` },
    }
  }

  const durationBars = Math.max(1, target.endBar - target.startBar + 1)
  // Get scale notes spanning 2 octaves for melodic variety
  const pitches = getScaleNotes(key.rootPitch, key.scale, 2)

  // Select device based on tone
  const deviceType = tone === "dark" ? "pulverisateur" : "heisenberg"
  const toneLabel = tone === "neutral" ? "" : `${tone.charAt(0).toUpperCase()}${tone.slice(1)} `
  const displayName = `Agent ${toneLabel}Lead`

  const actions: PlanAction[] = [
    { type: "create_source", deviceType, displayName, tone },
    { type: "route_to_mixer", deviceType },
    { type: "create_note_track", displayName },
    { type: "create_note_region", startBar: target.startBar, durationBars },
    {
      type: "create_melody_notes",
      pitches,
      pattern,
      velocity: 0.75,
      noteDuration: "eighth",
    },
  ]

  const where =
    target.section !== undefined
      ? `the ${target.section} (bars ${target.startBar}-${target.endBar})`
      : `bars ${target.startBar}-${target.endBar}`

  return {
    planId: planId("add_melody", target),
    command,
    intent: "add_melody",
    interpretedIntent: `Add a ${tone === "neutral" ? "" : tone + " "}melody in ${key.root} ${key.mode} over ${where}`,
    target,
    actions,
    summary:
      `I will add a ${deviceType} synth lead playing a ${pattern} melodic pattern in ${key.root} ${key.mode} ` +
      `across bars ${target.startBar}-${target.endBar}, routed to the mixer.`,
    safety: "creates_only",
    verification: [
      { kind: "entities_exist", description: "synth device, track, region, and notes" },
      { kind: "entity_count", entityType: "note", atLeast: 4 },
      { kind: "routed_to_mixer", description: "the lead synth reaches a mixer channel" },
    ],
    requiresConfirmation: false,
    harmony: { key: `${key.root} ${key.mode}`, detected: false },
  }
}

/**
 * Ask the user for a key when creating a melody.
 */
function needsAnswerForMelody(command: string, target: ResolvedTarget): Plan {
  return {
    planId: planId("clarify_melody", target),
    command,
    intent: "add_melody",
    interpretedIntent: "Add a melody, but the key is not specified yet",
    target,
    actions: [],
    summary: "What key would you like the melody in? (e.g., C major, Am, F# minor)",
    safety: "creates_only",
    verification: [],
    requiresConfirmation: true,
    clarification: "What key would you like the melody in? (e.g., C major, Am, F# minor)",
  }
}

/**
 * Build a chord progression plan.
 */
function buildChordPlan(command: string, text: string, session: SessionReport): Plan {
  const key = extractKey(text)
  const tone = toneFrom(text)
  const target = resolveTarget(text, session)
  const voicing = extractVoicing(text)

  // If no key specified, ask the user
  if (key === undefined) {
    return needsAnswerForChords(command, target)
  }

  // If target is uncertain, ask for confirmation
  if (target.requiresConfirmation) {
    return {
      planId: planId("clarify_chords", target),
      command,
      intent: "add_chords",
      interpretedIntent: `Add chords in ${key.root} ${key.mode}, but the target section is not settled yet`,
      target,
      actions: [],
      summary: target.clarification!,
      safety: "creates_only",
      verification: [],
      requiresConfirmation: true,
      clarification: target.clarification,
      harmony: { key: `${key.root} ${key.mode}` },
    }
  }

  const durationBars = Math.max(1, target.endBar - target.startBar + 1)

  // Check for custom Roman numeral progression first
  const customProgression = extractCustomProgression(text)
  let progressionDegrees: readonly number[]
  let progressionName: ProgressionName | "custom"
  let progressionRoman: string

  if (customProgression !== undefined) {
    progressionDegrees = customProgression
    progressionName = "custom"
    progressionRoman = customProgression
      .map((d) => {
        const romanMap: Record<number, string> =
          key.mode === "major"
            ? { 1: "I", 2: "ii", 3: "iii", 4: "IV", 5: "V", 6: "vi", 7: "vii°" }
            : { 1: "i", 2: "ii°", 3: "III", 4: "iv", 5: "v", 6: "VI", 7: "VII" }
        return romanMap[d] ?? String(d)
      })
      .join("-")
  } else {
    progressionName = extractProgression(text)
    progressionDegrees = PROGRESSIONS[progressionName]
    progressionRoman = getProgressionRoman(progressionName, key.mode)
  }

  // Build chord notes - use C3 octave (48) for pad-like sounds
  const chords = buildChordProgression(CHORD_OCTAVE, key.scale, key.mode, progressionDegrees)

  // Select device - pads work best on space; bright tones on heisenberg
  const deviceType = tone === "bright" ? "heisenberg" : "space"
  const displayName = `Agent ${progressionName === "custom" ? "Custom" : progressionName.charAt(0).toUpperCase() + progressionName.slice(1)} Chords`

  const actions: PlanAction[] = [
    { type: "create_source", deviceType, displayName, tone },
    { type: "route_to_mixer", deviceType },
    { type: "create_note_track", displayName },
    { type: "create_note_region", startBar: target.startBar, durationBars },
    {
      type: "create_chord_notes",
      chords,
      voicing,
      velocity: 0.7,
      chordsPerBar: 1, // One chord per bar by default
    },
  ]

  const where =
    target.section !== undefined
      ? `the ${target.section} (bars ${target.startBar}-${target.endBar})`
      : `bars ${target.startBar}-${target.endBar}`

  const voicingDesc = voicing === "block" ? "sustained pads" : voicing === "arpeggiated" ? "arpeggiated" : "broken"

  return {
    planId: planId("add_chords", target),
    command,
    intent: "add_chords",
    interpretedIntent: `Add a ${progressionName} chord progression (${progressionRoman}) in ${key.root} ${key.mode} over ${where}`,
    target,
    actions,
    summary:
      `I will add a ${deviceType} playing a ${progressionName} progression (${progressionRoman}) in ${key.root} ${key.mode} ` +
      `across bars ${target.startBar}-${target.endBar}. The chords will be ${voicingDesc}.`,
    safety: "creates_only",
    verification: [
      { kind: "entities_exist", description: "synth device, track, region, and chord notes" },
      { kind: "entity_count", entityType: "note", atLeast: chords.length * chords[0]!.length },
      { kind: "routed_to_mixer", description: "the chord synth reaches a mixer channel" },
    ],
    requiresConfirmation: false,
    harmony: {
      key: `${key.root} ${key.mode}`,
      progression: progressionRoman,
      detected: false,
    },
  }
}

/**
 * Ask the user for a key when creating chords.
 */
function needsAnswerForChords(command: string, target: ResolvedTarget): Plan {
  return {
    planId: planId("clarify_chords", target),
    command,
    intent: "add_chords",
    interpretedIntent: "Add chords, but the key is not specified yet",
    target,
    actions: [],
    summary: "What key would you like the chords in? (e.g., C major, Am, F# minor)",
    safety: "creates_only",
    verification: [],
    requiresConfirmation: true,
    clarification: "What key would you like the chords in? (e.g., C major, Am, F# minor)",
  }
}

// ============================================================================
// Drum Support
// ============================================================================

function mentionsDrums(text: string): boolean {
  // Don't match "beatbox 8" or "beatbox 9" - those are device adds, not drum patterns
  if (/\bbeatbox\s*\d\b/.test(text)) return false
  // Match drum-related keywords
  return /\b(drums?|beat|kick|snare|hi[\s-]?hat|rhythm|percussion)\b/.test(text)
}

/**
 * Extract drum pattern name or genre from command text.
 */
function extractDrumPattern(text: string): DrumPattern | undefined {
  // Check for specific pattern names
  const patternMatches = [
    /\b(trap|minimal\s*trap)\b/,
    /\b(house|deep\s*house|four[\s-]?on[\s-]?the[\s-]?floor)\b/,
    /\b(hip[\s-]?hop|boom\s*bap)\b/,
    /\b(lo[\s-]?fi|chill(?:hop)?)\b/,
    /\b(rock|driving)\b/,
    /\b(pop)\b/,
    /\b(drill|uk\s*drill)\b/,
    /\b(dnb|drum\s*(and|&|n)\s*bass)\b/,
    /\b(techno)\b/,
  ]

  for (const regex of patternMatches) {
    const match = regex.exec(text)
    if (match !== null) {
      const pattern = getPattern(match[1]!)
      if (pattern !== undefined) return pattern
    }
  }

  // Check for genre hint
  const genre = parseGenre(text)
  if (genre !== undefined) {
    return getPatternForGenre(genre)
  }

  return undefined
}

/**
 * Build a drum pattern plan.
 */
function buildDrumPlan(command: string, text: string, session: SessionReport): Plan {
  const target = resolveTarget(text, session)
  const pattern = extractDrumPattern(text)

  // If target is uncertain, ask for confirmation
  if (target.requiresConfirmation) {
    return {
      planId: planId("clarify_drums", target),
      command,
      intent: "add_drums",
      interpretedIntent: "Add drums, but the target section is not settled yet",
      target,
      actions: [],
      summary: target.clarification!,
      safety: "creates_only",
      verification: [],
      requiresConfirmation: true,
      clarification: target.clarification,
    }
  }

  // Use basic pattern if none specified
  const drumPattern = pattern ?? getPattern("basic")!
  const durationBars = Math.max(1, target.endBar - target.startBar + 1)

  // Convert pattern hits to the action format
  const hits = drumPattern.hits.map((hit) => ({
    pitch: DRUM_NOTES[hit.piece],
    position: hit.position,
    velocity: hit.velocity,
  }))

  const actions: PlanAction[] = [
    { type: "create_source", deviceType: "beatbox9", displayName: `Agent ${drumPattern.name}` },
    { type: "route_to_mixer", deviceType: "beatbox9" },
    { type: "create_note_track", displayName: `Agent ${drumPattern.name}` },
    { type: "create_note_region", startBar: target.startBar, durationBars },
    {
      type: "create_drum_notes",
      hits,
      patternName: drumPattern.name,
    },
  ]

  const where =
    target.section !== undefined
      ? `the ${target.section} (bars ${target.startBar}-${target.endBar})`
      : `bars ${target.startBar}-${target.endBar}`

  return {
    planId: planId("add_drums", target),
    command,
    intent: "add_drums",
    interpretedIntent: `Add a ${drumPattern.name} drum pattern over ${where}`,
    target,
    actions,
    summary:
      `I will add a Beatbox 9 playing a ${drumPattern.name} pattern (${drumPattern.genre}) ` +
      `across bars ${target.startBar}-${target.endBar}, routed to the mixer.`,
    safety: "creates_only",
    verification: [
      { kind: "entities_exist", description: "drum machine, track, region, and notes" },
      { kind: "entity_count", entityType: "note", atLeast: hits.length },
      { kind: "routed_to_mixer", description: "the drum machine reaches a mixer channel" },
    ],
    requiresConfirmation: false,
  }
}

// ============================================================================
// Copy/Extend Support
// ============================================================================

function mentionsCopy(text: string): boolean {
  return /\b(copy|duplicate|repeat|clone)\b/.test(text) && !mentionsExtend(text)
}

function mentionsExtend(text: string): boolean {
  return /\b(extend|lengthen|continue|more\s+bars)\b/.test(text)
}

/**
 * Extract the content type being referenced (drums, 808, melody, chords).
 */
function extractContentType(text: string): ContentType | undefined {
  if (/\b(drums?|beat|rhythm|percussion)\b/.test(text)) return "drums"
  if (/\b(808|bass(?:line)?|sub)\b/.test(text)) return "808"
  if (/\b(melody|lead|riff|hook)\b/.test(text)) return "melody"
  if (/\b(chords?|harmony|progression|pads?)\b/.test(text)) return "chords"
  return undefined
}

/**
 * Extract "to bar N" or "at bar N" target from command.
 */
function extractCopyTarget(text: string): number | undefined {
  const match = /(?:to|at)\s+bar\s+(\d{1,4})\b/.exec(text)
  if (match !== null) {
    const bar = Number(match[1])
    return Number.isInteger(bar) && bar >= 1 ? bar : undefined
  }
  return undefined
}

/**
 * Extract "for N bars" or "N more bars" from extend command.
 */
function extractExtendBars(text: string): number | undefined {
  const match = /(?:for\s+)?(\d{1,3})\s*(?:more\s+)?bars?\b/.exec(text)
  if (match !== null) {
    const bars = Number(match[1])
    return Number.isInteger(bars) && bars >= 1 ? bars : undefined
  }
  return undefined
}

/**
 * Build a copy plan - duplicate content to a new location.
 */
function buildCopyPlan(command: string, text: string, session: SessionReport): Plan {
  const contentType = extractContentType(text)
  const targetBar = extractCopyTarget(text)

  // Need to know what content type to copy
  if (contentType === undefined) {
    return {
      planId: "clarify_copy",
      command,
      intent: "copy_content",
      interpretedIntent: "Copy content, but the content type is not clear",
      target: { startBar: 0, endBar: 0, confidence: 0 },
      actions: [],
      summary: "What would you like to copy? (e.g., drums, 808, melody, chords)",
      safety: "creates_only",
      verification: [],
      requiresConfirmation: true,
      clarification: "What would you like to copy? (drums, 808, melody, or chords)",
    }
  }

  // Need to know where to copy to
  if (targetBar === undefined) {
    return {
      planId: `clarify_copy_${contentType}`,
      command,
      intent: "copy_content",
      interpretedIntent: `Copy the ${contentType}, but the target bar is not specified`,
      target: { startBar: 0, endBar: 0, confidence: 0 },
      actions: [],
      summary: `Which bar should I copy the ${contentType} to?`,
      safety: "creates_only",
      verification: [],
      requiresConfirmation: true,
      clarification: `Which bar should I copy the ${contentType} to? (e.g., "to bar 33")`,
    }
  }

  // Get the source section - look for existing content of that type
  const source = resolveSourceSection(text, session, contentType)
  if (source.requiresConfirmation) {
    return {
      planId: `clarify_copy_source_${contentType}`,
      command,
      intent: "copy_content",
      interpretedIntent: `Copy the ${contentType} to bar ${targetBar}, but the source is unclear`,
      target: { startBar: targetBar, endBar: targetBar + 15, confidence: 0 },
      actions: [],
      summary: source.clarification!,
      safety: "creates_only",
      verification: [],
      requiresConfirmation: true,
      clarification: source.clarification,
    }
  }

  const durationBars = source.endBar - source.startBar + 1
  const target: PlanTarget = {
    startBar: targetBar,
    endBar: targetBar + durationBars - 1,
    confidence: 1,
  }

  // Build appropriate actions based on content type
  const actions = buildCopyActions(contentType, target, text)

  return {
    planId: planId("copy_content", target),
    command,
    intent: "copy_content",
    interpretedIntent: `Copy the ${contentType} from bars ${source.startBar}-${source.endBar} to bar ${targetBar}`,
    target,
    actions,
    summary:
      `I will create new ${contentType} content at bar ${targetBar}, matching the style from ` +
      `bars ${source.startBar}-${source.endBar}. This creates new content (not linked to the original).`,
    safety: "creates_only",
    verification: [
      { kind: "entities_exist", description: "device, track, region, and notes" },
      { kind: "entity_count", entityType: "note", atLeast: 1 },
      { kind: "routed_to_mixer", description: "the device reaches a mixer channel" },
    ],
    requiresConfirmation: false,
  }
}

/**
 * Build an extend plan - add more bars to existing content.
 */
function buildExtendPlan(command: string, text: string, session: SessionReport): Plan {
  const contentType = extractContentType(text)
  const additionalBars = extractExtendBars(text)

  // Need to know what content type to extend
  if (contentType === undefined) {
    return {
      planId: "clarify_extend",
      command,
      intent: "extend_content",
      interpretedIntent: "Extend content, but the content type is not clear",
      target: { startBar: 0, endBar: 0, confidence: 0 },
      actions: [],
      summary: "What would you like to extend? (e.g., drums, 808, melody, chords)",
      safety: "creates_only",
      verification: [],
      requiresConfirmation: true,
      clarification: "What would you like to extend? (drums, 808, melody, or chords)",
    }
  }

  // Need to know how many bars to add
  if (additionalBars === undefined) {
    return {
      planId: `clarify_extend_${contentType}`,
      command,
      intent: "extend_content",
      interpretedIntent: `Extend the ${contentType}, but the number of bars is not specified`,
      target: { startBar: 0, endBar: 0, confidence: 0 },
      actions: [],
      summary: `How many bars should I extend the ${contentType} by?`,
      safety: "creates_only",
      verification: [],
      requiresConfirmation: true,
      clarification: `How many bars should I extend the ${contentType} by? (e.g., "for 16 bars")`,
    }
  }

  // Get the source section to know where the extension should start
  const source = resolveSourceSection(text, session, contentType)
  if (source.requiresConfirmation) {
    return {
      planId: `clarify_extend_source_${contentType}`,
      command,
      intent: "extend_content",
      interpretedIntent: `Extend the ${contentType} by ${additionalBars} bars, but the source is unclear`,
      target: { startBar: 0, endBar: 0, confidence: 0 },
      actions: [],
      summary: source.clarification!,
      safety: "creates_only",
      verification: [],
      requiresConfirmation: true,
      clarification: source.clarification,
    }
  }

  // Extension starts right after the source ends
  const target: PlanTarget = {
    startBar: source.endBar + 1,
    endBar: source.endBar + additionalBars,
    confidence: 1,
  }

  // Build appropriate actions based on content type
  const actions = buildCopyActions(contentType, target, text)

  return {
    planId: planId("extend_content", target),
    command,
    intent: "extend_content",
    interpretedIntent: `Extend the ${contentType} by ${additionalBars} bars starting at bar ${target.startBar}`,
    target,
    actions,
    summary:
      `I will extend the ${contentType} by adding ${additionalBars} more bars starting at bar ${target.startBar}. ` +
      `This creates new content continuing from bar ${source.endBar}.`,
    safety: "creates_only",
    verification: [
      { kind: "entities_exist", description: "device, track, region, and notes" },
      { kind: "entity_count", entityType: "note", atLeast: 1 },
      { kind: "routed_to_mixer", description: "the device reaches a mixer channel" },
    ],
    requiresConfirmation: false,
  }
}

/**
 * Resolve the source section for copy/extend operations.
 */
interface ResolvedSource extends PlanTarget {
  requiresConfirmation?: boolean
  clarification?: string
}

function resolveSourceSection(
  text: string,
  session: SessionReport,
  contentType: ContentType,
): ResolvedSource {
  // Check for explicit "from bars X-Y" or "from bar X"
  const barRange = parseBarRange(text)
  if (barRange !== undefined) {
    return {
      startBar: barRange.startBar,
      endBar: barRange.endBar,
      confidence: 1,
    }
  }

  const explicitBar = explicitBarFrom(text)
  if (explicitBar !== undefined) {
    return {
      startBar: explicitBar,
      endBar: explicitBar + DEFAULT_BARS - 1,
      confidence: 1,
    }
  }

  // Check for section names like "the drop", "the verse"
  const sectionName = extractSectionName(text)
  if (sectionName !== undefined) {
    const section = session.sections.find((s) => s.label === sectionName)
    if (section !== undefined) {
      return {
        section: section.label,
        startBar: section.startBar,
        endBar: section.endBar,
        confidence: section.confidence,
      }
    }
  }

  // Try to find existing content of the specified type
  // For now, use the drop as the default source
  const drop = session.drop
  if (drop !== undefined && drop.confidence >= CONFIDENCE_THRESHOLD) {
    return {
      section: drop.label,
      startBar: drop.startBar,
      endBar: drop.endBar,
      confidence: drop.confidence,
    }
  }

  // No clear source - ask for clarification
  return {
    startBar: 0,
    endBar: 0,
    confidence: 0,
    requiresConfirmation: true,
    clarification: `I couldn't identify which ${contentType} to copy. Which bars contain the ${contentType}? (e.g., "from bars 1-16")`,
  }
}

/**
 * Build actions for copy/extend based on content type.
 */
function buildCopyActions(contentType: ContentType, target: PlanTarget, text: string): PlanAction[] {
  const durationBars = Math.max(1, target.endBar - target.startBar + 1)

  switch (contentType) {
    case "drums": {
      const pattern = extractDrumPattern(text) ?? getPattern("basic")!
      const hits = pattern.hits.map((hit) => ({
        pitch: DRUM_NOTES[hit.piece],
        position: hit.position,
        velocity: hit.velocity,
      }))
      return [
        { type: "create_source", deviceType: "beatbox9", displayName: `Agent ${pattern.name} (Copy)` },
        { type: "route_to_mixer", deviceType: "beatbox9" },
        { type: "create_note_track", displayName: `Agent ${pattern.name} (Copy)` },
        { type: "create_note_region", startBar: target.startBar, durationBars },
        { type: "create_drum_notes", hits, patternName: pattern.name },
      ]
    }
    case "808": {
      const tone = toneFrom(text)
      const pattern: NotePattern = tone === "dark" ? "sustained" : "downbeats"
      return [
        { type: "create_source", deviceType: "bassline", displayName: "Agent 808 (Copy)", tone },
        { type: "route_to_mixer", deviceType: "bassline" },
        { type: "create_note_track", displayName: "Agent 808 (Copy)" },
        { type: "create_note_region", startBar: target.startBar, durationBars },
        { type: "create_notes", pitch: PITCH_808, pattern, velocity: tone === "dark" ? 0.9 : 0.75 },
      ]
    }
    case "melody": {
      const key = extractKey(text) ?? DEFAULT_KEY
      const tone = toneFrom(text)
      const pattern = extractMelodicPattern(text)
      const pitches = getScaleNotes(key.rootPitch, key.scale, 2)
      const deviceType = tone === "dark" ? "pulverisateur" : "heisenberg"
      return [
        { type: "create_source", deviceType, displayName: "Agent Lead (Copy)", tone },
        { type: "route_to_mixer", deviceType },
        { type: "create_note_track", displayName: "Agent Lead (Copy)" },
        { type: "create_note_region", startBar: target.startBar, durationBars },
        { type: "create_melody_notes", pitches, pattern, velocity: 0.75, noteDuration: "eighth" },
      ]
    }
    case "chords": {
      const key = extractKey(text) ?? DEFAULT_KEY
      const tone = toneFrom(text)
      const voicing = extractVoicing(text)
      const progressionName = extractProgression(text)
      const progressionDegrees = PROGRESSIONS[progressionName]
      const chords = buildChordProgression(CHORD_OCTAVE, key.scale, key.mode, progressionDegrees)
      const deviceType = tone === "bright" ? "heisenberg" : "space"
      return [
        { type: "create_source", deviceType, displayName: "Agent Chords (Copy)", tone },
        { type: "route_to_mixer", deviceType },
        { type: "create_note_track", displayName: "Agent Chords (Copy)" },
        { type: "create_note_region", startBar: target.startBar, durationBars },
        { type: "create_chord_notes", chords, voicing, velocity: 0.7, chordsPerBar: 1 },
      ]
    }
  }
}

