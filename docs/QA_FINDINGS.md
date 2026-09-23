# QA Findings: NEXUS Integration Gaps

**Date:** 2026-09-23
**Tester:** Isayah + Claude

---

## Summary

After testing Production Coach against a live Audiotool project and comparing to the [ambient-chess](https://github.com/kyrylo-polozyuk/ambient-chess) reference app, several gaps were identified.

---

## What Works

| Feature | Status |
|---------|--------|
| Chat server (Dr. Zay) | ✅ Responds with coaching advice |
| Agent bridge analyze | ✅ Reads BPM, devices, sections |
| Plan/preview flow | ✅ Generates valid plans |
| ElevenLabs TTS | ✅ Configured |
| IONOS API | ✅ Working (new key) |

---

## What Needs Verification

| Feature | Status | Notes |
|---------|--------|-------|
| Instruments connected | ❓ | Do created devices actually route to mixer? |
| Apply flow | ❓ | Do plans actually create content in Audiotool? |
| Real-time sync | ❌ | Unlike ambient-chess, we don't update in real-time |

---

## Root Cause: Architecture Difference

### ambient-chess (reference app)
```
Browser → OAuth login → Direct NEXUS SDK → Instant entity updates
```
- Uses `nexus.modify()` to create devices directly
- Updates tonematrix patterns in real-time as chess moves happen
- No plan/preview/apply overhead

### Production Coach (our app)
```
Browser → Bridge Server (PAT) → Plan → Preview → Apply → Audiotool
```
- Extra abstraction layer adds complexity
- PAT auth requires server-side handling
- Plan/apply flow can fail silently

---

## Action Items Before Demo

### Must Test
- [ ] `add trap drums at bar 1` - verify Beatbox 9 appears + plays
- [ ] `add 808 at bar 1` - verify bassline appears + plays
- [ ] `add melody in C major at bar 1` - verify Heisenberg synth + notes
- [ ] `add chords in Am at bar 1` - verify chord pads appear
- [ ] Verify audio cables connect to mixer (can hear output)

### Test Environment
- Use fresh empty Audiotool project
- Connect via UI (paste project URL)
- Run each command, check Audiotool studio for results

---

## Technical Debt (Post-Hackathon)

1. **Consider OAuth flow** - ambient-chess proves browser-side NEXUS works
2. **Simplify plan/apply** - reduce failure points
3. **Better error messages** - surface NEXUS errors to user
4. **Real-time sync** - update on every change, not just on apply

---

## Key Learning: How ambient-chess Creates Devices

```typescript
// From ambient-chess/src/nexus/projectSetup.ts
await nexus.modify((t) => {
  // Create the sequencer
  const tonematrix = t.create("tonematrix", {
    displayName: "Ambient Chess",
    isActive: true,
  })

  // Create synth
  const synth = t.create("pulverisateur", { ... })

  // Create effects chain
  const phaser = t.create("stompboxPhaser", { ... })
  const reverb = t.create("quasar", { ... })

  // Wire them together
  t.create("desktopNoteCable", {
    fromSocket: tonematrix.fields.noteOutput.location,
    toSocket: synth.fields.notesInput.location,
  })
  t.create("desktopAudioCable", {
    fromSocket: synth.fields.audioOutput.location,
    toSocket: phaser.fields.audioInput.location,
  })
  // ... chain continues to mixer
})
```

This is what we should be doing when Dr. Zay says "add an 808".

---

## Team Responsibilities

| Role | Person | Status |
|------|--------|--------|
| Frontend | Isayah | UI works, connects to bridge |
| Backend | Nolan | Bridge works, NEXUS entity creation needs verification |
| QA | Arian | End-to-end testing needed with real projects |

---

*This doc should be shared with the team and converted to GitHub issues as needed.*
