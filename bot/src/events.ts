/**
 * PUSH half of the read layer (issue #13).
 *
 * Subscribes to NEXUS create/update/remove events and emits normalized
 * CoachEvents to a sink. Strictly read-only: nothing in here ever opens a
 * transaction.
 *
 * Register before `start()` so the initial sync replay flows through the same
 * pipeline; events observed before `isLive()` flips are marked live: false.
 */
import type { NexusEntity } from "@audiotool/nexus/document"
import type { Terminable } from "@audiotool/nexus/utils"
import { CABLE_TYPES, REGION_TYPES, TRACK_TYPES, isDeviceType } from "./devices.js"
import {
  displayNameOf,
  normalizeCable,
  normalizeDevice,
  normalizeNote,
  normalizeRegion,
} from "./normalize.js"
import type { ReadableDocument } from "./readonly.js"
import type { CoachEvent, CoachEventKind } from "./types.js"

export type EventSink = (event: CoachEvent) => void

const REGION_TYPE_SET: ReadonlySet<string> = new Set(REGION_TYPES)
const TRACK_TYPE_SET: ReadonlySet<string> = new Set(TRACK_TYPES)
const CABLE_TYPE_SET: ReadonlySet<string> = new Set(CABLE_TYPES)

/**
 * Subscribe the normalized event pipeline to a document.
 *
 * @param doc - online or offline document (only queryEntities/events are used)
 * @param sink - receives every normalized event
 * @param isLive - returns false during the initial sync replay
 * @returns Terminable that unsubscribes the pipeline
 */
export function subscribeCoachEvents(
  doc: ReadableDocument,
  sink: EventSink,
  isLive: () => boolean = () => true,
): Terminable {
  const emit = (
    kind: CoachEventKind,
    entity: NexusEntity,
    data: Record<string, unknown>,
  ): void => {
    sink({
      kind,
      tMs: performance.now(),
      live: isLive(),
      entityId: entity.id,
      entityType: entity.entityType,
      data,
    })
  }

  const noteFieldSubs = new Map<string, Terminable[]>()

  const handleNote = (note: NexusEntity<"note">): (() => void) => {
    emit("note-added", note, { ...normalizeNote(doc.queryEntities, note) })

    const changed = (field: string) => (value: number | boolean) => {
      emit("note-changed", note, {
        field,
        value,
        ...normalizeNote(doc.queryEntities, note),
      })
    }
    noteFieldSubs.set(note.id, [
      doc.events.onUpdate(note.fields.pitch, changed("pitch"), false),
      doc.events.onUpdate(note.fields.velocity, changed("velocity"), false),
      doc.events.onUpdate(note.fields.positionTicks, changed("positionTicks"), false),
      doc.events.onUpdate(note.fields.durationTicks, changed("durationTicks"), false),
    ])

    return () => {
      for (const sub of noteFieldSubs.get(note.id) ?? []) sub.terminate()
      noteFieldSubs.delete(note.id)
      emit("note-removed", note, { pitch: note.fields.pitch.value })
    }
  }

  const handleAutomationEvent = (event: NexusEntity<"automationEvent">): (() => void) => {
    const payload = () => ({
      positionTicks: event.fields.positionTicks.value,
      value: event.fields.value.value,
    })
    emit("automation-added", event, payload())
    const subs = [
      doc.events.onUpdate(event.fields.value, () => emit("automation-changed", event, payload()), false),
      doc.events.onUpdate(
        event.fields.positionTicks,
        () => emit("automation-changed", event, payload()),
        false,
      ),
    ]
    return () => {
      for (const sub of subs) sub.terminate()
      emit("automation-removed", event, {})
    }
  }

  const onCreate = doc.events.onCreate("*", (entity) => {
    const type = entity.entityType
    if (type === "note") return handleNote(entity as NexusEntity<"note">)
    if (type === "automationEvent") {
      return handleAutomationEvent(entity as NexusEntity<"automationEvent">)
    }
    if (isDeviceType(type)) {
      emit("device-added", entity, { ...normalizeDevice(entity) })
      return () => emit("device-removed", entity, { deviceType: type })
    }
    if (REGION_TYPE_SET.has(type)) {
      emit("region-added", entity, { ...normalizeRegion(entity) })
      return () => emit("region-removed", entity, { regionType: type })
    }
    if (TRACK_TYPE_SET.has(type)) {
      emit("track-added", entity, { trackType: type, displayName: displayNameOf(entity) })
      return () => emit("track-removed", entity, { trackType: type })
    }
    if (CABLE_TYPE_SET.has(type)) {
      emit("cable-added", entity, { ...normalizeCable(doc.queryEntities, entity) })
      return () => emit("cable-removed", entity, { cableType: type })
    }
    // Everything else (config, collections, patterns, samples, ...) is
    // intentionally not emitted; the query pipeline covers it on demand.
    return undefined
  })

  return {
    terminate: () => {
      onCreate.terminate()
      for (const subs of noteFieldSubs.values()) for (const sub of subs) sub.terminate()
      noteFieldSubs.clear()
    },
  }
}
