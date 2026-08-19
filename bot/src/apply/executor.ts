/**
 * Plan executor - "Add 808 to Drop" end to end (issue #21).
 *
 * Option B from the issue: a `bassline` source, its own note track ->
 * collection -> region -> notes, routed into a fresh mixer channel so it is
 * actually audible. Option A (sample-based) needs an uploaded 808 and gives up
 * pitch control, so this path is both lower risk and more useful.
 *
 * Two rules shape this file:
 *
 *  1. Everything that can be validated is validated BEFORE `doc.modify()`
 *     opens. A throw inside the transaction wedges the document permanently,
 *     so an unroutable device or an empty plan must fail while the document is
 *     still healthy.
 *  2. One transaction for the whole action. Either the 808 exists complete and
 *     routed, or none of it does - a half-applied action is the worst outcome
 *     for undo.
 */
import { Ticks } from "@audiotool/nexus/utils"
import type {
  ChordVoicing,
  MelodicPattern,
  NotePattern,
  NoteDuration,
  Plan,
  PlanAction,
} from "../plan/contract.js"
import { assertAudioRoutable } from "../routing.js"

export interface ExecuteResult {
  /** Every entity created, in creation order - the action log records this. */
  createdEntityIds: string[]
  /** What was created, for the human-facing report. */
  summary: string
}

/** Minimal document surface, so tests can pass an offline document. */
interface ExecutableDocument {
  queryEntities: {
    get: () => Array<{ id: string; entityType: string; fields?: unknown }>
    ofTypes: (...types: string[]) => { get: () => unknown[] }
  }
  modify: <T>(fn: (t: never) => T) => Promise<T>
}

