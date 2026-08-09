/**
 * Section / drop detection from region density (issue #19).
 *
 * Deterministic, no LLM. The signal is how many regions are sounding at each
 * bar: a drop is where the most is happening, an intro is the sparse run before
 * it, a build is the ramp between them. That is a heuristic, so every section
 * carries a confidence and the whole report can say "ask the user instead".
 *
 * Bars are 1-based and both ends are inclusive: bars 1-16 is sixteen bars.
 */

export type SectionLabel = "intro" | "build" | "drop" | "breakdown" | "outro" | "section"

export interface RegionSpan {
  startBar: number
  endBar: number
}

export interface Section {
  label: SectionLabel
  startBar: number
  endBar: number
  /** 0..1. Heuristic, and capped below 1 on purpose - this is never certain. */
  confidence: number
  /** Regions sounding across this span; the evidence behind the label. */
  density: number
}

export type SessionShape = "empty" | "loop" | "arranged"

export interface SectionReport {
  shape: SessionShape
  sections: Section[]
  /** The best drop candidate, if there is one worth naming. */
  drop?: Section
  /** Set when the caller should ask the user rather than act on `drop`. */
  clarification?: string
}

/** Below this, the planner must ask instead of placing anything. */
export const CONFIDENCE_THRESHOLD = 0.5

/** Heuristics are never certain; this is the most any section can claim. */
const MAX_CONFIDENCE = 0.95

export function detectSections(regions: RegionSpan[], lengthBars: number): SectionReport {
  const spans = regions.filter(
    (r) =>
      Number.isFinite(r.startBar) &&
      Number.isFinite(r.endBar) &&
      r.endBar >= r.startBar &&
      r.startBar >= 1,
  )

  if (spans.length === 0) {
    return {
      shape: "empty",
      sections: [],
      clarification:
        "There is nothing on the timeline yet, so there is no drop to find. " +
        "Tell me which bar to work at, or add some material first.",
    }
  }

  const segments = segmentByDensity(spans, lengthBars)

  // A loop is one uniform block: every region spans the same stretch, so there
  // is no contrast anywhere and any "drop" would be invented.
  if (segments.length === 1) {
    const only = segments[0]!
    return {
      shape: "loop",
      sections: [{ ...only, label: "section", confidence: 0 }],
      clarification:
        "This looks like a loop rather than an arrangement - everything runs across " +
        `bars ${only.startBar}-${only.endBar}, so there is no drop to detect. ` +
        "Which bar should I work at?",
    }
  }

  const densities = segments.map((s) => s.density)
  const maxDensity = Math.max(...densities)
  const meanDensity = densities.reduce((a, b) => a + b, 0) / densities.length
  const peakIndexes = segments
    .map((segment, index) => ({ segment, index }))
    .filter(({ segment }) => segment.density === maxDensity)
    .map(({ index }) => index)

  // Contrast is the whole signal: a peak that barely rises above the average is
  // not a drop. Ties split the evidence, so more peaks means less confidence.
  const contrast = maxDensity === 0 ? 0 : (maxDensity - meanDensity) / maxDensity
  const dropIndex = peakIndexes[0]!
  const confidence = clamp(
    (contrast * 0.9 + evidenceBonus(segments.length)) / peakIndexes.length,
    0,
    MAX_CONFIDENCE,
  )

  const sections = segments.map((segment, index) =>
    label(segment, index, dropIndex, segments.length, maxDensity, confidence),
  )
  const drop = sections[dropIndex]

  const clarification =
    drop === undefined || drop.confidence < CONFIDENCE_THRESHOLD
      ? `I am not confident where the drop is - my best guess is bars ` +
        `${drop?.startBar ?? 1}-${drop?.endBar ?? lengthBars} ` +
        `(confidence ${(drop?.confidence ?? 0).toFixed(2)}). Which bar should I use?`
      : undefined

  return { shape: "arranged", sections, drop, clarification }
}

/**
 * Cut the timeline wherever the number of sounding regions changes, then merge
 * neighbours that ended up at the same density.
 */
function segmentByDensity(spans: RegionSpan[], lengthBars: number): Section[] {
  const firstBar = Math.min(...spans.map((s) => s.startBar))
  const lastBar = Math.max(lengthBars, ...spans.map((s) => s.endBar))

  const boundaries = new Set<number>([firstBar, lastBar + 1])
  for (const span of spans) {
    boundaries.add(span.startBar)
    boundaries.add(span.endBar + 1)
  }
  const cuts = [...boundaries].sort((a, b) => a - b).filter((bar) => bar >= firstBar)

  const raw: Section[] = []
  for (let i = 0; i < cuts.length - 1; i += 1) {
    const startBar = cuts[i]!
    const endBar = cuts[i + 1]! - 1
    if (endBar < startBar) continue
    const density = spans.filter((s) => s.startBar <= startBar && s.endBar >= startBar).length
    raw.push({ label: "section", startBar, endBar, density, confidence: 0 })
  }

  const merged: Section[] = []
  for (const segment of raw) {
    const previous = merged.at(-1)
    if (previous !== undefined && previous.density === segment.density) {
      previous.endBar = segment.endBar
      continue
    }
    merged.push({ ...segment })
  }
  return merged
}

function label(
  segment: Section,
  index: number,
  dropIndex: number,
  total: number,
  maxDensity: number,
  dropConfidence: number,
): Section {
  if (index === dropIndex) {
    return { ...segment, label: "drop", confidence: dropConfidence }
  }
  // Structural labels are weaker claims than the drop itself, so they carry
  // a fraction of its confidence rather than inventing their own.
  const supporting = clamp(dropConfidence * 0.8, 0, MAX_CONFIDENCE)

  if (index < dropIndex) {
    const isRamp = index === dropIndex - 1 && segment.density > 0
    return { ...segment, label: index === 0 && !isRamp ? "intro" : isRamp ? "build" : "section", confidence: supporting }
  }
  if (index === total - 1) {
    return { ...segment, label: segment.density < maxDensity ? "outro" : "section", confidence: supporting }
  }
  return { ...segment, label: "breakdown", confidence: supporting }
}

/** More distinct segments means more structure to reason from. */
function evidenceBonus(segmentCount: number): number {
  return Math.min(segmentCount, 6) * 0.03
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
