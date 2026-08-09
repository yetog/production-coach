/**
 * Verified routing sockets (NEXUS 0.0.17).
 *
 * A device is only audible once a desktopAudioCable runs from its audio output
 * into a mixerChannel's audioInput. Most devices expose that as `audioOutput`,
 * but eight name it something else and five have no audio output at all.
 * Guessing wrong throws inside doc.modify(), which permanently wedges the
 * document - so routing must be decided BEFORE the transaction opens. That is
 * what assertAudioRoutable() is for.
 *
 * Every entry below was derived by creating the device and the cable against an
 * offline document with SDK validation on, not from documentation.
 * routing.test.ts re-derives the whole table on each run.
 */
import { DEVICE_TYPES } from "./devices.js"

/**
 * Devices whose audio output socket is not named `audioOutput`.
 *
 * Splitters expose more than one audio output; the value here is the default
 * (first) one. audioSplitter also has audioOutputB / audioOutputC, and
 * bandSplitter also has midAudioOutput / lowAudioOutput.
 */
const AUDIO_OUTPUT_OVERRIDES: Readonly<Record<string, string>> = {
  audioSplitter: "audioOutputA",
  bandSplitter: "highAudioOutput",
  machiniste: "mainOutput",
  minimixer: "mainOutput",
  mixerAux: "insertOutput",
  mixerGroup: "insertOutput",
  mixerMaster: "insertOutput",
  rasselbock: "masterOutput",
}

/**
 * Devices that cannot source a desktopAudioCable, and the reason - used to
 * build an error message that points at the fix rather than just refusing.
 */
const NO_AUDIO_OUTPUT: Readonly<Record<string, string>> = {
  matrixArpeggiator: "it is a note source - use a desktopNoteCable from notesOutput",
  mixerChannel: "its sideChainOutput needs a mixerSideChainCable, not a desktopAudioCable",
  mixerDelayAux: "it exposes no output socket; feed it from a mixerChannel send",
  mixerReverbAux: "it exposes no output socket; feed it from a mixerChannel send",
  noteSplitter: "it only has notesInput; it routes notes, not audio",
}

/** Device types with no audio output, for callers that need to filter first. */
export const NON_AUDIO_SOURCES: ReadonlySet<string> = new Set(Object.keys(NO_AUDIO_OUTPUT))

/** Devices that can source a desktopNoteCable, and the socket to use. */
const NOTE_OUTPUTS: Readonly<Record<string, string>> = {
  matrixArpeggiator: "notesOutput",
  // tonematrix is both: it plays audio AND emits the notes it is stepping.
  tonematrix: "noteOutput",
}

/**
 * The socket to use as a desktopAudioCable's `fromSocket`, or undefined when
 * the device has no audio output. Unknown entity types return undefined rather
 * than optimistically guessing `audioOutput`.
 */
export function audioOutputSocket(entityType: string): string | undefined {
  if (!DEVICE_TYPES.has(entityType)) return undefined
  if (entityType in NO_AUDIO_OUTPUT) return undefined
  return AUDIO_OUTPUT_OVERRIDES[entityType] ?? "audioOutput"
}

/** The socket to use as a desktopNoteCable's `fromSocket`, if the device has one. */
export function noteOutputSocket(entityType: string): string | undefined {
  return NOTE_OUTPUTS[entityType]
}

/**
 * Resolve the audio output socket or throw with an actionable message.
 *
 * Call this BEFORE opening a transaction. Throwing here costs nothing;
 * throwing inside doc.modify() wedges the document for the rest of its life.
 */
export function assertAudioRoutable(entityType: string): string {
  const socket = audioOutputSocket(entityType)
  if (socket !== undefined) return socket

  const reason = NO_AUDIO_OUTPUT[entityType]
  throw new Error(
    reason === undefined
      ? `Cannot route "${entityType}" to the mixer: not a known device type ` +
        `(check the 86 entity types in @audiotool/nexus utils/types.d.ts)`
      : `Cannot route "${entityType}" to the mixer: ${reason}`,
  )
}
