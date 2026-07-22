/**
 * Foundation spike, offline half (issue #14).
 *
 * Proves, with NO auth and NO live session, that the READ pipeline works:
 *  - onCreate fires for individual "note" entities (not just devices)
 *  - onUpdate fires for note field changes (pitch/velocity/timing)
 *  - onCreate cleanup fires on note removal
 *  - the readable set is real: notes {pitch,timing,velocity}, device types +
 *    params, regions, automation, cable routing, project config (bpm/signature)
 *  - event dispatch latency (local; network latency is spike-live territory)
 *
 * IMPORTANT: this script writes ONLY to a throwaway in-memory offline
 * document, to simulate the producer's edits so the read pipeline has
 * something to observe. Nothing here can touch a real project. The live bot
 * (index.ts / spike-live.ts) never writes - see readonly.ts.
 *
 * Run: npm run spike
 */
import { createOfflineDocument } from "@audiotool/nexus/node"
import { Ticks } from "@audiotool/nexus/utils"
import { subscribeCoachEvents } from "./events.js"
import { analyzeSession } from "./query.js"
import type { CoachEvent } from "./types.js"

interface Check {
  name: string
  pass: boolean
  detail: string
}

const checks: Check[] = []
function check(name: string, pass: boolean, detail: string): void {
  checks.push({ name, pass, detail })
  console.log(`${pass ? "PASS" : "FAIL"}  ${name} - ${detail}`)
}

