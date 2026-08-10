/**
 * Device name resolution (issue #28).
 *
 * Users and the coach both write device names the way people say them -
 * "Beatbox 8", "beatbox8", "a heisenberg". The SDK wants exact entity type
 * keys. Getting that translation wrong throws inside doc.modify(), which
 * wedges the document, so it is resolved before any transaction opens.
 */
import { describe, expect, it } from "vitest"
import { DEVICE_TYPES } from "../devices.js"
import { resolveDeviceName } from "./device-names.js"

describe("resolveDeviceName", () => {
  it("resolves the spaced names the coach actually writes", () => {
    expect(resolveDeviceName("Beatbox 8")?.deviceType).toBe("beatbox8")
    expect(resolveDeviceName("beatbox 9")?.deviceType).toBe("beatbox9")
  })

  it("resolves exact entity type keys unchanged", () => {
    expect(resolveDeviceName("heisenberg")?.deviceType).toBe("heisenberg")
    expect(resolveDeviceName("bassline")?.deviceType).toBe("bassline")
  })

  it("is case- and article-insensitive", () => {
    expect(resolveDeviceName("a HEISENBERG")?.deviceType).toBe("heisenberg")
    expect(resolveDeviceName("the Pulverisateur")?.deviceType).toBe("pulverisateur")
  })

  it("finds a device mentioned inside a sentence", () => {
    expect(resolveDeviceName("add a machiniste for the drums")?.deviceType).toBe("machiniste")
  })

  it("returns a human display name, not the raw key", () => {
    expect(resolveDeviceName("beatbox8")?.displayName).toBe("Beatbox 8")
    expect(resolveDeviceName("tonematrix")?.displayName).toBe("Tonematrix")
  })

  it("resolves the common aliases people use for an 808", () => {
    expect(resolveDeviceName("808")?.deviceType).toBe("bassline")
    expect(resolveDeviceName("sub bass")?.deviceType).toBe("bassline")
  })

  it("returns undefined for something that is not a device", () => {
    expect(resolveDeviceName("reverb tail")).toBeUndefined()
    expect(resolveDeviceName("")).toBeUndefined()
    expect(resolveDeviceName("vinyl master")).toBeUndefined()
  })

  it("never resolves to a name the SDK does not have", () => {
    // Plausible-looking names that do not exist in 0.0.17.
    for (const wrong of ["desktopMidiCable", "parametricEq", "splitter", "merger", "graphicalEq"]) {
      const resolved = resolveDeviceName(wrong)
      if (resolved !== undefined) {
        expect(DEVICE_TYPES.has(resolved.deviceType), wrong).toBe(true)
      }
    }
  })

  it("only ever returns real entity types", () => {
    for (const input of [
      "beatbox 8",
      "beatbox 9",
      "heisenberg",
      "pulverisateur",
      "bassline",
      "machiniste",
      "tonematrix",
      "gakki",
      "808",
    ]) {
      const resolved = resolveDeviceName(input)
      expect(resolved, input).toBeDefined()
      expect(DEVICE_TYPES.has(resolved!.deviceType), `${input} -> ${resolved!.deviceType}`).toBe(
        true,
      )
    }
  })

  it("does not offer a device that cannot be routed to the mixer", () => {
    // matrixArpeggiator is a note source: it has no audio output, so an
    // "add it and wire it up" plan would throw inside the transaction.
    const resolved = resolveDeviceName("matrixArpeggiator")
    expect(resolved).toBeUndefined()
  })
})