export async function executePlan(
  doc: ExecutableDocument,
  plan: Plan,
): Promise<ExecuteResult> {
  // --- everything below here happens OUTSIDE the transaction, on purpose ----

  if (plan.actions.length === 0) {
    throw new Error(
      plan.clarification ??
        "This plan has no actions - it needs confirmation before anything can be applied.",
    )
  }

  const source = plan.actions.find((a) => a.type === "create_source")
  const region = plan.actions.find((a) => a.type === "create_note_region")
  const notes = plan.actions.find((a) => a.type === "create_notes")
  const melodyNotes = plan.actions.find((a) => a.type === "create_melody_notes") as
    | Extract<PlanAction, { type: "create_melody_notes" }>
    | undefined
  const chordNotes = plan.actions.find((a) => a.type === "create_chord_notes") as
    | Extract<PlanAction, { type: "create_chord_notes" }>
    | undefined
  const drumNotes = plan.actions.find((a) => a.type === "create_drum_notes") as
    | Extract<PlanAction, { type: "create_drum_notes" }>
    | undefined
  const track = plan.actions.find((a) => a.type === "create_note_track")

  if (source === undefined) {
    throw new Error("Plan has no device to create - refusing to apply.")
  }

  // Throws with an actionable message for machiniste-style socket differences
  // and for devices that cannot take a desktopAudioCable at all.
  const outputSocket = assertAudioRoutable(source.deviceType)

  // A device add (#28) creates routed gear and stops there. Anything that
  // writes to the timeline needs a region + some kind of notes.
  const hasAnyNotes = notes !== undefined || melodyNotes !== undefined || chordNotes !== undefined || drumNotes !== undefined
  const placesMaterial = region !== undefined || hasAnyNotes
  if (placesMaterial && (region === undefined || !hasAnyNotes)) {
    throw new Error(
      "Plan has a region without notes, or notes without a region - refusing to apply a partial action.",
    )
  }

  const ticksPerBar = ticksPerBarOf(doc)
  const startTicks = region === undefined ? 0 : (region.startBar - 1) * ticksPerBar
  const durationTicks = region === undefined ? 0 : region.durationBars * ticksPerBar

  // Determine which note generator to use
  type NotePosition = { pitch: number; positionTicks: number; durationTicks: number }
  let notePositions: NotePosition[] = []

  if (notes !== undefined && region !== undefined) {
    // Original 808-style: single pitch, pattern-based
    notePositions = patternPositions(notes.pattern, durationTicks, ticksPerBar).map((pos) => ({
      pitch: notes.pitch,
      ...pos,
    }))
  } else if (melodyNotes !== undefined && region !== undefined) {
    // Melody: multiple pitches, melodic pattern
    notePositions = melodyPositions(melodyNotes, durationTicks, ticksPerBar)
  } else if (chordNotes !== undefined && region !== undefined) {
    // Chords: multiple simultaneous pitches
    notePositions = chordPositions(chordNotes, durationTicks, ticksPerBar)
  } else if (drumNotes !== undefined && region !== undefined) {
    // Drums: pattern-based with multiple pieces
    notePositions = drumPositions(drumNotes, durationTicks, ticksPerBar)
  }

  const trackOrder = nextTrackOrder(doc)

  // --- one transaction, all or nothing -------------------------------------

  const createdEntityIds = await doc.modify((t) => {
    const tx = t as unknown as Transaction
    const created: string[] = []

    const device = tx.create(source.deviceType, {
      displayName: source.displayName,
    })
    created.push(device.id)

    const channel = tx.create("mixerChannel", {})
    created.push(channel.id)

    const cable = tx.create("desktopAudioCable", {
      fromSocket: device.fields[outputSocket]!.location,
      toSocket: channel.fields["audioInput"]!.location,
    })
    created.push(cable.id)

    // Device-only plans stop here: routed gear, nothing on the timeline.
    if (region !== undefined && notePositions.length > 0) {
      const noteTrack = tx.create("noteTrack", {
        player: device.location,
        // Unique across ALL track types: a duplicate throws, and per the wedge
        // footgun that would be unrecoverable.
        orderAmongTracks: trackOrder,
      })
      created.push(noteTrack.id)

      const collection = tx.create("noteCollection", {})
      created.push(collection.id)

      const noteRegion = tx.create("noteRegion", {
        collection: collection.location,
        track: noteTrack.location,
        region: {
          positionTicks: startTicks,
          durationTicks,
          displayName: track?.displayName ?? source.displayName,
        },
      })
      created.push(noteRegion.id)

      // Get velocity from whichever note action is active (drums use per-hit velocity)
      const velocity = notes?.velocity ?? melodyNotes?.velocity ?? chordNotes?.velocity ?? 0.75
      const usesPerHitVelocity = drumNotes !== undefined

      for (const position of notePositions) {
        const note = tx.create("note", {
          collection: collection.location,
          pitch: position.pitch,
          positionTicks: startTicks + position.positionTicks,
          durationTicks: position.durationTicks,
          // Drums use per-hit velocity from the pattern, others use global velocity
          velocity: usesPerHitVelocity && "velocity" in position ? (position as { velocity: number }).velocity : velocity,
        })
        created.push(note.id)
      }
    }

    return created
  })

  return {
    createdEntityIds,
    summary:
      region === undefined
        ? `Created a ${source.deviceType} ("${source.displayName}") routed to a new mixer channel.`
        : `Created a ${source.deviceType} ("${source.displayName}") routed to a new mixer ` +
          `channel, with ${notePositions.length} note(s) across bars ` +
          `${region.startBar}-${region.startBar + region.durationBars - 1}.`,
  }
}

/** The transaction surface used above; the SDK types are generic over 86 entity types. */
interface Transaction {
  create: (
    entityType: string,
    fields: Record<string, unknown>,
  ) => {
    id: string
    location: unknown
    fields: Record<string, { location: unknown } | undefined>
  }
}

/**
 * Note placement for a tone hint. "sustained" is one long note per bar, which
 * is what an 808 usually wants; "downbeats" and "eighths" are busier figures.
 */