async function main(): Promise<void> {
  console.log("=== Production Coach foundation spike (offline) ===\n")
  const doc = await createOfflineDocument()

  // --- read pipeline: subscribe BEFORE any content exists -------------------
  const events: CoachEvent[] = []
  const latenciesMs: number[] = []
  let tBeforeModify = 0
  subscribeCoachEvents(doc, (event) => {
    events.push(event)
    if (tBeforeModify > 0) latenciesMs.push(event.tMs - tBeforeModify)
  })

  const of = (kind: CoachEvent["kind"]) => events.filter((e) => e.kind === kind)

  // --- simulate the producer: device -> mixer -> track -> region -> notes ---
  // Fmaj7 (F3 A3 C4 E4), one bar, mirroring the README demo flow.
  const CHORD = [53, 57, 60, 64]
  tBeforeModify = performance.now()
  const { synth, collection, region } = await doc.modify((t) => {
    // Offline documents start completely empty - even the config entity
    // (bpm/signature) doesn't exist. Live projects always have one; creating
    // it here proves the config fields are readable through the pipeline.
    const groove = t.create("groove", {})
    t.create("config", { tempoBpm: 128, defaultGroove: groove.location })
    const synth = t.create("heisenberg", {
      displayName: "Lead Synth",
      positionX: 200,
      positionY: 100,
    })
    const channel = t.create("mixerChannel", {})
    t.create("desktopAudioCable", {
      fromSocket: synth.fields.audioOutput.location,
      toSocket: channel.fields.audioInput.location,
    })
    const track = t.create("noteTrack", { player: synth.location, orderAmongTracks: 1000 })
    const collection = t.create("noteCollection", {})
    const region = t.create("noteRegion", {
      collection: collection.location,
      track: track.location,
      region: {
        positionTicks: 0,
        durationTicks: Ticks.SemiBreve,
        loopDurationTicks: Ticks.SemiBreve,
        loopOffsetTicks: 0,
        collectionOffsetTicks: 0,
        displayName: "Chords",
        isEnabled: true,
        colorIndex: 3,
      },
    })
    const notes = CHORD.map((pitch) =>
      t.create("note", {
        collection: collection.location,
        pitch,
        positionTicks: 0,
        durationTicks: Ticks.SemiBreve,
        velocity: 0.8,
      }),
    )
    return { synth, collection, region, notes }
  })

  // --- 1: do individual notes fire onCreate? --------------------------------
  const noteAdds = of("note-added")
  check(
    "onCreate fires per individual note",
    noteAdds.length === CHORD.length,
    `${noteAdds.length}/${CHORD.length} note-added events`,
  )
  check(
    "note events carry pitch/timing/velocity",
    noteAdds.every(
      (e) =>
        typeof e.data.pitch === "number" &&
        typeof e.data.velocity === "number" &&
        typeof e.data.positionTicks === "number" &&
        typeof e.data.durationTicks === "number",
    ),
    JSON.stringify(noteAdds.map((e) => `${e.data.pitchName}@v${e.data.velocity}`)),
  )
  check(
    "note events resolve their device",
    noteAdds.every((e) => e.data.deviceType === "heisenberg" && e.data.deviceName === "Lead Synth"),
    `deviceType=${String(noteAdds[0]?.data.deviceType)} deviceName=${String(noteAdds[0]?.data.deviceName)}`,
  )
  check(
    "device/region/cable/track events fire",
    of("device-added").length >= 2 &&
      of("region-added").length === 1 &&
      of("cable-added").length === 1 &&
      of("track-added").length === 1,
    `devices=${of("device-added").length} regions=${of("region-added").length} ` +
      `cables=${of("cable-added").length} tracks=${of("track-added").length}`,
  )

  // --- 2: dispatch latency --------------------------------------------------
  const max = Math.max(...latenciesMs)
  check(
    "local event dispatch latency",
    max < 150,
    `max ${max.toFixed(2)}ms over ${latenciesMs.length} events (budget 150-300ms is for network)`,
  )

  // --- 3: onUpdate for note field changes -----------------------------------
  const firstNoteId = noteAdds[0]!.entityId
  const firstNote = doc.queryEntities.mustGetEntityAs(firstNoteId, "note")
  await doc.modify((t) => t.update(firstNote.fields.pitch, 65))
  const changes = of("note-changed")
  check(
    "onUpdate fires for note pitch change",
    changes.length === 1 && changes[0]!.data.field === "pitch" && changes[0]!.data.value === 65,
    JSON.stringify(changes.map((e) => `${String(e.data.field)}=${String(e.data.value)}`)),
  )

  // --- 4: removal cleanup + explicit onRemove -------------------------------
  let onRemoveFired = 0
  doc.events.onRemove(firstNote, () => {
    onRemoveFired += 1
  })
  await doc.modify((t) => t.remove(firstNoteId))
  check(
    "onCreate cleanup fires on note removal",
    of("note-removed").length === 1,
    `${of("note-removed").length} note-removed events`,
  )
  check(
    "explicit onRemove(entity) fires too",
    onRemoveFired === 1,
    `${onRemoveFired} onRemove callbacks`,
  )

  // --- 5: automation is readable --------------------------------------------
  try {
    tBeforeModify = 0
    await doc.modify((t) => {
      const autoTrack = t.create("automationTrack", {
        automatedParameter: synth.fields.gain.location,
      })
      const autoCollection = t.create("automationCollection", {})
      t.create("automationRegion", {
        collection: autoCollection.location,
        track: autoTrack.location,
        region: { positionTicks: 0, durationTicks: Ticks.SemiBreve },
      })
      t.create("automationEvent", {
        collection: autoCollection.location,
        positionTicks: 0,
        value: 0.5,
      })
    })
    check(
      "automation events flow through pipeline",
      of("automation-added").length === 1,
      `${of("automation-added").length} automation-added events`,
    )
  } catch (error) {
    check("automation events flow through pipeline", false, String(error))
  }

  // --- 6: query pipeline (PULL) ---------------------------------------------
  const analysis = analyzeSession(doc)
  check(
    "queryEntities snapshot: devices classified",
    analysis.devices.synths.some((d) => d.startsWith("heisenberg")),
    JSON.stringify(analysis.devices.synths),
  )
  check(
    "queryEntities snapshot: config (bpm/signature) readable",
    typeof analysis.project.bpm === "number" && analysis.project.signature === "4/4",
    `bpm=${String(analysis.project.bpm)} signature=${String(analysis.project.signature)}`,
  )
  check(
    "queryEntities snapshot: arrangement + cables",
    analysis.arrangement.hasNoteRegions &&
      analysis.arrangement.noteCount === CHORD.length - 1 &&
      analysis.cables.audioCableCount === 1 &&
      analysis.cables.connections[0]?.from?.deviceType === "heisenberg",
    `notes=${analysis.arrangement.noteCount} cables=${analysis.cables.audioCableCount} ` +
      `from=${String(analysis.cables.connections[0]?.from?.deviceType)}`,
  )
  const notesInRegion = doc.queryEntities
    .ofTypes("note")
    .pointingTo.entities(region.fields.collection.value.entityId)
    .get()
  check(
    "notes-of-region query works",
    notesInRegion.length === CHORD.length - 1,
    `${notesInRegion.length} notes point to the region's collection`,
  )

  // --- 7: onPointingTo + sidechain cable field names ------------------------
  // initialTrigger=false: with the default (true) the callback fires once per
  // pointer that ALREADY points at the location (notes + the region here).
  let pointingToFired = 0
  doc.events.onPointingTo(
    collection.location,
    () => {
      pointingToFired += 1
    },
    false,
  )
  await doc.modify((t) =>
    t.create("note", { collection: collection.location, pitch: 72, positionTicks: Ticks.Beat }),
  )
  check(
    "onPointingTo fires when a note joins a collection",
    pointingToFired === 1,
    `${pointingToFired} onPointingTo callbacks`,
  )

  // mixerSideChainCable names its endpoints from/to (not fromSocket/toSocket) -
  // regression check for the endpoint resolution in normalizeCable.
  await doc.modify((t) => {
    const source = t.create("mixerChannel", {})
    const target = t.create("mixerChannel", {})
    t.create("mixerSideChainCable", {
      from: source.fields.sideChainOutput.location,
      to: target.fields.compressor.fields.sideChainInput.location,
    })
  })
  const sideChainAdd = of("cable-added").find((e) => e.entityType === "mixerSideChainCable")
  check(
    "mixerSideChainCable endpoints resolve (from/to fields)",
    sideChainAdd?.data.fromDeviceType === "mixerChannel" &&
      sideChainAdd?.data.toDeviceType === "mixerChannel",
    `from=${String(sideChainAdd?.data.fromDeviceType)} to=${String(sideChainAdd?.data.toDeviceType)}`,
  )

  // --- 8: terminated pipeline goes fully silent -----------------------------
  // The SDK keeps invoking onCreate cleanups and un-terminated onUpdate subs
  // after onCreate.terminate(); the pipeline must gate those out itself.
  const lateSink: CoachEvent[] = []
  const secondPipeline = subscribeCoachEvents(doc, (event) => lateSink.push(event))
  await doc.modify((t) => {
    t.create("note", { collection: collection.location, pitch: 48 })
    t.create("automationEvent", {
      collection: doc.queryEntities.ofTypes("automationCollection").getOne()!.location,
      positionTicks: Ticks.Beat,
      value: 0.25,
    })
  })
  const sinkSizeBeforeTerminate = lateSink.length
  secondPipeline.terminate()
  await doc.modify((t) => {
    const lastNote = doc.queryEntities
      .ofTypes("note")
      .get()
      .find((n) => n.fields.pitch.value === 48)!
    t.remove(lastNote.id)
    const autoEvent = doc.queryEntities.ofTypes("automationEvent").get()[1]!
    t.update(autoEvent.fields.value, 0.9)
  })
  check(
    "terminated pipeline emits nothing (removals + automation updates)",
    lateSink.length === sinkSizeBeforeTerminate && sinkSizeBeforeTerminate > 0,
    `${lateSink.length - sinkSizeBeforeTerminate} events leaked after terminate()`,
  )

  // --- 9: no replay without start() (offline) -------------------------------
  let lateEvents = 0
  doc.events.onCreate("note", () => {
    lateEvents += 1
  })
  check(
    "late listeners get NO replay on offline docs",
    lateEvents === 0,
    "listeners must be registered before start() on live docs (start() replays all entities)",
  )

  // --- summary --------------------------------------------------------------
  const failed = checks.filter((c) => !c.pass)
  console.log(`\n=== ${checks.length - failed.length}/${checks.length} checks passed ===`)
  console.log(
    JSON.stringify(
      {
        sdkVersion: "0.0.17",
        checks,
        eventCounts: events.reduce<Record<string, number>>((acc, e) => {
          acc[e.kind] = (acc[e.kind] ?? 0) + 1
          return acc
        }, {}),
        localDispatchLatencyMs: {
          max: Number(max.toFixed(3)),
          samples: latenciesMs.length,
        },
      },
      null,
      2,
    ),
  )
  if (failed.length > 0) process.exitCode = 1
}

main().catch((error: unknown) => {
  console.error("spike fatal:", error)
  process.exit(1)
})
