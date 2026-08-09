/**
 * The plan contract (issue #20).
 *
 * This is the boundary between three consumers, which is why it is its own
 * file with no logic in it:
 *  - the frontend (#23/#24) renders a plan without knowing Nexus internals
 *  - `apply` (#18) replays it
 *  - `verify` (#22) checks the result against its `verification` entries
 *
 * Everything here is plain JSON: no entity handles, no SDK types, no
 * functions. A plan survives being written to disk and read back by a
 * different process, which is what makes dry-run, confirmation and replay
 * possible at all.
 */

export type PlanIntent = "add_808" | "preview_only" | "unknown"

/** How much damage a plan could do, for the confirmation gate in #22. */
export type SafetyLevel = "creates_only" | "modifies_existing" | "destructive"

export interface PlanTarget {
  /** Section label when the target came from detection; absent for explicit bars. */
  section?: string
  startBar: number
  endBar: number
  /** 0..1; exactly 1 when the user named the bar themselves. */
  confidence: number
}

/**
 * One low-level step. Deliberately declarative - the executor owns how each is
 * carried out, so the frontend can render a plan it cannot execute.
 */
export type PlanAction =
  | { type: "create_source"; deviceType: string; displayName: string; tone?: ToneHint }
  | { type: "route_to_mixer"; deviceType: string }
  | { type: "create_note_track"; displayName: string }
  | { type: "create_note_region"; startBar: number; durationBars: number }
  | { type: "create_notes"; pitch: number; pattern: NotePattern; velocity: number }

export type ToneHint = "dark" | "bright" | "neutral"
export type NotePattern = "downbeats" | "eighths" | "sustained"

/** A check `verify` runs after apply. Kept declarative so it is replayable. */
export type VerificationCheck =
  | { kind: "entities_exist"; description: string }
  | { kind: "entity_count"; entityType: string; atLeast: number }
  | { kind: "routed_to_mixer"; description: string }

export interface Plan {
  /** Stable id derived from the command and target - not random, so plans dedupe. */
  planId: string
  /** Exactly what the user typed. */
  command: string
  intent: PlanIntent
  /** Plain-language reading of the command, shown back for confirmation. */
  interpretedIntent: string
  target: PlanTarget
  actions: PlanAction[]
  /** One sentence for a human. The frontend shows this, not the actions. */
  summary: string
  safety: SafetyLevel
  verification: VerificationCheck[]
  requiresConfirmation: boolean
  /** The question to ask when the planner will not proceed unaided. */
  clarification?: string
}
