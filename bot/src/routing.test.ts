/**
 * Routing socket contract (issue #21 groundwork).
 *
 * These tests re-derive the socket table from the SDK on every run: they create
 * the real device and the real cable against an offline document with
 * validation on. If Audiotool renames a socket or adds a device, this fails
 * here instead of throwing inside a live doc.modify() and wedging the document.
 *
 * One offline document per attempt - a throw inside modify() is unrecoverable,
 * so a shared document would poison every later case.
 */
import { createOfflineDocument } from "@audiotool/nexus/node"
import { describe, expect, it } from "vitest"
import { DEVICE_TYPES } from "./devices.js"
import {
  NON_AUDIO_SOURCES,
  assertAudioRoutable,
  audioOutputSocket,
  noteOutputSocket,
} from "./routing.js"
import { fieldsOf, stopQuietly } from "./test-support.js"

/** Sockets a device exposes whose name looks like an output. */
async function outputSocketsOf(entityType: string): Promise<string[]> {
  const doc = await createOfflineDocument()
  try {
    const entity = await doc.modify((t) => t.create(entityType as never, {} as never))
    return Object.keys(fieldsOf(entity)).filter((name) => /output/i.test(name))
  } finally {
    await stopQuietly(doc)
  }
}

/** True when the SDK accepts a cable from `entityType.socket` into a sink. */
async function cableConnects(
  entityType: string,
  socket: string,
  cableType: "desktopAudioCable" | "desktopNoteCable",
): Promise<boolean> {
  const doc = await createOfflineDocument()
  try {
    await doc.modify((t) => {
      const device = fieldsOf(t.create(entityType as never, {} as never))
      const isAudio = cableType === "desktopAudioCable"
      const sink = fieldsOf(
        isAudio ? t.create("mixerChannel", {}) : t.create("noteSplitter", {}),
      )
      t.create(cableType as never, {
        fromSocket: device[socket]!.location,
        toSocket: sink[isAudio ? "audioInput" : "notesInput"]!.location,
      } as never)
    })
    return true
  } catch {
    return false
  } finally {
    await stopQuietly(doc)
  }
}

describe("audioOutputSocket", () => {
  it("names audioOutput for an ordinary instrument", () => {
    expect(audioOutputSocket("heisenberg")).toBe("audioOutput")
    expect(audioOutputSocket("bassline")).toBe("audioOutput")
  })

  it("names the real socket for devices that do not use audioOutput", () => {
    // machiniste is a drum machine: it IS routable, just not via `audioOutput`.
    // Treating it as unroutable would leave the agent unable to mix drums.
    expect(audioOutputSocket("machiniste")).toBe("mainOutput")
    expect(audioOutputSocket("rasselbock")).toBe("masterOutput")
    expect(audioOutputSocket("mixerMaster")).toBe("insertOutput")
    expect(audioOutputSocket("audioSplitter")).toBe("audioOutputA")
  })

  it("returns undefined for devices with no audio output", () => {
    for (const entityType of NON_AUDIO_SOURCES) {
      expect(audioOutputSocket(entityType), entityType).toBeUndefined()
    }
  })

  it("returns undefined for an unknown entity type rather than guessing", () => {
    // Both of these are plausible-looking names that do not exist in 0.0.17.
    expect(audioOutputSocket("desktopMidiCable")).toBeUndefined()
    expect(audioOutputSocket("parametricEq")).toBeUndefined()
  })
})

describe("noteOutputSocket", () => {
  it("names the note socket for the two note sources", () => {
    expect(noteOutputSocket("matrixArpeggiator")).toBe("notesOutput")
    expect(noteOutputSocket("tonematrix")).toBe("noteOutput")
  })

  it("returns undefined for audio-only devices", () => {
    expect(noteOutputSocket("heisenberg")).toBeUndefined()
    expect(noteOutputSocket("machiniste")).toBeUndefined()
  })
})

describe("assertAudioRoutable", () => {
  it("returns the socket name for a routable device", () => {
    expect(assertAudioRoutable("machiniste")).toBe("mainOutput")
  })

  it("throws BEFORE a transaction is opened, naming the alternative", () => {
    expect(() => assertAudioRoutable("matrixArpeggiator")).toThrow(/desktopNoteCable/)
    expect(() => assertAudioRoutable("mixerChannel")).toThrow(/mixerSideChainCable/)
  })

  it("names the type it does not recognise", () => {
    expect(() => assertAudioRoutable("parametricEq")).toThrow(/parametricEq/)
  })
})

describe("the socket table matches the SDK (re-derived, not asserted from memory)", () => {
  it.each([...DEVICE_TYPES].sort())(
    "%s: audioOutputSocket agrees with what the SDK accepts",
    async (entityType) => {
      const claimed = audioOutputSocket(entityType)
      if (claimed === undefined) {
        // Claiming "no audio out" is the dangerous direction, because callers
        // will refuse to route the device. Prove no socket would have worked.
        for (const socket of await outputSocketsOf(entityType)) {
          expect(
            await cableConnects(entityType, socket, "desktopAudioCable"),
            `${entityType}.${socket} unexpectedly accepts a desktopAudioCable`,
          ).toBe(false)
        }
        return
      }
      expect(
        await cableConnects(entityType, claimed, "desktopAudioCable"),
        `${entityType}.${claimed} was rejected by the SDK`,
      ).toBe(true)
    },
    30_000,
  )

  it("accepts a desktopNoteCable from each declared note source", async () => {
    for (const entityType of ["matrixArpeggiator", "tonematrix"]) {
      const socket = noteOutputSocket(entityType)!
      expect(
        await cableConnects(entityType, socket, "desktopNoteCable"),
        `${entityType}.${socket}`,
      ).toBe(true)
    }
  }, 30_000)

  it("creates every device type in the taxonomy", async () => {
    for (const entityType of DEVICE_TYPES) {
      const doc = await createOfflineDocument()
      try {
        await expect(
          doc.modify((t) => t.create(entityType as never, {} as never)),
          entityType,
        ).resolves.toBeDefined()
      } finally {
        await stopQuietly(doc)
      }
    }
  }, 120_000)
})
