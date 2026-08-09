/**
 * Session analyzer (issue #19).
 *
 * Produces the JSON contract the planner (#20) consumes and the 808 action
 * (#21) places against: tempo, length, inventory, sections with confidence,
 * and risks. Read-only - it takes the query surface, never a writable document.
 *
 * Where it is uncertain it says so, via `clarification`, rather than returning
 * a confident guess. Placing an 808 in the wrong half of someone's track is a
 * worse outcome than asking which bar they meant.
 */
import { deviceCategory, isDeviceType } from "../devices.js"
import { displayNameOf, ticksPerBarOf } from "../normalize.js"
import type { ReadableDocument } from "../readonly.js"
import { audioOutputSocket } from "../routing.js"
import { detectSections, type RegionSpan, type Section, type SessionShape } from "./sections.js"

export interface SessionInventory {
  drums: number
  bass: number
  synths: number
  effects: number
  sequencers: number
  mixers: number
  routing: number
  other: number
}

export interface SessionReport {
  tempoBpm: number
  signature: string
  lengthBars: number
  shape: SessionShape
  inventory: SessionInventory
  sections: Section[]
  drop?: Section
  risks: string[]
  /** Present when the caller should ask the user instead of acting. */
  clarification?: string
}

const REGION_TYPES = ["noteRegion", "audioRegion", "patternRegion"] as const

export function analyzeSessionReport(doc: ReadableDocument): SessionReport {
  const query = doc.queryEntities
  const config = query.ofTypes("config").getOne()
  const ticksPerBar = ticksPerBarOf(query)

  const spans: RegionSpan[] = []
  for (const regionType of REGION_TYPES) {
    for (const region of query.ofTypes(regionType).get()) {
      const struct = region.fields.region
      const positionTicks = struct.fields.positionTicks.value
      const durationTicks = struct.fields.durationTicks.value
      if (durationTicks <= 0) continue
      // 1-based inclusive bars: ticks 0 is bar 1.
      const startBar = Math.floor(positionTicks / ticksPerBar) + 1
      const endBar = Math.max(
        startBar,
        Math.ceil((positionTicks + durationTicks) / ticksPerBar),
      )
      spans.push({ startBar, endBar })
    }
  }

  // Arrangement length is the rightmost region end; fall back to the config's
  // declared duration, which is what a fresh project has before any content.
  const contentBars = spans.reduce((max, span) => Math.max(max, span.endBar), 0)
  const declaredBars =
    config === undefined ? 0 : Math.round(config.fields.durationTicks.value / ticksPerBar)
  const lengthBars = contentBars > 0 ? contentBars : declaredBars

  const detected = detectSections(spans, lengthBars)

  return {
    tempoBpm: config?.fields.tempoBpm.value ?? 0,
    signature:
      config === undefined
        ? "4/4"
        : `${config.fields.signatureNumerator.value}/${config.fields.signatureDenominator.value}`,
    lengthBars: spans.length === 0 ? Math.max(0, contentBars) : lengthBars,
    shape: detected.shape,
    inventory: countInventory(doc),
    sections: detected.sections,
    drop: detected.drop,
    risks: findRisks(doc),
    clarification: detected.clarification,
  }
}

function countInventory(doc: ReadableDocument): SessionInventory {
  const inventory: SessionInventory = {
    drums: 0,
    bass: 0,
    synths: 0,
    effects: 0,
    sequencers: 0,
    mixers: 0,
    routing: 0,
    other: 0,
  }
  const bucket: Record<string, keyof SessionInventory> = {
    drums: "drums",
    bass: "bass",
    synth: "synths",
    effect: "effects",
    sequencer: "sequencers",
    mixer: "mixers",
    routing: "routing",
    vst: "other",
    other: "other",
  }
  for (const entity of doc.queryEntities.get()) {
    if (!isDeviceType(entity.entityType)) continue
    inventory[bucket[deviceCategory(entity.entityType)] ?? "other"] += 1
  }
  return inventory
}

/**
 * Deterministic problems worth telling the producer about. The issue's own
 * example is "unrouted device: Heisenberg" - a device that exists but has no
 * cable out of it is invisible in the mix, which is confusing rather than
 * obviously broken.
 */
function findRisks(doc: ReadableDocument): string[] {
  const query = doc.queryEntities
  const risks: string[] = []

  const cabledSources = new Set<string>()
  for (const cableType of ["desktopAudioCable", "desktopNoteCable"] as const) {
    for (const cable of query.ofTypes(cableType).get()) {
      const from = cable.fields.fromSocket.value as { entityId?: string } | undefined
      if (from?.entityId !== undefined && from.entityId !== "") cabledSources.add(from.entityId)
    }
  }

  for (const entity of query.get()) {
    if (!isDeviceType(entity.entityType)) continue
    // Mixer strips and routing utilities are wired through fields, not desktop
    // cables, so "no cable" is normal for them and not worth reporting.
    const category = deviceCategory(entity.entityType)
    if (category === "mixer" || category === "routing") continue
    if (audioOutputSocket(entity.entityType) === undefined) continue
    if (cabledSources.has(entity.id)) continue
    risks.push(`unrouted device: ${displayNameOf(entity) ?? entity.entityType}`)
  }

  if (query.ofTypes("mixerMaster").get().length === 0) {
    risks.push("no mixerMaster - nothing in this project can be heard")
  }

  return risks
}
