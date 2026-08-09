/**
 * Session analyzer (issue #19), tested against real offline documents.
 *
 * The acceptance criteria name three project shapes - empty, loop-only, and
 * arranged - so each one is built here out of real NEXUS entities with SDK
 * validation on, rather than mocked. That also means these tests fail if an
 * entity or field name is wrong, which is the cheapest guard we have.
 */
import { createOfflineDocument } from "@audiotool/nexus/node"
import { Ticks } from "@audiotool/nexus/utils"
import { describe, expect, it } from "vitest"
import { stopQuietly } from "../test-support.js"
import { analyzeSessionReport } from "./analyzer.js"
import { CONFIDENCE_THRESHOLD } from "./sections.js"

type Doc = Awaited<ReturnType<typeof createOfflineDocument>>

const BAR = Ticks.SemiBreve // one 4/4 bar

/** orderAmongTracks must be unique across ALL track types, or create throws. */
let nextTrackOrder = 1000

interface BlockSpec {
  startBar: number
  bars: number
  /** how many note regions (voices) to stack across this block */
  voices: number
}

/**
 * Build a project: config, a routed synth, and `blocks` of stacked note
 * regions. Everything in one transaction - offline docs are cheap, and one
 * throw would wedge the document anyway.
 */
async function buildProject(
  blocks: BlockSpec[],
  options: { lengthBars?: number; bpm?: number; unroutedDevice?: boolean } = {},
): Promise<Doc> {
  const doc = await createOfflineDocument()
  await doc.modify((t) => {
    const groove = t.create("groove", {})
    t.create("config", {
      tempoBpm: options.bpm ?? 128,
      defaultGroove: groove.location,
      durationTicks: (options.lengthBars ?? 64) * BAR,
    })

    // A mixerChannel has no routing field: strips reach the master through the
    // mixer's own topology, so creating both is enough.
    t.create("mixerMaster", {})
    const channel = t.create("mixerChannel", {})
    const synth = t.create("heisenberg", { displayName: "Lead Synth" })
    t.create("desktopAudioCable", {
      fromSocket: synth.fields.audioOutput.location,
      toSocket: channel.fields.audioInput.location,
    })

    if (options.unroutedDevice === true) {
      // A bassline with no cable at all: audible in the UI, silent in the mix.
      t.create("bassline", { displayName: "Sub Bass" })
    }

    for (const spec of blocks) {
      for (let voice = 0; voice < spec.voices; voice += 1) {
        const track = t.create("noteTrack", {
          player: synth.location,
          orderAmongTracks: (nextTrackOrder += 1),
        })
        const collection = t.create("noteCollection", {})
        t.create("noteRegion", {
          collection: collection.location,
          track: track.location,
          region: {
            positionTicks: (spec.startBar - 1) * BAR,
            durationTicks: spec.bars * BAR,
          },
        })
        t.create("note", {
          collection: collection.location,
          pitch: 48 + voice,
          positionTicks: (spec.startBar - 1) * BAR,
          durationTicks: BAR,
          velocity: 0.8,
        })
      }
    }
  })
  return doc
}

describe("analyzeSessionReport", () => {
  it("works against an empty project and says so instead of failing", async () => {
    const doc = await createOfflineDocument()
    try {
      const report = analyzeSessionReport(doc)

      expect(report.shape).toBe("empty")
      expect(report.sections).toEqual([])
      expect(report.drop).toBeUndefined()
      expect(report.clarification).toBeDefined()
      expect(report.lengthBars).toBe(0)
    } finally {
      await stopQuietly(doc)
    }
  })

  it("reads tempo and signature from config rather than assuming 4/4", async () => {
    const doc = await buildProject([{ startBar: 1, bars: 8, voices: 1 }], { bpm: 174 })
    try {
      const report = analyzeSessionReport(doc)

      expect(report.tempoBpm).toBe(174)
      expect(report.signature).toBe("4/4")
    } finally {
      await stopQuietly(doc)
    }
  })

  it("works against a loop-only project and refuses to invent a drop", async () => {
    const doc = await buildProject([{ startBar: 1, bars: 8, voices: 3 }], { lengthBars: 8 })
    try {
      const report = analyzeSessionReport(doc)

      expect(report.shape).toBe("loop")
      expect(report.drop).toBeUndefined()
      expect(report.clarification).toMatch(/loop/i)
    } finally {
      await stopQuietly(doc)
    }
  })

  it("works against an arranged project and reports the drop with confidence", async () => {
    const doc = await buildProject(
      [
        { startBar: 1, bars: 16, voices: 1 },
        { startBar: 17, bars: 16, voices: 3 },
        { startBar: 33, bars: 16, voices: 6 },
        { startBar: 49, bars: 16, voices: 2 },
      ],
      { lengthBars: 64 },
    )
    try {
      const report = analyzeSessionReport(doc)

      expect(report.shape).toBe("arranged")
      expect(report.drop).toBeDefined()
      expect(report.drop!.startBar).toBe(33)
      expect(report.drop!.confidence).toBeGreaterThan(CONFIDENCE_THRESHOLD)
      expect(report.clarification).toBeUndefined()
    } finally {
      await stopQuietly(doc)
    }
  })

  it("counts inventory by category", async () => {
    const doc = await buildProject([{ startBar: 1, bars: 4, voices: 1 }], {
      unroutedDevice: true,
    })
    try {
      const report = analyzeSessionReport(doc)

      expect(report.inventory.synths).toBe(1)
      expect(report.inventory.bass).toBe(1)
      expect(report.inventory.mixers).toBeGreaterThanOrEqual(2)
    } finally {
      await stopQuietly(doc)
    }
  })

  it("flags an unrouted device by name - the issue's own example risk", async () => {
    const doc = await buildProject([{ startBar: 1, bars: 4, voices: 1 }], {
      unroutedDevice: true,
    })
    try {
      const report = analyzeSessionReport(doc)

      expect(report.risks.join(" ")).toMatch(/unrouted device: Sub Bass/)
    } finally {
      await stopQuietly(doc)
    }
  })

  it("does not flag a device that is cabled to the mixer", async () => {
    const doc = await buildProject([{ startBar: 1, bars: 4, voices: 1 }])
    try {
      const report = analyzeSessionReport(doc)

      expect(report.risks.join(" ")).not.toMatch(/Lead Synth/)
    } finally {
      await stopQuietly(doc)
    }
  })

  it("emits the JSON contract the planner consumes, and it round-trips", async () => {
    const doc = await buildProject([
      { startBar: 1, bars: 16, voices: 1 },
      { startBar: 17, bars: 16, voices: 5 },
    ])
    try {
      const report = analyzeSessionReport(doc)
      const roundTripped = JSON.parse(JSON.stringify(report)) as typeof report

      expect(roundTripped).toEqual(report)
      for (const key of ["tempoBpm", "lengthBars", "inventory", "sections", "risks"]) {
        expect(report).toHaveProperty(key)
      }
    } finally {
      await stopQuietly(doc)
    }
  })
})
