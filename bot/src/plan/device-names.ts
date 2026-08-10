/**
 * Turn a device name a human wrote into a real SDK entity type (issue #28).
 *
 * The coach says "Beatbox 8"; the SDK wants `beatbox8`. Getting that wrong
 * throws inside doc.modify(), which wedges the document permanently, so it is
 * resolved before any transaction opens - and only devices that can actually
 * be routed to the mixer are offered at all.
 */
import { DEVICE_TYPES, deviceCategory } from "../devices.js"
import { audioOutputSocket } from "../routing.js"

export interface ResolvedDevice {
  /** A real @audiotool/nexus entity type key. */
  deviceType: string
  /** How to write it back to the user. */
  displayName: string
}

/**
 * Human spellings that are not just the entity key with spaces removed.
 * "808" is the important one: producers say 808, the SDK has `bassline`.
 */
const ALIASES: Readonly<Record<string, string>> = {
  "808": "bassline",
  "sub bass": "bassline",
  subbass: "bassline",
  "acid bass": "bassline",
  "drum machine": "beatbox9",
  drums: "beatbox9",
  sampler: "machiniste",
  synth: "heisenberg",
}

/** Display spellings for entity keys whose casing is not obvious. */
const DISPLAY_NAMES: Readonly<Record<string, string>> = {
  beatbox8: "Beatbox 8",
  beatbox9: "Beatbox 9",
  graphicalEQ: "Graphical EQ",
  tonematrix: "Tonematrix",
  matrixArpeggiator: "Matrix Arpeggiator",
  audioSplitter: "Audio Splitter",
  audioMerger: "Audio Merger",
  bandSplitter: "Band Splitter",
  noteSplitter: "Note Splitter",
  tinyGain: "Tiny Gain",
  genericVst3PluginBeta: "VST3 Plugin",
  spitfireLabsVst3Plugin: "Spitfire LABS",
}

/** `stompboxParametricEqualizer` -> `stompbox parametric equalizer`. */
function spaced(entityType: string): string {
  return entityType.replace(/([a-z])([A-Z0-9])/g, "$1 $2").toLowerCase()
}

function displayNameFor(entityType: string): string {
  const known = DISPLAY_NAMES[entityType]
  if (known !== undefined) return known
  const words = spaced(entityType)
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Longest first, so "beatbox 9" wins over a bare "beatbox" style prefix. */
const CANDIDATES: ReadonlyArray<{ needle: string; deviceType: string }> = [
  ...[...DEVICE_TYPES].flatMap((deviceType) => [
    { needle: deviceType.toLowerCase(), deviceType },
    { needle: spaced(deviceType), deviceType },
  ]),
  ...Object.entries(ALIASES).map(([needle, deviceType]) => ({ needle, deviceType })),
]
  .filter(
    // Only devices that can front a desktopAudioCable. Offering a note source
    // here would produce a plan that throws inside the transaction.
    ({ deviceType }) => audioOutputSocket(deviceType) !== undefined,
  )
  .sort((a, b) => b.needle.length - a.needle.length)

export function resolveDeviceName(text: string): ResolvedDevice | undefined {
  const haystack = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `
  if (haystack.trim() === "") return undefined

  for (const { needle, deviceType } of CANDIDATES) {
    // Word-boundary match on a normalized string, so "bassline" does not fire
    // inside "basslines" and "808" does not fire inside "1808".
    if (haystack.includes(` ${needle} `)) {
      return { deviceType, displayName: displayNameFor(deviceType) }
    }
  }
  return undefined
}

/** Devices worth suggesting to a beginner, for UI affordances. */
export function suggestableDevices(): ResolvedDevice[] {
  return [...DEVICE_TYPES]
    .filter((deviceType) => audioOutputSocket(deviceType) !== undefined)
    .filter((deviceType) => ["drums", "synth", "bass", "sequencer"].includes(deviceCategory(deviceType)))
    .sort()
    .map((deviceType) => ({ deviceType, displayName: displayNameFor(deviceType) }))
}
