/**
 * Known project states, for tests and QA (issue #26).
 *
 * The three shapes the analyzer's acceptance criteria name - empty, loop-only,
 * arranged - built out of real NEXUS entities against an offline document with
 * validation on. Not mocks: a wrong entity or field name fails here.
 *
 * These were duplicated inline across three test files with slightly different
 * details, which meant "the arranged project" meant something different
 * depending on which file you read. One definition now.
 */
import { createOfflineDocument } from "@audiotool/nexus/node"
import { Ticks } from "@audiotool/nexus/utils"

export type OfflineDoc = Awaited<ReturnType<typeof createOfflineDocument>>

/** One bar at 4/4. */
export const BAR = Ticks.SemiBreve

export interface BlockSpec {
  /** 1-based, inclusive. */
  startBar: number
  bars: number
  /** How many regions to stack here - this is what section detection reads. */
  voices: number
}

export interface ProjectSpec {
  blocks?: BlockSpec[]
  bpm?: number
  lengthBars?: number
  /** Add a device with no cable, to exercise the unrouted-device risk. */
  unroutedDevice?: boolean
  /** Omit the mixerMaster, to exercise the "nothing can be heard" risk. */
  withoutMaster?: boolean
}

/**
 * A project with config, a routed synth, and the requested blocks of stacked
 * note regions.
 *
 * Everything in one transaction: offline documents are cheap, and a throw
 * would wedge the document anyway, so there is nothing to gain by splitting.
 */
export async function buildProject(spec: ProjectSpec = {}): Promise<OfflineDoc> {
  const doc = await createOfflineDocument()
  // Unique across ALL track types - a duplicate throws, and per the wedge
  // footgun that is unrecoverable.
  let orderAmongTracks = 500

  await doc.modify((t) => {
    const groove = t.create("groove", {})
    t.create("config", {
      tempoBpm: spec.bpm ?? 128,
      defaultGroove: groove.location,
      durationTicks: (spec.lengthBars ?? 64) * BAR,
    })

    if (spec.withoutMaster !== true) t.create("mixerMaster", {})

    const synth = t.create("heisenberg", { displayName: "Lead Synth" })
    const channel = t.create("mixerChannel", {})
    t.create("desktopAudioCable", {
      fromSocket: synth.fields.audioOutput.location,
      toSocket: channel.fields.audioInput.location,
    })

    if (spec.unroutedDevice === true) {
      // Exists in the rack, silent in the mix: confusing rather than broken,
      // which is why the analyzer reports it by name.
      t.create("bassline", { displayName: "Sub Bass" })
    }

    for (const block of spec.blocks ?? []) {
      for (let voice = 0; voice < block.voices; voice += 1) {
        const track = t.create("noteTrack", {
          player: synth.location,
          orderAmongTracks: (orderAmongTracks += 1),
        })
        const collection = t.create("noteCollection", {})
        t.create("noteRegion", {
          collection: collection.location,
          track: track.location,
          region: {
            positionTicks: (block.startBar - 1) * BAR,
            durationTicks: block.bars * BAR,
          },
        })
        t.create("note", {
          collection: collection.location,
          pitch: 48 + voice,
          positionTicks: (block.startBar - 1) * BAR,
          durationTicks: BAR,
          velocity: 0.8,
        })
      }
    }
  })

  return doc
}

/** A fresh project: config and mixer furniture, nothing on the timeline. */
export async function emptyProject(): Promise<OfflineDoc> {
  return await buildProject({ lengthBars: 16 })
}

/**
 * A loop: everything starts at bar 1 and runs the same length, so there is no
 * density contrast anywhere and no drop can honestly be inferred.
 */
export async function loopProject(): Promise<OfflineDoc> {
  return await buildProject({ blocks: [{ startBar: 1, bars: 8, voices: 3 }], lengthBars: 8 })
}

/**
 * An arrangement with a clear drop at bars 33-48: sparse intro, denser build,
 * densest drop, thinner outro.
 */
export async function arrangedProject(): Promise<OfflineDoc> {
  return await buildProject({
    blocks: [
      { startBar: 1, bars: 16, voices: 1 },
      { startBar: 17, bars: 16, voices: 3 },
      { startBar: 33, bars: 16, voices: 6 },
      { startBar: 49, bars: 16, voices: 2 },
    ],
    lengthBars: 64,
  })
}

/**
 * A client whose open() returns the same document every time, the way a real
 * backend returns successive views of one persisted project. Offline documents
 * have no start/stop, so those are supplied.
 */
export function backendFor(doc: OfflineDoc): {
  client: { open: (project: string) => Promise<unknown> }
  opens: () => number
} {
  const view = Object.assign(Object.create(Object.getPrototypeOf(doc) as object), doc, {
    start: async () => undefined,
    stop: async () => undefined,
  }) as unknown
  let opens = 0
  return {
    client: {
      open: async () => {
        opens += 1
        return view
      },
    },
    opens: () => opens,
  }
}