function patternPositions(
  pattern: NotePattern,
  durationTicks: number,
  ticksPerBar: number,
): Array<{ positionTicks: number; durationTicks: number }> {
  const bars = Math.max(1, Math.round(durationTicks / ticksPerBar))
  const positions: Array<{ positionTicks: number; durationTicks: number }> = []

  for (let bar = 0; bar < bars; bar += 1) {
    const barStart = bar * ticksPerBar
    switch (pattern) {
      case "sustained":
        positions.push({ positionTicks: barStart, durationTicks: ticksPerBar })
        break
      case "downbeats":
        positions.push({ positionTicks: barStart, durationTicks: Ticks.Beat })
        positions.push({ positionTicks: barStart + Ticks.Beat * 2, durationTicks: Ticks.Beat })
        break
      case "eighths":
        for (let eighth = 0; eighth < 8; eighth += 1) {
          positions.push({
            positionTicks: barStart + (ticksPerBar / 8) * eighth,
            durationTicks: ticksPerBar / 8,
          })
        }
        break
    }
  }
  return positions
}

/** Ticks per bar at the project's real signature, not an assumed 4/4. */
function ticksPerBarOf(doc: ExecutableDocument): number {
  const config = doc.queryEntities.ofTypes("config").get()[0] as
    | { fields: { signatureNumerator: { value: number }; signatureDenominator: { value: number } } }
    | undefined
  if (config === undefined) return Ticks.SemiBreve
  return (
    (Ticks.SemiBreve * config.fields.signatureNumerator.value) /
    config.fields.signatureDenominator.value
  )
}

/**
 * One past the highest orderAmongTracks in the project.
 *
 * The ordering space is shared by note, audio, pattern and automation tracks,
 * so every track type has to be considered - a duplicate throws inside the
 * transaction, which is unrecoverable.
 */
function nextTrackOrder(doc: ExecutableDocument): number {
  let highest = 0
  for (const entity of doc.queryEntities.get()) {
    const order = (entity.fields as { orderAmongTracks?: { value?: unknown } } | undefined)
      ?.orderAmongTracks?.value
    if (typeof order === "number" && order > highest) highest = order
  }
  return highest + 1
}

// ============================================================================
// Melody and Chord Note Generation (issue #29)
// ============================================================================

type NotePositionWithPitch = { pitch: number; positionTicks: number; durationTicks: number }

/**
 * Generate note positions for a melody.
 *
 * Creates a sequence of notes using pitches from the scale, following
 * the specified melodic pattern (ascending, descending, wave, random).
 */
function melodyPositions(
  action: Extract<PlanAction, { type: "create_melody_notes" }>,
  durationTicks: number,
  ticksPerBar: number,
): NotePositionWithPitch[] {
  const positions: NotePositionWithPitch[] = []
  const { pitches, pattern, noteDuration } = action

  if (pitches.length === 0) return positions

  const noteDurationTicks: Record<NoteDuration, number> = {
    eighth: ticksPerBar / 8,
    quarter: ticksPerBar / 4,
    half: ticksPerBar / 2,
  }
  const durationTicksPerNote = noteDurationTicks[noteDuration]

  const bars = Math.max(1, Math.round(durationTicks / ticksPerBar))
  const notesPerBar = Math.round(ticksPerBar / durationTicksPerNote)
  let pitchIndex = 0
  let direction = 1 // For wave pattern: 1 = up, -1 = down

  for (let bar = 0; bar < bars; bar++) {
    for (let i = 0; i < notesPerBar; i++) {
      const positionTicks = bar * ticksPerBar + i * durationTicksPerNote

      // Select pitch based on pattern
      let pitch: number
      switch (pattern) {
        case "ascending":
          pitch = pitches[pitchIndex % pitches.length]!
          pitchIndex++
          break

        case "descending":
          pitch = pitches[(pitches.length - 1 - (pitchIndex % pitches.length)) % pitches.length]!
          pitchIndex++
          break

        case "wave":
          // Go up then down through the scale
          pitch = pitches[pitchIndex]!
          pitchIndex += direction
          if (pitchIndex >= pitches.length - 1) {
            direction = -1
            pitchIndex = pitches.length - 1
          } else if (pitchIndex <= 0) {
            direction = 1
            pitchIndex = 0
          }
          break

        case "random":
        default:
          pitch = pitches[Math.floor(Math.random() * pitches.length)]!
          break
      }

      positions.push({ pitch, positionTicks, durationTicks: durationTicksPerNote })
    }
  }

  return positions
}

