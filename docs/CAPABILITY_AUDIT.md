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
| **Drums/Beats** | ✅ Working | - | Implemented |
| **Arrangement** | ✅ Partial | MEDIUM | Duration/range syntax added |
| **FX/Effects** | ❌ Missing | MEDIUM | #28 |
| **Automation** | ❌ Missing | MEDIUM | #28 |
| **Mix Moves** | ❌ Missing | LOW | #28 |
| **Push-to-talk** | ❌ Missing | HIGH | #54, #55 |
| **Genre Buttons** | ❌ Missing | LOW | #53 |

## Can a User Make a Full Song?

**Short answer: Almost!**

A user CAN now:
1. Get coaching advice from Dr. Zay
2. Add bass lines (808)
3. Add melodies with scales
4. Add chord progressions
5. Add drum patterns (trap, house, hip-hop, etc.)
6. Specify exact duration: "for 32 bars"
7. Specify bar ranges: "from bars 1-32"
8. Add individual synth devices

A user CANNOT yet:
1. Copy/duplicate existing content
2. Add effects (reverb, delay, compression)
3. Create automation (filter sweeps, risers)
4. Do hands-free voice commands (push-to-talk)

## Arrangement Features (NEW)

**Explicit Duration:**
```
add trap drums for 32 bars at bar 1
add melody in C major for 16 bars
add 808 for 32 bars
```

**Bar Ranges:**
```
add drums from bars 1-32
add chords in Am from bars 17-32
add melody from bar 1 to bar 16
```

**Song Structure Templates (Ready for future use):**
- EDM: intro → breakdown → drop → breakdown → drop → outro (64 bars)
- Hip-hop: intro → verse → chorus → verse → chorus → outro (56 bars)
- Pop: intro → verse → prechorus → chorus → verse → prechorus → chorus → bridge → chorus → outro (72 bars)
- Simple: intro → verse → chorus → outro (48 bars)
- Loop: intro → drop → outro (24 bars)

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
