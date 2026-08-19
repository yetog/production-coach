# Production Coach Capability Audit

> Status check: Can a user create a full song with Dr. Zay?
> Date: 2026-08-19

---

## Current Capabilities

| Feature | Status | Notes |
|---------|--------|-------|
| Chat with Dr. Zay | ✅ Working | Teaching mode, gives advice |
| 808 / Sub Bass | ✅ Working | `add 808 under the drop` |
| Melodies | ✅ Working | `add melody in C major at bar 1` |
| Chords | ✅ Working | `add jazzy chords in Am` |
| Add Device | ✅ Working | `add a heisenberg` (generic) |
| Voice Input | ⚠️ Partial | ElevenLabs integrated, no push-to-talk |
| Voice Output | ✅ Working | ElevenLabs TTS |

## Missing for Full Song Creation

| Feature | Status | Priority | Issue |
|---------|--------|----------|-------|
| **Drums/Beats** | ❌ Missing | HIGH | #28 |
| **Arrangement** | ❌ Missing | HIGH | #28 |
| **FX/Effects** | ❌ Missing | MEDIUM | #28 |
| **Automation** | ❌ Missing | MEDIUM | #28 |
| **Mix Moves** | ❌ Missing | LOW | #28 |
| **Push-to-talk** | ❌ Missing | HIGH | #54, #55 |
| **Genre Buttons** | ❌ Missing | LOW | #53 |

## Can a User Make a Full Song?

**Short answer: Not yet.**

A user can currently:
1. Get coaching advice from Dr. Zay
2. Add bass lines (808)
3. Add melodies with scales
4. Add chord progressions
5. Add individual synth devices

A user CANNOT yet:
1. Add drum patterns (kick, snare, hihat)
2. Structure a song (intro, verse, chorus, drop)
3. Add effects (reverb, delay, compression)
4. Create automation (filter sweeps, risers)
5. Do hands-free voice commands (push-to-talk)

## What's Needed for MVP "Full Song"

### Minimum Viable Song Components
1. **Drums** - kick, snare, hihat patterns
2. **Bass** - ✅ Already have 808
3. **Chords/Pads** - ✅ Already have
4. **Melody/Lead** - ✅ Already have
5. **Arrangement** - section markers, copy/move regions

### Priority Implementation Order
1. `add drums` command (beatbox9 with preset patterns)
2. `add intro/verse/chorus` arrangement commands
3. Push-to-talk for hands-free workflow
4. FX commands (nice to have)

## Technical Notes

### Drum Implementation Path
- Device: `beatbox9` already aliased in device-names.ts
- Need: Pattern presets (basic rock, trap, house, etc.)
- Need: `buildDrumPlan()` function in planner.ts
- Need: Drum pattern generator in executor.ts

### Arrangement Implementation Path
- NEXUS supports: moving/enabling/disabling regions
- Need: Section detection or user-specified bars
- Need: Copy/duplicate region commands

---

## Reference: Issue #28 Action Set

From the Producer Action Library issue:

| Action | Status |
|--------|--------|
| Add drums to track | ❌ Not implemented |
| Add 808/bass to drop | ✅ Implemented |
| Add chord progression | ✅ Implemented |
| Create/extend intro | ❌ Not implemented |
| Add riser/filter automation | ❌ Not implemented |
| Add reverb/delay effect | ❌ Not implemented |
| Basic mix move | ❌ Not implemented |

---

## Recommendations

1. **Next sprint focus:** Drums + Arrangement
2. **UX focus:** Push-to-talk (#54, #55)
3. **Polish:** Genre-aware suggestions (#53)

With drums and basic arrangement, users could create a simple but complete track structure.
