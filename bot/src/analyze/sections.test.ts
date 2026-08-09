/**
 * Section / drop detection (issue #19).
 *
 * Deterministic and LLM-free: sections come from how many regions are sounding
 * at each bar. The planner (#20) consumes this, and #21 places the 808 using
 * the drop it reports - so a wrong-but-confident answer is worse than an
 * honest low-confidence one. Every case below pins that tradeoff.
 *
 * Bars are 1-based and both ends are inclusive: bars 1-16 is sixteen bars.
 */
import { describe, expect, it } from "vitest"
import { CONFIDENCE_THRESHOLD, detectSections } from "./sections.js"

/** 16-bar blocks, `count` regions thick, starting at `startBar`. */
function block(startBar: number, bars: number, count: number) {
  return Array.from({ length: count }, () => ({
    startBar,
    endBar: startBar + bars - 1,
  }))
}

describe("detectSections", () => {
  it("reports an empty project as empty, with no sections and no drop", () => {
    const result = detectSections([], 0)

    expect(result.shape).toBe("empty")
    expect(result.sections).toEqual([])
    expect(result.drop).toBeUndefined()
    expect(result.clarification).toMatch(/nothing on the timeline/i)
  })

  it("reports a loop as a loop and refuses to invent a drop", () => {
    // Everything starts at bar 1 and runs the same length: no contrast at all.
    const result = detectSections(block(1, 8, 3), 8)

    expect(result.shape).toBe("loop")
    expect(result.drop).toBeUndefined()
    expect(result.clarification).toMatch(/loop/i)
  })

  it("finds the drop in an arranged track and labels the parts around it", () => {
    const regions = [
      ...block(1, 16, 1), // intro: 1 voice
      ...block(17, 16, 3), // build: 3 voices
      ...block(33, 16, 6), // drop: 6 voices
      ...block(49, 16, 2), // outro: 2 voices
    ]

    const result = detectSections(regions, 64)

    expect(result.shape).toBe("arranged")
    expect(result.drop).toBeDefined()
    expect(result.drop!.startBar).toBe(33)
    expect(result.drop!.endBar).toBe(48)
    expect(result.drop!.confidence).toBeGreaterThan(CONFIDENCE_THRESHOLD)

    expect(result.sections.map((s) => s.label)).toEqual(["intro", "build", "drop", "outro"])
    expect(result.clarification).toBeUndefined()
  })

  it("orders sections by bar and never overlaps them", () => {
    const result = detectSections(
      [...block(1, 16, 1), ...block(17, 16, 4), ...block(33, 16, 2)],
      48,
    )

    for (let i = 1; i < result.sections.length; i += 1) {
      expect(result.sections[i]!.startBar).toBe(result.sections[i - 1]!.endBar + 1)
    }
  })

  it("keeps confidence low when two sections are equally dense", () => {
    // Two candidate drops, nothing to choose between them.
    const tie = detectSections(
      [...block(1, 16, 1), ...block(17, 16, 5), ...block(33, 16, 5)],
      48,
    )
    const clear = detectSections(
      [...block(1, 16, 1), ...block(17, 16, 2), ...block(33, 16, 5)],
      48,
    )

    expect(tie.drop!.confidence).toBeLessThan(clear.drop!.confidence)
  })

  it("asks for clarification instead of guessing when confidence is below threshold", () => {
    // Barely any contrast: 2 voices vs 3 across the whole track.
    const result = detectSections([...block(1, 16, 2), ...block(17, 16, 3)], 32)

    if (result.drop !== undefined && result.drop.confidence < CONFIDENCE_THRESHOLD) {
      expect(result.clarification).toBeDefined()
      expect(result.clarification).toMatch(/which bar|confirm/i)
    }
    expect(result.clarification ?? "").not.toContain("undefined")
  })

  it("never reports a confidence outside 0..1", () => {
    const cases = [
      detectSections([], 0),
      detectSections(block(1, 4, 1), 4),
      detectSections([...block(1, 8, 1), ...block(9, 8, 12)], 16),
    ]
    for (const result of cases) {
      for (const section of result.sections) {
        expect(section.confidence).toBeGreaterThanOrEqual(0)
        expect(section.confidence).toBeLessThanOrEqual(1)
      }
    }
  })

  it("handles overlapping and ragged regions without dropping bars", () => {
    const result = detectSections(
      [
        { startBar: 1, endBar: 32 },
        { startBar: 9, endBar: 40 },
        { startBar: 17, endBar: 24 },
      ],
      40,
    )

    expect(result.sections[0]!.startBar).toBe(1)
    expect(result.sections.at(-1)!.endBar).toBe(40)
    for (let i = 1; i < result.sections.length; i += 1) {
      expect(result.sections[i]!.startBar).toBe(result.sections[i - 1]!.endBar + 1)
    }
  })

  it("ignores zero-length and inverted regions rather than producing NaN bars", () => {
    const result = detectSections(
      [
        { startBar: 1, endBar: 16 },
        { startBar: 20, endBar: 19 }, // inverted
        { startBar: 24, endBar: 24 }, // single bar, legitimate
      ],
      32,
    )

    for (const section of result.sections) {
      expect(Number.isFinite(section.startBar)).toBe(true)
      expect(Number.isFinite(section.endBar)).toBe(true)
      expect(section.endBar).toBeGreaterThanOrEqual(section.startBar)
    }
  })
})
