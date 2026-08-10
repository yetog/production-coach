/**
 * Request guards (issue #42).
 *
 * Two failure modes these exist to prevent, both of which only show up at the
 * worst moment:
 *
 *  - An upstream provider that hangs takes the express handler with it. The
 *    browser sees a request that never resolves, which during a demo is
 *    indistinguishable from the app being broken. A dead provider has to fail
 *    fast and loudly so the UI can fall back.
 *  - ElevenLabs bills per character. Unbounded `text` means a runaway loop in
 *    our own frontend can drain the credits, and we find out when TTS stops
 *    working - most likely right before the demo.
 */
import { describe, expect, it } from "vitest"
import { MAX_TTS_CHARS, fetchWithTimeout, validateChatMessages, validateTtsText } from "./guards.js"

describe("validateTtsText", () => {
  it("accepts ordinary coach speech", () => {
    expect(validateTtsText("Yo, that bassline is sitting nice.")).toEqual({
      ok: true,
      text: "Yo, that bassline is sitting nice.",
    })
  })

  it("trims surrounding whitespace", () => {
    expect(validateTtsText("  hello  ").text).toBe("hello")
  })

  it("rejects a missing, empty or non-string body field", () => {
    for (const bad of [undefined, null, "", "   ", 42, {}, []]) {
      const result = validateTtsText(bad)
      expect(result.ok, JSON.stringify(bad)).toBe(false)
      expect(result.status).toBe(400)
      expect(result.error).toMatch(/text/i)
    }
  })

  it("rejects text over the character cap, since ElevenLabs bills per character", () => {
    const result = validateTtsText("a".repeat(MAX_TTS_CHARS + 1))

    expect(result.ok).toBe(false)
    expect(result.status).toBe(400)
    expect(result.error).toMatch(new RegExp(String(MAX_TTS_CHARS)))
  })

  it("accepts text exactly at the cap", () => {
    expect(validateTtsText("a".repeat(MAX_TTS_CHARS)).ok).toBe(true)
  })

  it("caps well above a normal coach reply, so it never fires in real use", () => {
    // The system prompt asks for 2-3 sentences. A long one is ~400 chars.
    expect(validateTtsText("a".repeat(1000)).ok).toBe(true)
    expect(MAX_TTS_CHARS).toBeGreaterThan(1000)
  })
})

describe("validateChatMessages", () => {
  it("accepts a well-formed conversation", () => {
    const messages = [
      { role: "user", content: "how do I make this less muddy?" },
      { role: "coach", content: "cut some low mids" },
    ]
    expect(validateChatMessages(messages).ok).toBe(true)
  })

  it("rejects a body with no messages array rather than throwing on .map", () => {
    for (const bad of [undefined, null, "hello", {}, 5]) {
      const result = validateChatMessages(bad)
      expect(result.ok, JSON.stringify(bad)).toBe(false)
      expect(result.status).toBe(400)
    }
  })

  it("rejects an empty conversation", () => {
    expect(validateChatMessages([]).ok).toBe(false)
  })

  it("rejects entries that are not shaped like messages", () => {
    expect(validateChatMessages([{ role: "user" }]).ok).toBe(false)
    expect(validateChatMessages([{ content: "hi" }]).ok).toBe(false)
    expect(validateChatMessages(["hi"]).ok).toBe(false)
  })

  it("maps the coach role to assistant for the OpenAI-shaped API", () => {
    const result = validateChatMessages([{ role: "coach", content: "hey" }])

    expect(result.messages[0]).toEqual({ role: "assistant", content: "hey" })
  })
})

describe("fetchWithTimeout", () => {
  it("returns the response when the upstream answers in time", async () => {
    const response = await fetchWithTimeout(
      async () => ({ ok: true, marker: "answered" }),
      1000,
    )

    expect(response.marker).toBe("answered")
  })

  it("gives up on a hanging upstream instead of waiting forever", async () => {
    const started = Date.now()

    await expect(
      fetchWithTimeout(() => new Promise(() => undefined), 100),
    ).rejects.toThrow(/timed out/i)

    expect(Date.now() - started).toBeLessThan(2000)
  })

  it("passes an AbortSignal so the socket is actually released", async () => {
    let seenSignal
    await expect(
      fetchWithTimeout((signal) => {
        seenSignal = signal
        return new Promise(() => undefined)
      }, 50),
    ).rejects.toThrow()

    expect(seenSignal).toBeDefined()
    expect(seenSignal.aborted).toBe(true)
  })

  it("surfaces a genuine upstream error unchanged, not as a timeout", async () => {
    await expect(
      fetchWithTimeout(async () => {
        throw new Error("ECONNREFUSED")
      }, 1000),
    ).rejects.toThrow("ECONNREFUSED")
  })

  it("clears its timer so a fast response does not hold the process open", async () => {
    const before = process._getActiveHandles?.().length ?? 0
    await fetchWithTimeout(async () => "done", 30_000)
    const after = process._getActiveHandles?.().length ?? 0

    expect(after).toBeLessThanOrEqual(before)
  })
})
