# Melody & Chord Support for Production Coach

> Extension to the NEXUS agent planner enabling Dr. Zay to create melodies and chord progressions.

**Date:** 2026-08-19
**Status:** Implemented & Tested (64 tests passing)

---

## Overview

The Production Coach agent now supports melody and chord commands in addition to 808 bass lines. Users can create musical content through the CommandCenter with natural language commands.

### New Commands Supported

**Melody Commands:**
```
add a melody over the drop
add a lead in C major at bar 1
add a bright synth lead in Am
add an ascending melody in F major
```

**Chord Commands:**
```
add chords under the verse
add a jazzy chord progression in F major
add pop chords in G major at bar 9
add arpeggiated chords in Dm
add I-IV-V-I chords at bar 1
```

---

## Music Theory Capabilities

### Supported Scales
| Scale | Intervals | Notes in C |
|-------|-----------|------------|
| Major | 0,2,4,5,7,9,11 | C,D,E,F,G,A,B |
| Minor (Natural) | 0,2,3,5,7,8,10 | C,D,Eb,F,G,Ab,Bb |
| Pentatonic Minor | 0,3,5,7,10 | C,Eb,F,G,Bb |
| Blues | 0,3,5,6,7,10 | C,Eb,F,F#,G,Bb |
| Dorian | 0,2,3,5,7,9,10 | C,D,Eb,F,G,A,Bb |
| Mixolydian | 0,2,4,5,7,9,10 | C,D,E,F,G,A,Bb |

### Supported Chord Types
| Type | Intervals | Example (C) |
|------|-----------|-------------|
| Major | 0,4,7 | C,E,G |
| Minor | 0,3,7 | C,Eb,G |
| Diminished | 0,3,6 | C,Eb,Gb |
| Dominant 7th | 0,4,7,10 | C,E,G,Bb |
| Major 7th | 0,4,7,11 | C,E,G,B |
| Minor 7th | 0,3,7,10 | C,Eb,G,Bb |

### Built-in Progressions
| Name | Degrees | Roman Numerals |
|------|---------|----------------|
| Pop | 1,5,6,4 | I-V-vi-IV |
| Jazz | 2,5,1,6 | ii-V-I-vi |
| Sad | 6,4,1,5 | vi-IV-I-V |
| Blues | 1,4,1,5 | I-IV-I-V |
| Classic | 1,4,5,1 | I-IV-V-I |

### Custom Progressions
Users can specify custom Roman numeral progressions:
```
add I-IV-V-I chords at bar 1
add vi-IV-I-V chords in C major
add ii-V-I chords over the verse
```

---

## Key Parsing

The planner accepts various key formats:

| Input | Parsed As |
|-------|-----------|
| `C major` | C major |
| `C` | C major (default) |
| `Am` | A minor |
| `A minor` | A minor |
| `F# minor` | F# minor |
| `Bb` | Bb major |
| `D min` | D minor |
| `G maj` | G major |

When no key is specified, the agent asks the user:
> "What key would you like? (e.g., C major, Am, F# minor)"

---

## Melodic Patterns

| Pattern | Behavior |
|---------|----------|
| `ascending` | Walks up through scale notes |
| `descending` | Walks down through scale notes |
| `wave` | Goes up then down (default) |
| `random` | Random scale notes |

## Chord Voicings

| Voicing | Behavior |
|---------|----------|
| `block` | All notes play simultaneously (default for pads) |
| `arpeggiated` | Notes stagger across the duration |
| `broken` | Root-fifth-third pattern |

---

## Device Selection

### Tone-Based Selection
| Tone Hint | Melody Device | Chord Device |
|-----------|---------------|--------------|
| bright | Heisenberg | Heisenberg |
| dark | Pulverisateur | Space |
| warm | ToneMatrix | Space |
| aggressive | Pulverisateur | Pulverisateur |
| neutral (default) | Heisenberg | Space |

### Device Aliases Added
```typescript
// Lead/melody
"lead" → heisenberg
"lead synth" → heisenberg
"melody synth" → heisenberg

// Pads/chords
"pad" → space
"pads" → space
"strings" → space
"keys" → tonematrix
"piano" → gakki
```

