# Production Coach Capability Audit

> Status check: Can a user create a full song with Dr. Zay?
> Date: 2026-08-20

---

## Current Capabilities

| Feature | Status | Notes |
|---------|--------|-------|
| Chat with Dr. Zay | ✅ Working | Teaching mode, gives advice |
| 808 / Sub Bass | ✅ Working | `add 808 under the drop` |
| Melodies | ✅ Working | `add melody in C major at bar 1` |
| Chords | ✅ Working | `add jazzy chords in Am` |
| Drums | ✅ Working | `add trap drums for 32 bars` |
| Copy/Extend | ✅ Working | `copy the drums to bar 49` |
| Add Device | ✅ Working | `add a heisenberg` (generic) |
| Voice Input | ✅ Working | Hold Y to talk (push-to-talk) |
| Voice Output | ✅ Working | ElevenLabs TTS |

## Missing for Full Song Creation

| Feature | Status | Priority | Issue |
|---------|--------|----------|-------|
| **Drums/Beats** | ✅ Working | - | Implemented |
| **Arrangement** | ✅ Working | - | Duration/range + copy/extend |
| **Push-to-talk** | ✅ Working | - | #54, #55 - Hold Y to talk |
| **Copy/Extend** | ✅ Working | - | Implemented |
| **FX/Effects** | ❌ Missing | MEDIUM | #28 |
| **Automation** | ❌ Missing | MEDIUM | #28 |
| **Mix Moves** | ❌ Missing | LOW | #28 |
| **Genre Buttons** | ❌ Missing | LOW | #53 |

## Can a User Make a Full Song?

**Short answer: YES!**

A user CAN now:
1. Get coaching advice from Dr. Zay
2. Add bass lines (808)
3. Add melodies with scales
4. Add chord progressions
5. Add drum patterns (trap, house, hip-hop, etc.)
6. Copy content: "copy the drums to bar 49"
7. Extend content: "extend the 808 for 16 more bars"
8. Specify exact duration: "for 32 bars"
9. Specify bar ranges: "from bars 1-32"
10. Add individual synth devices
11. Use voice commands hands-free (Hold Y)

A user CANNOT yet:
1. Add effects (reverb, delay, compression)
2. Create automation (filter sweeps, risers)

## Arrangement Features

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

**Copy Commands:**
```
copy the drums to bar 49
copy the trap beat to bar 33
duplicate the 808 to bar 65
repeat the melody to bar 17
```

**Extend Commands:**
```
extend the drums for 16 bars
extend the 808 for 32 more bars
continue the chords 16 bars
lengthen the melody by 8 bars
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
1. ~~`add drums` command (beatbox9 with preset patterns)~~ ✅ Done
2. ~~Push-to-talk for hands-free workflow~~ ✅ Done (Hold Y)
3. `add intro/verse/chorus` arrangement commands
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
| Add drums to track | ✅ Implemented (trap, house, hip-hop, etc.) |
| Add 808/bass to drop | ✅ Implemented |
| Add chord progression | ✅ Implemented |
| Add melody | ✅ Implemented |
| Create/extend intro | ❌ Not implemented |
| Add riser/filter automation | ❌ Not implemented |
| Add reverb/delay effect | ❌ Not implemented |
| Basic mix move | ❌ Not implemented |

---

## Recommendations

1. ~~**Next sprint focus:** Drums + Arrangement~~ ✅ Complete
2. ~~**UX focus:** Push-to-talk (#54, #55)~~ ✅ Hold Y to talk
3. ~~**Copy/duplicate regions**~~ ✅ Implemented
4. **Next:** FX commands (reverb, delay)
5. **Polish:** Genre-aware suggestions (#53)

**READY FOR DEMO:** With drums, bass, melodies, chords, copy/extend, and push-to-talk, users can now create complete tracks using voice commands!
