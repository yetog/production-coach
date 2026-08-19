# Production Coach Demo Script

> 90-second video demo for Audiotool NEXUS SDK Hackathon
> Last Updated: 2026-08-19

---

## Overview

**Goal:** Show end-to-end song creation using Dr. Zay and the CommandCenter
**Duration:** 90 seconds
**Format:** Screen recording with voiceover

---

## Pre-Demo Setup

- [ ] Fresh Audiotool project (empty or minimal)
- [ ] Production Coach open at zaylegend.com/production-coach
- [ ] NEXUS connection established (green indicator)
- [ ] Audio output ready for playback
- [ ] Screen recording software ready

---

## Script

### [0:00-0:10] INTRO - Setting the Scene

**Screen:** Empty Audiotool project + Production Coach sidebar

**Voiceover:**
> "Let's build a track from scratch using Production Coach and Dr. Zay, our AI production mentor."

**Action:** Show the empty timeline, highlight the CommandCenter input

---

### [0:10-0:25] DRUMS - Foundation

**Command:** `add trap drums at bar 1`

**Screen:**
- Beatbox 9 appears in device rack
- Note track created with drum pattern
- Notes visibly written to timeline

**Voiceover:**
> "First, let's lay down some drums. I'll ask for a trap pattern."

**Action:** Hit play, let 4 bars loop

**Playback:** ~4 seconds of drums only

---

### [0:25-0:40] BASS - Low End

**Command:** `add a dark 808 under the drop`

**Screen:**
- Bassline device appears
- Note track with 808 pattern
- Routed to mixer

**Voiceover:**
> "Now let's add some 808s to fill out the low end."

**Action:** Play drums + bass together

**Playback:** ~4 seconds of drums + bass

---

### [0:40-0:55] CHORDS - Harmony

**Command:** `add jazzy chords in Am at bar 1`

**Screen:**
- Space synth (pad) appears
- Chord progression written
- ii-V-I-vi pattern visible

**Voiceover:**
> "Let's add some jazzy chords in A minor to give it that smooth vibe."

**Action:** Play all three elements

**Playback:** ~4 seconds of drums + bass + chords

---

### [0:55-1:10] MELODY - Top Line

**Command:** `add a melody in A minor over the drop`

**Screen:**
- Heisenberg synth appears
- Melodic pattern written
- Scale-based notes visible

**Voiceover:**
> "Finally, a melody to tie it all together."

**Action:** Full playback with all 4 elements

**Playback:** ~6 seconds of complete track

---

### [1:10-1:25] DR. ZAY COACHING - The Mentor

**Switch to:** Chat interface with Dr. Zay

**Message:** `How can I make this drop hit harder?`

**Screen:** Dr. Zay's response with production tips

**Voiceover:**
> "And if you need guidance, Dr. Zay is here to coach you through the process - not to do it for you, but to help you grow as a producer."

**Show:** Dr. Zay giving specific, actionable advice about:
- Adding a riser before the drop
- Using sidechain compression
- Layering the 808 with a sub

---

### [1:25-1:30] OUTRO - Wrap Up

**Screen:** Final arrangement view showing all tracks

**Voiceover:**
> "Production Coach - your AI mentor for music production. Built with the NEXUS SDK."

**Text Overlay:**
```
PRODUCTION COACH
Built with Audiotool NEXUS SDK
github.com/yetog/production-coach
```

---

## Key Talking Points

1. **Natural Language Commands** - No need to learn complex DAW workflows
2. **Real-Time DAW Integration** - Changes appear instantly in Audiotool
3. **Teaching, Not Replacing** - Dr. Zay coaches, doesn't just auto-generate
4. **Genre-Aware** - Understands trap, house, hip-hop, jazz, etc.
5. **Music Theory Built-In** - Knows scales, chords, progressions

---

## Fallback Commands

If something doesn't work during recording, use these safe alternatives:

| If This Fails | Try This Instead |
|---------------|------------------|
| `add trap drums` | `add drums at bar 1` |
| `add jazzy chords` | `add chords in Am` |
| `add melody in Am` | `add a lead in A minor at bar 1` |
| Drop detection fails | Always specify `at bar 1` |

---

## Technical Checklist

Before recording:

- [ ] NEXUS SDK connection stable
- [ ] Server running (`curl localhost:3021/api/health`)
- [ ] IONOS API key valid
- [ ] ElevenLabs API key valid (for voice)
- [ ] No console errors in browser
- [ ] Test each command once before recording

---

## B-Roll Ideas

If time permits, capture:

- Close-up of notes being written to timeline
- Device rack filling up
- Mixer channels being created
- Dr. Zay chat conversation
- The "plan preview" showing what will happen

---

## Post-Production Notes

- Add captions for accessibility
- Highlight commands as they're typed
- Add subtle zoom on key moments
- Consider split-screen: CommandCenter + Audiotool
- Music bed: Use the track being created!

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-08-19 | Initial script with drums, bass, chords, melody flow |