---

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `bot/src/plan/music-theory.ts` | CREATE | Scales, chords, progressions, key parsing |
| `bot/src/plan/contract.ts` | MODIFY | New intent types, action types |
| `bot/src/plan/planner.ts` | MODIFY | Melody/chord command handlers |
| `bot/src/plan/device-names.ts` | MODIFY | Lead/pad device aliases |
| `bot/src/apply/executor.ts` | MODIFY | Melody/chord note generation |
| `bot/src/apply/safety.ts` | MODIFY | Dry-run descriptions |
| `bot/src/plan/music-theory.test.ts` | CREATE | 37 unit tests |
| `bot/src/plan/planner.test.ts` | MODIFY | Melody/chord integration tests |
| `server/index.js` | MODIFY | Dr. Zay persona update |

---

## New Types

### Contract Types (`contract.ts`)

```typescript
// New intents
export type PlanIntent =
  | "add_808"
  | "add_device"
  | "add_melody"   // NEW
  | "add_chords"   // NEW
  | "preview_only"
  | "unknown"

// New patterns
export type MelodicPattern = "ascending" | "descending" | "wave" | "random"
export type ChordVoicing = "block" | "arpeggiated" | "broken"
export type NoteDuration = "eighth" | "quarter" | "half"

// New actions
| { type: "create_melody_notes"; pitches: number[]; pattern: MelodicPattern; velocity: number; noteDuration: NoteDuration }
| { type: "create_chord_notes"; chords: number[][]; voicing: ChordVoicing; velocity: number; chordsPerBar: number }

// Harmony hint for session context
export interface HarmonyHint {
  key?: string
  progression?: string
  detected?: boolean
}
```

---

## Test Results

```
 ✓ bot/src/plan/music-theory.test.ts (37 tests)
 ✓ bot/src/plan/planner.test.ts (27 tests)

 Test Files  2 passed
 Tests       64 passed
```

### Test Coverage
- `parseKey` - All key formats, case insensitivity, invalid input
- `getScaleNotes` - Major, minor, pentatonic, multi-octave
- `getChordNotes` - Triads, 7th chords, diminished
- `getChordRootFromDegree` - Scale degree to pitch
- `getChordTypeForDegree` - Diatonic chord quality
- `buildChordProgression` - Full progression building
- `getProgressionRoman` - Roman numeral display
- `parseRomanNumerals` - Custom progression parsing

---

## Example Dry-Run Output

**Input:** `add a melody in C major at bar 1`
```
create a heisenberg named "Agent Lead"
route the heisenberg to a new mixer channel so it is audible
create a note track named "Agent Lead"
create a 4-bar region starting at bar 1
place a wave melodic pattern with eighth notes across 14 scale tones (velocity 0.75)
```

**Input:** `add jazzy chords in Am at bar 9`
```
create a space named "Agent Jazz Chords"
route the space to a new mixer channel so it is audible
create a note track named "Agent Jazz Chords"
create a 8-bar region starting at bar 9
place 4 chords with block voicing, 1 per bar (velocity 0.7)
```

---

## Dr. Zay Persona Update

Dr. Zay now suggests melody/chord commands when appropriate:

```
COMMAND CENTER ACTIONS:
When the user is ready to add musical content to their session, guide them to use the Command Center:

- "Try typing 'add 808 to the drop' in the command box"
- "add a melody in C major over the drop"
- "add jazzy chords in Am at bar 1"

Always encourage them to specify a key when adding melodies or chords:
"What key are you working in? Try something like 'add chords in G major'"
```

---

## Usage Examples

### Basic Melody
```
User: add a melody at bar 1
Agent: What key would you like? (e.g., C major, Am, F# minor)
User: C major
→ Creates wave pattern melody with Heisenberg synth
```

### Chord Progression
```
User: add pop chords in G major at bar 9
→ Creates I-V-vi-IV progression with Space pad
```

### Custom Progression
```
User: add I-IV-V-I chords in D major
→ Creates classic progression with specified chords
```

### Tone-Specific
```
User: add a dark melody in Am over the drop
→ Creates melody with Pulverisateur (dark tone)
```

---

## Architecture Notes

1. **Pattern Matching**: Command detection uses regex, no LLM inference
2. **Transaction Safety**: All note creation happens in a single atomic transaction
3. **Plan → Apply → Verify → Undo**: Full safety envelope preserved
4. **Deterministic**: Same command produces same plan every time

---

## Future Enhancements

- [ ] Detect existing key from session notes
- [ ] Support more exotic scales (harmonic minor, melodic minor)
- [ ] Add sus2/sus4 chord types
- [ ] Velocity curves for dynamics
- [ ] Swing/groove patterns
