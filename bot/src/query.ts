/**
 * PULL half of the read layer (issue #3).
 *
 * On-demand structured snapshot of the whole session via queryEntities.
 * This is what Channel B's session-summarization layer consumes.
 */
import { Ticks } from "@audiotool/nexus/utils"
import { deviceCategory, isDeviceType } from "./devices.js"
import { displayNameOf, normalizeCable } from "./normalize.js"
import type { ReadableDocument } from "./readonly.js"
import type { SessionAnalysis } from "./types.js"

export function analyzeSession(doc: ReadableDocument): SessionAnalysis {
  const query = doc.queryEntities
  const all = query.get()

  const entityCounts: Record<string, number> = {}
  for (const entity of all) {
    entityCounts[entity.entityType] = (entityCounts[entity.entityType] ?? 0) + 1
  }

  const devices: SessionAnalysis["devices"] = {
    drums: [],
    synths: [],
    bass: [],
    effects: [],
    sequencers: [],
    mixers: [],
    routing: [],
    other: [],
  }
  const categoryToBucket: Record<string, keyof SessionAnalysis["devices"]> = {
    drums: "drums",
    synth: "synths",
    bass: "bass",
    effect: "effects",
    sequencer: "sequencers",
    vst: "other",
    mixer: "mixers",
    routing: "routing",
    other: "other",
  }
  for (const entity of all) {
    if (!isDeviceType(entity.entityType)) continue
    const label = displayNameOf(entity) ?? entity.entityType
    devices[categoryToBucket[deviceCategory(entity.entityType)]].push(
      `${entity.entityType}:${label}`,
    )
  }

  const config = query.ofTypes("config").getOne()
  const project: SessionAnalysis["project"] = {
    bpm: config?.fields.tempoBpm.value,
    signature:
      config === undefined
        ? undefined
        : `${config.fields.signatureNumerator.value}/${config.fields.signatureDenominator.value}`,
    baseFrequencyHz: config?.fields.baseFrequencyHz.value,
    durationTicks: config?.fields.durationTicks.value,
    lengthBars:
      config === undefined ? 0 : config.fields.durationTicks.value / Ticks.SemiBreve,
  }

  const noteRegions = query.ofTypes("noteRegion").get()
  const audioRegions = query.ofTypes("audioRegion").get()
  const automationRegions = query.ofTypes("automationRegion").get()
  const notes = query.ofTypes("note").get()

  // Arrangement length: rightmost region end, in 4/4 bars.
  let lastTick = 0
  for (const region of [...noteRegions, ...audioRegions, ...automationRegions]) {
    const struct = region.fields.region
    lastTick = Math.max(
      lastTick,
      struct.fields.positionTicks.value + struct.fields.durationTicks.value,
    )
  }

  const arrangement: SessionAnalysis["arrangement"] = {
    hasNoteRegions: noteRegions.length > 0,
    hasAudioRegions: audioRegions.length > 0,
    hasAutomation:
      automationRegions.length > 0 || (entityCounts["automationEvent"] ?? 0) > 0,
    lengthBars: lastTick / Ticks.SemiBreve,
    noteRegionCount: noteRegions.length,
    audioRegionCount: audioRegions.length,
    automationRegionCount: automationRegions.length,
    noteCount: notes.length,
  }

  const audioCables = query.ofTypes("desktopAudioCable").get()
  const noteCables = query.ofTypes("desktopNoteCable").get()
  const cables: SessionAnalysis["cables"] = {
    audioCableCount: audioCables.length,
    noteCableCount: noteCables.length,
    connections: [...audioCables, ...noteCables].map((cable) => {
      const data = normalizeCable(query, cable)
      return {
        cableType: data.cableType,
        from:
          data.fromDeviceId === undefined
            ? undefined
            : {
                deviceId: data.fromDeviceId,
                deviceType: data.fromDeviceType ?? "unknown",
                name:
                  data.fromDeviceId === undefined
                    ? undefined
                    : maybeName(doc, data.fromDeviceId),
              },
        to:
          data.toDeviceId === undefined
            ? undefined
            : {
                deviceId: data.toDeviceId,
                deviceType: data.toDeviceType ?? "unknown",
                name: maybeName(doc, data.toDeviceId),
              },
      }
    }),
  }

  return {
    project,
    devices,
    arrangement,
    cables,
    entityCounts,
    recommendations: recommend(devices, arrangement),
  }
}

function maybeName(doc: ReadableDocument, entityId: string): string | undefined {
  const entity = doc.queryEntities.getEntity(entityId)
  return entity === undefined ? undefined : displayNameOf(entity)
}

/**
 * Deterministic gap check - no LLM involved. This is the seed of Channel A's
 * "what's missing" logic; Channel B may rephrase it, but the facts come from here.
 */
function recommend(
  devices: SessionAnalysis["devices"],
  arrangement: SessionAnalysis["arrangement"],
): string[] {
  const recommendations: string[] = []
  if (devices.drums.length === 0) recommendations.push("No drum machine yet - rhythm section is empty")
  if (devices.bass.length === 0) recommendations.push("No bass device yet - low end is missing")
  if (devices.synths.length === 0) recommendations.push("No synth yet - no harmonic content")
  if (!arrangement.hasNoteRegions) recommendations.push("No note regions on the timeline yet")
  if (!arrangement.hasAutomation && arrangement.lengthBars > 8) {
    recommendations.push("No automation - consider movement over time")
  }
  if (recommendations.length === 0) recommendations.push("Foundation looks complete - focus on arrangement")
  return recommendations
}
