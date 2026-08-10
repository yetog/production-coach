/**
 * Coach action parsing (issue #40).
 *
 * The rule this file defends: the UI must never offer to do something the
 * coach just advised against. That is worse than offering nothing, because it
 * makes the agent look like it is not listening to itself - and it cuts
 * against the product decision that the agent acts on instruction rather than
 * on its own initiative.
 *
 * The negative cases below are the ones observed in the real parser.
 */
import { describe, expect, it } from "vitest"
import { parseActionFromResponse } from "./parse-action.js"

describe("parseActionFromResponse - suggestions it SHOULD make", () => {
  it("offers the device when the coach recommends adding one", () => {
    const action = parseActionFromResponse("Try adding a Beatbox 8 for the drums on this one.")

    expect(action).not.toBeNull()
    expect(action.type).toBe("add_device")
    expect(action.params.deviceType).toBe("beatbox8")
    expect(action.label).toBe("Add Beatbox 8")
  })

  it("handles the other phrasings the coach actually uses", () => {
    for (const text of [
      "Throw a Heisenberg on that lead.",
      "Grab a Bassline for the low end.",
      "You could use a Pulverisateur here.",
    ]) {
      expect(parseActionFromResponse(text), text).not.toBeNull()
    }
  })

  it("matches device names case-insensitively and across spacing", () => {
    expect(parseActionFromResponse("add a beatbox9 here").params.deviceType).toBe("beatbox9")
    expect(parseActionFromResponse("Add a BEATBOX 9 here").params.deviceType).toBe("beatbox9")
  })
})

describe("parseActionFromResponse - suggestions it MUST NOT make", () => {
  // Every one of these produced an "Add <device>" button in the original.
  it("does not offer a device the coach told them not to use", () => {
    expect(
      parseActionFromResponse(
        "Don't use a Beatbox 8 for this, try programming drums by hand instead.",
      ),
    ).toBeNull()
  })

  it("does not offer a device the user already has and was complimented on", () => {
    expect(
      parseActionFromResponse(
        "Yo, your bassline sounds great already - I wouldn't add anything else there.",
      ),
    ).toBeNull()
  })

  it("does not treat criticism of an existing device as a suggestion", () => {
    expect(
      parseActionFromResponse(
        "That bassline is way too loud, pull it back before you add more layers.",
      ),
    ).toBeNull()
  })

  it("does not fire when the verb belongs to a completely different sentence", () => {
    expect(
      parseActionFromResponse(
        "Your Heisenberg patch is lovely. Try automating the filter cutoff next.",
      ),
    ).toBeNull()
  })

  it("handles the other negations the coach uses", () => {
    for (const text of [
      "No need to add a Bassline, you already have low end covered.",
      "Rather than adding a Heisenberg, tweak what you have.",
      "Instead of grabbing a Beatbox 8, layer the samples you already recorded.",
      "You don't need to throw a Machiniste on this.",
      "Never add a Tonematrix just to fill space.",
    ]) {
      expect(parseActionFromResponse(text), text).toBeNull()
    }
  })

  it("returns null when no device is mentioned at all", () => {
    expect(parseActionFromResponse("Try automating the filter cutoff over the drop.")).toBeNull()
  })

  it("returns null when a device is mentioned with no call to action", () => {
    expect(parseActionFromResponse("The Heisenberg is a three-oscillator synth.")).toBeNull()
  })
})

describe("parseActionFromResponse - robustness", () => {
  it("does not throw on empty, missing or non-string input", () => {
    for (const input of ["", null, undefined, 42, {}]) {
      expect(() => parseActionFromResponse(input), String(input)).not.toThrow()
      expect(parseActionFromResponse(input)).toBeNull()
    }
  })

  it("returns the first suggested device when several are recommended", () => {
    const action = parseActionFromResponse("Add a Beatbox 8, then add a Heisenberg on top.")

    expect(action.params.deviceType).toBe("beatbox8")
  })

  it("only names device types the SDK actually has", async () => {
    const { DEVICE_SUGGESTIONS } = await import("./parse-action.js")
    // These are the real 0.0.17 entity type keys; a typo here becomes a
    // failed transaction the moment add_device stops being a mock.
    const real = new Set([
      "beatbox8",
      "beatbox9",
      "heisenberg",
      "pulverisateur",
      "bassline",
      "machiniste",
      "tonematrix",
    ])
    for (const { deviceType } of DEVICE_SUGGESTIONS) {
      expect(real.has(deviceType), deviceType).toBe(true)
    }
  })
})
