/**
 * Entity -> normalized data conversion for the read pipeline.
 *
 * All functions here only read field values; none of them touch transactions.
 */
import type { EntityQuery, NexusEntity } from "@audiotool/nexus/document"
import { Ticks } from "@audiotool/nexus/utils"
import { deviceCategory } from "./devices.js"
import type { CableData, DeviceData, NoteData, RegionData } from "./types.js"

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

/** MIDI pitch to name, 60 = C4. */
export function pitchName(midi: number): string {
  const clamped = Math.max(0, Math.min(127, Math.round(midi)))
  return `${NOTE_NAMES[clamped % 12]}${Math.floor(clamped / 12) - 1}`
}

/** Best-effort displayName for any entity; many device entities carry one. */
export function displayNameOf(entity: NexusEntity): string | undefined {
  const fields = entity.fields as Record<string, unknown>
  const field = fields["displayName"] as { value?: unknown } | undefined
  return typeof field?.value === "string" && field.value.length > 0 ? field.value : undefined
}

/**
 * Resolve which device plays the notes of a collection:
 * noteCollection <- noteRegion -> noteTrack -> player device.
 *
 * Best effort: during the initial sync replay a note can arrive before its
 * region/track exist, in which case device fields stay undefined.
 */
export function resolveCollectionDevice(
  query: EntityQuery,
  collectionId: string,
): { deviceId?: string; deviceType?: string; deviceName?: string } {
  const region = query.ofTypes("noteRegion").pointingTo.entities(collectionId).getOne()
  if (region === undefined) return {}
  const trackId = region.fields.track.value.entityId
  const track = query.ofTypes("noteTrack").getEntity(trackId)
  if (track === undefined) return {}
  const deviceId = track.fields.player.value.entityId
  const device = query.getEntity(deviceId)
  if (device === undefined) return { deviceId }
  return {
    deviceId,
    deviceType: device.entityType,
    deviceName: displayNameOf(device),
  }
}

export function normalizeNote(query: EntityQuery, note: NexusEntity<"note">): NoteData {
  const collectionId = note.fields.collection.value.entityId
  return {
    pitch: note.fields.pitch.value,
    pitchName: pitchName(note.fields.pitch.value),
    velocity: note.fields.velocity.value,
    positionTicks: note.fields.positionTicks.value,
    durationTicks: note.fields.durationTicks.value,
    positionBeats: note.fields.positionTicks.value / Ticks.Beat,
    durationBeats: note.fields.durationTicks.value / Ticks.Beat,
    collectionId,
    ...resolveCollectionDevice(query, collectionId),
  }
}

export function normalizeDevice(entity: NexusEntity): DeviceData {
  return {
    deviceType: entity.entityType,
    displayName: displayNameOf(entity),
    category: deviceCategory(entity.entityType),
  }
}

/**
 * Ticks per bar at the project's time signature (from the config entity);
 * falls back to 4/4 (= Ticks.SemiBreve) when no config exists yet.
 */
export function ticksPerBarOf(query: EntityQuery): number {
  const config = query.ofTypes("config").getOne()
  if (config === undefined) return Ticks.SemiBreve
  return (
    (Ticks.SemiBreve * config.fields.signatureNumerator.value) /
    config.fields.signatureDenominator.value
  )
}

/** Regions nest their timing in a `region` struct field (noteRegion/audioRegion/...). */
export function normalizeRegion(entity: NexusEntity, ticksPerBar: number = Ticks.SemiBreve): RegionData {
  const fields = entity.fields as Record<string, unknown>
  const regionStruct = fields["region"] as
    | { fields?: Record<string, { value?: unknown } | undefined> }
    | undefined
  const num = (name: string): number | undefined => {
    const value = regionStruct?.fields?.[name]?.value
    return typeof value === "number" ? value : undefined
  }
  const str = (name: string): string | undefined => {
    const value = regionStruct?.fields?.[name]?.value
    return typeof value === "string" && value.length > 0 ? value : undefined
  }
  const positionTicks = num("positionTicks")
  const durationTicks = num("durationTicks")
  return {
    regionType: entity.entityType as RegionData["regionType"],
    displayName: str("displayName"),
    positionTicks,
    durationTicks,
    positionBars: positionTicks === undefined ? undefined : positionTicks / ticksPerBar,
    durationBars: durationTicks === undefined ? undefined : durationTicks / ticksPerBar,
  }
}

/**
 * Resolve cable endpoints back to the devices whose sockets they connect.
 * Desktop cables name their endpoints fromSocket/toSocket; mixerSideChainCable
 * names them from/to.
 */
export function normalizeCable(query: EntityQuery, entity: NexusEntity): CableData {
  const fields = entity.fields as Record<string, { value?: { entityId?: string } } | undefined>
  const endpoint = (...fieldNames: string[]): { id?: string; type?: string } => {
    for (const name of fieldNames) {
      const entityId = fields[name]?.value?.entityId
      if (entityId !== undefined && entityId !== "") {
        const device = query.getEntity(entityId)
        return { id: entityId, type: device?.entityType }
      }
    }
    return {}
  }
  const from = endpoint("fromSocket", "from")
  const to = endpoint("toSocket", "to")
  return {
    cableType: entity.entityType as CableData["cableType"],
    fromDeviceId: from.id,
    fromDeviceType: from.type,
    toDeviceId: to.id,
    toDeviceType: to.type,
  }
}
