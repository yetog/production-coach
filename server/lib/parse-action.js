/**
 * Turn a coach reply into an optional "add this device" suggestion (issue #40).
 *
 * The rule: never offer to do something the coach just advised against. The
 * original matched a device name anywhere in the message and an action verb
 * anywhere else in it, so "Don't use a Beatbox 8, program drums by hand"
 * produced an "Add Beatbox 8" button - the interface contradicting the coach
 * in the same breath.
 *
 * Two changes fix that. The verb and the device have to appear in the SAME
 * clause, and a negated clause is discarded. Clause-level rather than
 * message-level is the important part: advice usually praises one thing and
 * suggests another in adjacent sentences.
 *
 * This is deliberately conservative. A missed suggestion costs the user one
 * extra sentence of typing; a wrong one makes the coach look broken.
 */

/**
 * Device types the coach may suggest. These are real @audiotool/nexus 0.0.17
 * entity type keys - a typo becomes a failed transaction the moment
 * add_device stops being a mock, so they are covered by a test.
 */
export const DEVICE_SUGGESTIONS = [
  { pattern: /\bbeatbox\s*8\b/i, deviceType: "beatbox8", name: "Beatbox 8" },
  { pattern: /\bbeatbox\s*9\b/i, deviceType: "beatbox9", name: "Beatbox 9" },
  { pattern: /\bheisenberg\b/i, deviceType: "heisenberg", name: "Heisenberg" },
  { pattern: /\bpulverisateur\b/i, deviceType: "pulverisateur", name: "Pulverisateur" },
  { pattern: /\bbassline\b/i, deviceType: "bassline", name: "Bassline" },
  { pattern: /\bmachiniste\b/i, deviceType: "machiniste", name: "Machiniste" },
  { pattern: /\btonematrix\b/i, deviceType: "tonematrix", name: "Tonematrix" },
]

/** Verbs that turn a device mention into a suggestion to add one. */
const ACTION_VERB = /\b(add|adding|try|throw|throwing|grab|grabbing|use|using|drop)\b/i

/**
 * Markers that invert a clause. "instead" and "rather" matter as much as
 * "don't": the coach's habit is to reject one option and propose another.
 */
const NEGATION =
  /\b(don't|do not|dont|doesn't|won't|wouldn't|shouldn't|can't|cannot|never|no need|instead|rather than|without|avoid|skip|too (much|many|loud|busy)|already)\b/i

/**
 * Split into clauses on sentence and clause boundaries.
 *
 * Commas count: "Don't use a Beatbox 8, try programming by hand" is one
 * sentence carrying two opposite ideas, and splitting only on full stops
 * would let the negation in the first half be missed.
 */
function toClauses(text) {
  return text
    .split(/[.!?;\n]+|,(?=\s)|\s+-\s+|\s+—\s+/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0)
}

/**
 * @returns {{type: string, label: string, description: string,
 *   params: {deviceType: string, displayName: string}} | null}
 */
export function parseActionFromResponse(content) {
  if (typeof content !== "string" || content.trim() === "") return null

  for (const clause of toClauses(content)) {
    if (NEGATION.test(clause)) continue
    if (!ACTION_VERB.test(clause)) continue

    // First match in document order, so "add a Beatbox 8, then a Heisenberg"
    // suggests the one the coach led with.
    const match = DEVICE_SUGGESTIONS.map((suggestion) => ({
      suggestion,
      index: clause.search(suggestion.pattern),
    }))
      .filter(({ index }) => index !== -1)
      .sort((a, b) => a.index - b.index)[0]

    if (match === undefined) continue

    const { deviceType, name } = match.suggestion
    return {
      type: "add_device",
      label: `Add ${name}`,
      description: `Add ${name} to your session`,
      params: { deviceType, displayName: name },
    }
  }

  return null
}