/**
 * Generate note positions for a chord progression.
 *
 * Creates notes for each chord, with voicing determining how the chord
 * notes are timed relative to each other.
 */
function chordPositions(
  action: Extract<PlanAction, { type: "create_chord_notes" }>,
  durationTicks: number,
  ticksPerBar: number,
): NotePositionWithPitch[] {
  const positions: NotePositionWithPitch[] = []
  const { chords, voicing, chordsPerBar } = action

  if (chords.length === 0) return positions

  const bars = Math.max(1, Math.round(durationTicks / ticksPerBar))
  const ticksPerChord = ticksPerBar / chordsPerBar
  let chordIndex = 0

  for (let bar = 0; bar < bars; bar++) {
    for (let c = 0; c < chordsPerBar; c++) {
      const chord = chords[chordIndex % chords.length]!
      const chordStartTicks = bar * ticksPerBar + c * ticksPerChord

      switch (voicing) {
        case "block":
          // All notes start at the same time, full duration
          for (const pitch of chord) {
            positions.push({
              pitch,
              positionTicks: chordStartTicks,
              durationTicks: ticksPerChord,
            })
          }
          break

        case "arpeggiated":
          // Notes stagger through the duration
          const arpDuration = ticksPerChord / chord.length
          chord.forEach((pitch, i) => {
            positions.push({
              pitch,
              positionTicks: chordStartTicks + i * arpDuration,
              durationTicks: arpDuration,
            })
          })
          break

        case "broken":
          // Root-fifth-third pattern (more musical arpeggio)
          const brokenOrder = chord.length >= 3 ? [0, 2, 1, 2] : [0, 1, 0, 1]
          const brokenDuration = ticksPerChord / brokenOrder.length
          brokenOrder.forEach((noteIndex, i) => {
            if (noteIndex < chord.length) {
              positions.push({
                pitch: chord[noteIndex]!,
                positionTicks: chordStartTicks + i * brokenDuration,
                durationTicks: brokenDuration,
              })
            }
          })
          break
      }

      chordIndex++
    }
  }

  return positions
}

// ============================================================================
// Drum Note Generation
// ============================================================================

type DrumNotePosition = { pitch: number; positionTicks: number; durationTicks: number; velocity: number }

/**
 * Generate note positions for a drum pattern.
 *
 * Repeats the one-bar pattern across all bars in the region.
 * Each hit has its own velocity for dynamic patterns.
 */
function drumPositions(
  action: Extract<PlanAction, { type: "create_drum_notes" }>,
  durationTicks: number,
  ticksPerBar: number,
): DrumNotePosition[] {
  const positions: DrumNotePosition[] = []
  const { hits } = action

  if (hits.length === 0) return positions

  const bars = Math.max(1, Math.round(durationTicks / ticksPerBar))
  const sixteenthTicks = ticksPerBar / 16

  // Repeat the pattern for each bar
  for (let bar = 0; bar < bars; bar++) {
    const barStartTicks = bar * ticksPerBar

    for (const hit of hits) {
      positions.push({
        pitch: hit.pitch,
        positionTicks: barStartTicks + hit.position * sixteenthTicks,
        // Drums are typically short hits (1/16th note)
        durationTicks: sixteenthTicks,
        velocity: hit.velocity,
      })
    }
  }

  return positions
}
