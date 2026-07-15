# Production Coach - NEXUS Hackathon Pitch

---

## ONE-LINER

**Audiotool gives creators the studio. We help them understand what to do next.**

---

## THE PROBLEM

DAWs give users tools. They don't tell users what to do next.

Beginners have a musical idea but don't know the sequence of decisions to turn it into a finished song:
- Reference → BPM → Chords → Drums → Arrangement → Transitions → Mix → Master

They get stuck. They quit. Music doesn't get made.

---

## THE SOLUTION

**Production Coach** — an in-DAW assistant that:
1. Understands the current project via NEXUS
2. Identifies what stage you're at
3. Recommends what to do next
4. Can apply changes directly

---

## DEMO (90 seconds)

```
User: "I want dark, soulful house that feels cinematic"
           ↓
Coach creates 9-step checklist
           ↓
Coach reads session via NEXUS:
"You have drums, bass, chords — but everything enters at once"
           ↓
Coach recommends:
"Create 8-bar intro by muting bass, reducing drum density"
           ↓
User clicks: [Apply safe change]
           ↓
NEXUS modifies arrangement
Checklist updates automatically
```

---

## EXISTING WORK

**Chord Genesis** (live): https://zaylegend.com/chord-genesis
- Generates chord progressions based on key/mood
- ElevenLabs integration for AI music generation
- Becomes the "harmony specialist" module inside Production Coach

---

## WHY AUDIOTOOL WINS

| Benefit | How |
|---------|-----|
| More users finish music | Coach guides them through the full workflow |
| Lower learning curve | "What do I do next?" is answered in real-time |
| Platform stickiness | Users learn Audiotool's tools through the coach |
| NEXUS showcase | Demonstrates AI-to-DAW integration |

---

## TECH STACK

| Component | Technology |
|-----------|------------|
| Frontend | React + TypeScript |
| NEXUS SDK | `@audiotool/nexus` v0.0.17 |
| LLM | Claude API (server-side) |
| Audio | ElevenLabs (Chord Genesis integration) |
| Hosting | Self-hosted Linux server |

---

## MVP FEATURES

| Feature | NEXUS Dependency |
|---------|------------------|
| Project-goal intake | None |
| Dynamic checklist | None |
| Session analysis | NEXUS read API |
| Next-step recommendation | LLM + session data |
| One-click safe action | NEXUS write API |
| Progress tracking | Session comparison |

---

## TEAM

| Person | Role |
|--------|------|
| **Isayah** | Technical lead, NEXUS integration, Chord Genesis |
| **Aryan** | Product direction, judge criteria |
| **Nolan** | NEXUS API, Audiotool expertise |

---

## TIMELINE

**39 days remaining**

| Phase | Focus |
|-------|-------|
| Week 1 | NEXUS SDK setup, session reading |
| Week 2 | Coach logic, checklist UI |
| Week 3 | Action execution via NEXUS |
| Week 4 | Chord Genesis integration |
| Week 5 | Polish, demo prep |

---

## LINKS

| Resource | URL |
|----------|-----|
| Chord Genesis | https://zaylegend.com/chord-genesis |
| NEXUS SDK | https://github.com/audiotool/nexus |
| Developer Portal | https://developer.audiotool.com |
| Submission Form | https://forms.gle/NK2Mmw5sUo1FNqrx5 |
