/**
 * Normalized read-only shapes produced by the bot.
 *
 * Everything here is derived from NEXUS entities and safe to hand to the
 * Channel A (deterministic ambient) and Channel B (chat) layers without
 * exposing SDK internals.
 */

/** Normalized note payload: pitch/timing/velocity plus resolved device context. */
export interface NoteData {
  /** MIDI pitch, 60 = C4. */
  pitch: number
  /** Human readable pitch, e.g. "F#3". */
  pitchName: string
  /** Velocity 0..1. */
  velocity: number
  positionTicks: number
  durationTicks: number
  /** Position in beats (quarter notes), 3840 ticks per beat. */
  positionBeats: number
  durationBeats: number
  /** The noteCollection this note belongs to. */
  collectionId: string
  /** Resolved via collection -> noteRegion -> noteTrack -> player device. */
  deviceId?: string
  deviceType?: string
  deviceName?: string
}

export interface DeviceData {
  deviceType: string
  displayName?: string
  category: DeviceCategory
}

export interface RegionData {
  regionType: "noteRegion" | "audioRegion" | "automationRegion" | "patternRegion"
  displayName?: string
  positionTicks?: number
  durationTicks?: number
  positionBars?: number
  durationBars?: number
}

export interface CableData {
  cableType: "desktopAudioCable" | "desktopNoteCable" | "mixerSideChainCable"
  fromDeviceId?: string
  fromDeviceType?: string
  toDeviceId?: string
  toDeviceType?: string
}

export interface AutomationEventData {
  positionTicks: number
  value: number
}

export type DeviceCategory =
  | "drums"
  | "synth"
  | "bass"
  | "sequencer"
  | "vst"
  | "effect"
  | "mixer"
  | "routing"
  | "other"

export type CoachEventKind =
  | "note-added"
  | "note-changed"
  | "note-removed"
  | "device-added"
  | "device-removed"
  | "region-added"
  | "region-removed"
  | "track-added"
  | "track-removed"
  | "cable-added"
  | "cable-removed"
  | "automation-added"
  | "automation-changed"
  | "automation-removed"

/** A single normalized event emitted by the read pipeline. */
export interface CoachEvent {
  kind: CoachEventKind
  /** performance.now() timestamp at which the bot observed the event. */
  tMs: number
  /**
   * false while the initial sync replay is running (events for entities that
   * already existed when the bot joined), true for genuinely live edits.
   */
  live: boolean
  entityId: string
  entityType: string
  data: Record<string, unknown>
}

/**
 * Structured snapshot of the session, extending the SessionAnalysis shape
 * stubbed in mcp-server/src/tools/analyzeSession.ts.
 */
export interface SessionAnalysis {
  project: {
    bpm?: number
    signature?: string
    baseFrequencyHz?: number
    durationTicks?: number
    lengthBars: number
  }
  devices: {
    drums: string[]
    synths: string[]
    bass: string[]
    effects: string[]
    sequencers: string[]
    mixers: string[]
    routing: string[]
    other: string[]
  }
  arrangement: {
    hasNoteRegions: boolean
    hasAudioRegions: boolean
    hasAutomation: boolean
    lengthBars: number
    noteRegionCount: number
    audioRegionCount: number
    automationRegionCount: number
    noteCount: number
  }
  cables: {
    audioCableCount: number
    noteCableCount: number
    connections: Array<{
      cableType: string
      from?: { deviceId: string; deviceType: string; name?: string }
      to?: { deviceId: string; deviceType: string; name?: string }
    }>
  }
  /** Entity counts by type, for debugging and the feasibility writeup. */
  entityCounts: Record<string, number>
  recommendations: string[]
}
