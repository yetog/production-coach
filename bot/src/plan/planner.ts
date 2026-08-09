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
import type {
  NotePattern,
  Plan,
  PlanAction,
  PlanTarget,
  ToneHint,
  VerificationCheck,
} from "./contract.js"

/** Default span when the user names a bar but no length. */
const DEFAULT_BARS = 16

/** C1 - where an 808 sub actually lives. 60 is C4. */
const PITCH_808 = 24

export function planCommand(command: string, session: SessionReport): Plan {
  const text = command.toLowerCase().trim()

  if (!mentions808(text)) {
    return isPreviewCommand(text)
      ? previewOnly(command, session)
      : unknownCommand(command)
  }

  const explicitBar = explicitBarFrom(text)
  const tone = toneFrom(text)

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
    return build808Plan(command, tone, {
      startBar: explicitBar,
      endBar: Math.min(
        explicitBar + DEFAULT_BARS - 1,
        session.lengthBars > 0 ? session.lengthBars : explicitBar + DEFAULT_BARS - 1,
      ),
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
      `I cannot do "${command}" yet. Right now I can add an 808 to a section or a ` +
      `named bar - try "add a dark 808 under the drop".`,
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
