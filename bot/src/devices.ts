/**
 * Device taxonomy over the NEXUS entity type strings (v0.0.17, 86 entity types).
 *
 * "Devices" are the desktop entities a producer adds; regions/tracks/notes/
 * cables/patterns are structural entities handled separately by the pipeline.
 */
import type { DeviceCategory } from "./types.js"

const CATEGORIES: Record<DeviceCategory, readonly string[]> = {
  drums: ["beatbox8", "beatbox9", "machiniste"],
  synth: [
    "heisenberg",
    "pulverisateur",
    "quantum",
    "helmholtz",
    "gakki",
    "space",
    "tonematrix",
  ],
  bass: ["bassline"],
  sequencer: ["matrixArpeggiator", "rasselbock"],
  vst: ["genericVst3PluginBeta", "spitfireLabsVst3Plugin"],
  effect: [
    "autoFilter",
    "curve",
    "exciter",
    "graphicalEQ",
    "gravity",
    "panorama",
    "quasar",
    "ringModulator",
    "stereoEnhancer",
    "stompboxChorus",
    "stompboxCompressor",
    "stompboxCrusher",
    "stompboxDelay",
    "stompboxFlanger",
    "stompboxGate",
    "stompboxParametricEqualizer",
    "stompboxPhaser",
    "stompboxPitchDelay",
    "stompboxReverb",
    "stompboxSlope",
    "stompboxStereoDetune",
    "stompboxTube",
    "waveshaper",
  ],
  mixer: [
    "centroid",
    "kobolt",
    "minimixer",
    "mixerChannel",
    "mixerGroup",
    "mixerMaster",
    "mixerAux",
    "mixerDelayAux",
    "mixerReverbAux",
  ],
  routing: [
    "audioSplitter",
    "audioMerger",
    "bandSplitter",
    "noteSplitter",
    "crossfader",
    "tinyGain",
    "audioDevice",
  ],
  // pulsar's role is unconfirmed in the SDK docs; keep it visible, not misfiled
  other: ["pulsar"],
}

const TYPE_TO_CATEGORY = new Map<string, DeviceCategory>()
for (const [category, types] of Object.entries(CATEGORIES)) {
  for (const t of types) TYPE_TO_CATEGORY.set(t, category as DeviceCategory)
}

/** Every entity type the pipeline treats as a desktop device. */
export const DEVICE_TYPES: ReadonlySet<string> = new Set(TYPE_TO_CATEGORY.keys())

/** Devices that can be the `player` of a noteTrack (from NoteTrack field targets). */
export const NOTE_PLAYER_TYPES: ReadonlySet<string> = new Set([
  "bassline",
  "beatbox8",
  "beatbox9",
  "gakki",
  "genericVst3PluginBeta",
  "heisenberg",
  "machiniste",
  "matrixArpeggiator",
  "noteSplitter",
  "pulverisateur",
  "space",
  "spitfireLabsVst3Plugin",
  "tonematrix",
])

export const REGION_TYPES = ["noteRegion", "audioRegion", "automationRegion", "patternRegion"] as const
export const TRACK_TYPES = ["noteTrack", "audioTrack", "automationTrack", "patternTrack", "tempoAutomationTrack"] as const
export const CABLE_TYPES = ["desktopAudioCable", "desktopNoteCable", "mixerSideChainCable"] as const

export function deviceCategory(entityType: string): DeviceCategory {
  return TYPE_TO_CATEGORY.get(entityType) ?? "other"
}

export function isDeviceType(entityType: string): boolean {
  return TYPE_TO_CATEGORY.has(entityType)
}
