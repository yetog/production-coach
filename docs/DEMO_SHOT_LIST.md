# Production Coach Demo Video - Shot List

## Overview
- **Duration:** 60-90 seconds
- **Focus:** NEXUS SDK integration for AI-powered music production
- **Project URL:** `https://www.audiotool.com/studio?project=aad73e40-33ad-4702-ac8b-049d427ed4ca`

---

## Shot List

### INTRO (0:00-0:10)
| # | Shot | Action | Audio/VO |
|---|------|--------|----------|
| 1 | Screen recording | Open empty Audiotool project in browser | "What if an AI could help you build a beat from scratch?" |
| 2 | Side-by-side | Show Production Coach UI in split view | Music starts softly |

### CONNECT (0:10-0:20)
| # | Shot | Action | Audio/VO |
|---|------|--------|----------|
| 3 | Production Coach UI | Paste project URL into connection box | "Just paste your project URL..." |
| 4 | Status indicator | Show "Connected" with green indicator | "...and you're connected." |
| 5 | Session info | Show BPM and device count | Brief pause |

### BUILD THE BEAT (0:20-0:55)

#### Drums (0:20-0:30)
| # | Shot | Action | Audio/VO |
|---|------|--------|----------|
| 6 | Command Center | Type: `add trap drums at bar 1` | "Start with some trap drums..." |
| 7 | Preview panel | Show plan preview with Beatbox 9 | "AI plans the move..." |
| 8 | Apply button | Click Apply, show loading | Beat builds |
| 9 | Audiotool | Cut to Audiotool showing new drum track | Drums playing |

#### 808 Bass (0:30-0:40)
| # | Shot | Action | Audio/VO |
|---|------|--------|----------|
| 10 | Command Center | Type: `add 808 at bar 1` | "Add some low end..." |
| 11 | Preview | Show 808 plan | Quick shot |
| 12 | Apply + Audiotool | Apply, show bass track appear | 808 kicks in |

#### Melody (0:40-0:50)
| # | Shot | Action | Audio/VO |
|---|------|--------|----------|
| 13 | Command Center | Type: `add melody in C major at bar 1` | "Layer in a melody..." |
| 14 | Apply + Audiotool | Show Heisenberg synth track | Melody plays |

#### Chords (0:50-0:55)
| # | Shot | Action | Audio/VO |
|---|------|--------|----------|
| 15 | Command Center | Type: `add jazzy chords in Am at bar 1` | "And some chord pads..." |
| 16 | Apply + Audiotool | Show chord track, full arrangement visible | Full beat playing |

### PLAYBACK (0:55-1:10)
| # | Shot | Action | Audio/VO |
|---|------|--------|----------|
| 17 | Audiotool fullscreen | Hit play, show all 4 elements playing | Let the beat ride for 10-15 seconds |
| 18 | Zoom out | Show full timeline with all tracks | Music continues |

### OUTRO (1:10-1:20)
| # | Shot | Action | Audio/VO |
|---|------|--------|----------|
| 19 | Logo/title card | "Production Coach" | "Production Coach - AI-powered music production" |
| 20 | Call to action | URL or GitHub link | "Built with NEXUS SDK" |

---

## Technical Checklist

### Before Recording
- [ ] Start agent bridge: `cd bot && npm run bridge`
- [ ] Start chat server: `cd server && node index.js`
- [ ] Open Audiotool with EMPTY project (or clear existing)
- [ ] Open Production Coach at `/production-coach`
- [ ] Test connection with project URL
- [ ] Test one command to verify everything works

### Commands That Work (Tested)
```
add trap drums at bar 1      → Creates Beatbox 9, trap pattern
add 808 at bar 1             → Creates 808 bassline
add melody in C major at bar 1 → Creates Heisenberg synth lead
add jazzy chords in Am at bar 1 → Creates chord pads
```

### Recording Tips
1. Use OBS or similar screen recorder
2. Record at 1080p minimum
3. Hide browser bookmarks/tabs for clean look
4. Use a fresh project to show the "from scratch" journey
5. Keep command typing smooth (no backspacing)
6. Pause briefly after each "Apply" to let it process

---

## Alternative: Shorter 30-Second Version

| Time | Action |
|------|--------|
| 0:00-0:05 | Intro + connection |
| 0:05-0:15 | Add drums + 808 (quick cuts) |
| 0:15-0:25 | Add melody + chords (quick cuts) |
| 0:25-0:30 | Full playback + logo |

---

## Notes

- **Dr. Zay Chat:** Currently offline due to API key issue - skip this for demo
- **Focus:** Show the NEXUS integration power (add elements to real Audiotool projects)
- **Wow factor:** Going from empty project to 4-element beat in under a minute
