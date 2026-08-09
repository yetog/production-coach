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
import type { NotePattern, Plan, PlanAction } from "../plan/contract.js"
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
  const track = plan.actions.find((a) => a.type === "create_note_track")

  if (source === undefined || region === undefined || notes === undefined) {
    throw new Error(
      "Plan is missing a source, a region or notes - refusing to apply a partial 808.",
    )
  }

  // Throws with an actionable message for machiniste-style socket differences
  // and for devices that cannot take a desktopAudioCable at all.
  const outputSocket = assertAudioRoutable(source.deviceType)

  const ticksPerBar = ticksPerBarOf(doc)
  const startTicks = (region.startBar - 1) * ticksPerBar
  const durationTicks = region.durationBars * ticksPerBar
  const notePositions = patternPositions(notes.pattern, durationTicks, ticksPerBar)
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
        displayName: track?.displayName ?? "Agent 808",
      },
    })
    created.push(noteRegion.id)

    for (const position of notePositions) {
      const note = tx.create("note", {
        collection: collection.location,
        pitch: notes.pitch,
        positionTicks: startTicks + position.positionTicks,
        durationTicks: position.durationTicks,
        velocity: notes.velocity,
      })
      created.push(note.id)
    }

    return created
  })

  return {
    createdEntityIds,
    summary:
      `Created a ${source.deviceType} ("${source.displayName}") routed to a new mixer ` +
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
