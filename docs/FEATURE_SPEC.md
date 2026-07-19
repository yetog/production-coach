# Feature Spec: Every Feature, Sketched and Scoped

> Author: Aryan
> All features from planning, organized by build difficulty against what NEXUS actually confirms is readable and writable today.

**Difficulty Key:**
- 🟢 **LOW** — confirmed, minimal new work
- 🟡 **MED** — feasible, real effort
- 🔴 **HIGH** — possible, high risk
- ⛔ **CUT** — not feasible / unconfirmed

---

## NEXUS Capabilities

### CAN READ / DO ✓
- Every note: exact MIDI pitch, timing, velocity — **live**
- Every device on the desktop, by exact type, with live parameters
- Timeline structure: tracks, regions, patterns, automation
- How devices are wired together (cables)
- All of it live — events fire in **~150–300ms**

### CANNOT (Confirmed or Unconfirmed) ✗
- No selection, cursor, or highlight state
- No transport / play-pause state — **unconfirmed**
- No raw audio — symbolic data only
- No sample library search or browsing
- Nothing outside this one project's document

---

## What This Plugin Actually Is

| NOT THIS | NOT THIS | THIS |
|----------|----------|------|
| A chatbot you have to babysit | A generator that makes the music for you | **A quiet companion that helps you understand your own music** |

It watches what you build in real time and helps you understand it — what a device does, what your track is missing, why a chord choice works.

> **You stay the producer.**
> **It stays a friend looking over your shoulder.**

- Never lecturing
- Never in the way
- Speaks up only when useful
- Quiet the moment it isn't

For a beginner staring at an empty session with no idea where to start, that's the entire point — a second opinion that's always there, never annoying, and never pretends to make the music for you.

---

## Channel A vs Channel B — Who Speaks First

### Channel A — Ambient (Unprompted)
- **Trigger:** something happened — you didn't ask
- **Looks like:** collapsed pill glows, one short spoken line
- **Example:** you play a chord, it reacts a few seconds later
- **Restraint:** cooldowns, no-repeat, flow-state suppression govern it

### Channel B — Chat (Prompted)
- **Trigger:** you asked it something
- **Looks like:** strip expands into a chat drawer while active
- **Example:** you ask "what's missing here?", it answers directly
- **Restraint:** none — a direct question always gets an immediate answer

Same app, same strip, one voice — Channel A is it noticing things, Channel B is it answering you.

---

## UI: The Screen, Sketched

Two windows snapped side by side — Audiotool untouched on the left, the companion docked as a slim strip on the right.

```
┌─────────────────────────────────────┐  ┌─────────────────────────────────────┐
│ COLLAPSED — DEFAULT STATE (90%)     │  │ EXPANDED — ONLY WHILE CHAT ACTIVE  │
├─────────────────────────────────────┤  ├─────────────────────────────────────┤
│                                     │  │                                     │
│  audiotool.com/studio               │  │  audiotool.com/studio               │
│                                     │  │                                     │
│  ┌───────────────────────────────┐  │  │  ┌───────────────────────────────┐  │
│  │                           ○   │  │  │  │                      ┌──────┐│  │
│  │   [Device]──[Device]     Fmaj7│  │  │  │   [Device]──[Device] │Fmaj7 ││  │
│  │      │                        │  │  │  │      │               │borr. ││  │
│  │   [Device]                    │  │  │  │   [Device]           │iv    ││  │
│  │                               │  │  │  │                      └──────┘│  │
│  │  ◀ CHANNEL A — glows & speaks │  │  │  │  ◀ CHANNEL A still visible   │  │
│  │                               │  │  │  │  ┌────────────────────────┐  │  │
│  │  ┌─────────────────────────┐  │  │  │  │  │ what's missing here?   │  │  │
│  │  │                         │  │  │  │  │  ├────────────────────────┤  │  │
│  │  │                         │  │  │  │  │  │ no low end yet —       │  │  │
│  │  │                      💬 │  │  │  │  │  │ try a Kobolt sub       │  │  │
│  │  │ ◀ CHANNEL B — dormant   │  │  │  │  │  │ ◀ CHANNEL B drawer     │  │  │
│  │  └─────────────────────────┘  │  │  │  │  └────────────────────────┘  │  │
│  └───────────────────────────────┘  │  │  └───────────────────────────────┘  │
└─────────────────────────────────────┘  └─────────────────────────────────────┘
```

The green zone (Channel A) is always present — a glow, a status line. The gray zone (Channel B) only exists at full size while a conversation is happening, then collapses back to a dormant icon the moment it settles.

---

## 00 Architecture Foundation

*Not a feature — the base every other capability sits on.*

| Feature | Difficulty | Notes |
|---------|------------|-------|
| Bot joins live session | 🟢 LOW | Companion app connects as a second participant, same as the SDK is designed for |
| Read-only event/query pipeline | 🟢 LOW | onCreate, onUpdate, queryEntities — all confirmed and documented |

---

## 01 Channel A — Ambient Coach

*Reactive, hero feature. Speaks up only when something meaningful happens.*

| Feature | Difficulty | Notes |
|---------|------------|-------|
| Live chord/key narration | 🟢 LOW | Real MIDI pitch data via note entities; use an existing open-source theory library, don't hand-roll detection |
| Instrument recognition | 🟢 LOW | Entity type IS the identity — no LLM guessing, just a static glossary lookup |
| Rhythm/density feedback | 🟡 MED | Pattern step data is readable; the density heuristic and phrasing need real tuning |
| "What's missing" gap check | 🟡 MED | Full session inventory query + reasoning against the stated intent profile |
| Intent-aware suggestions | 🟢 LOW | Mostly prompt design — no new data access required |
| Idle-nudge system | 🟢 LOW | Client-side timer plus existing data — no unconfirmed APIs needed |
| Flow-state suppression | 🟢 LOW | Simple heuristic on event frequency — stays quiet when you're heads-down |
| Chattiness modes + cooldowns | 🟢 LOW | Local state machine — Quiet/Normal/Chatty, no SDK dependency |
| Live visual readout | 🟡 MED | Data is free; rendering the glow/status view well takes real design time |
| Attribution companion | 🟢 LOW | Secondary/optional — same pipeline as narration, just a different prompt |

---

## 02 Channel B — Chat Assistant

*On-demand, guest-initiated. Silent footprint until asked.*

| Feature | Difficulty | Notes |
|---------|------------|-------|
| Session-grounded Q&A | 🟡 MED | Needs a clean session-state summarization step feeding the LLM's context |
| "What should I add?" | 🟡 MED | Feasible via the built-in device glossary; quality depends on curation work |
| "Where exactly do I find it?" | ⛔ CUT | No documented API to search Audiotool's real sample catalog — scoped to built-in devices only |
| Collapsible chat UI | 🟡 MED | Real UX work to nail the "quiet by default, expands on demand" feel |
| Voice input for questions | 🟢 LOW | Well-trodden speech-to-text integration, low risk |

---

## 03 Onboarding

| Feature | Difficulty | Notes |
|---------|------------|-------|
| Intent capture | 🟢 LOW | Genre/vibe, 1-2 taps — pure UI, no SDK dependency |
| Grounded starting suggestions | 🟡 MED | Combines the device glossary with the captured intent profile |

---

## 04 UI / Presentation

| Feature | Difficulty | Notes |
|---------|------------|-------|
| Compact strip, collapsed by default | 🟡 MED | The core anti-overwhelm design — worth dedicating real design time to |
| Single-tab iframe embed | ❓ TBD | Needs a 10-min spike to check if Audiotool blocks embedding — bonus, not load-bearing |

---

## 05 Explicitly Cut / Not Buildable

*So nobody reintroduces these mid-build after they already hit a wall.*

| Feature | Status | Reason |
|---------|--------|--------|
| Highlighting inside Audiotool's canvas | ⛔ CUT | No selection/highlight/cursor entity exists in the schema |
| Real audio / mix analysis | ⛔ CUT | NEXUS exposes symbolic data only — never raw audio |
| Sample-file recommendations | ⛔ CUT | No documented sample catalog search API |
| Play/pause detection | ❓ TBD | No documented transport entity — needs a real Nolan spike, don't assume either way |
| Agent writes notes itself | ⚠️ OUT | nexus.modify supports this technically — **deliberately not part of this build** |

---

## Bottom Line

Everything in **Channel A is low-to-medium risk** and fully grounded in confirmed SDK data — build time goes there first.

Channel B is real and valuable but carries more engineering weight, especially session summarization.

The cut list exists to **protect the timeline**, not to close the door forever.

---

## 06 Notes from the Room

*The critiques that actually reshaped this design, and the concerns still worth watching every time a feature gets added.*

### What Shaped This

- **"Go bigger than just chords."** A beginner isn't doing music theory, they're pulling instruments together, confused about what a snare even is. Directly led to instrument recognition + gap-checking, not just harmonic narration.

- **"A producer doesn't just play — they click around, search for sounds."** Reshaped the demo narrative away from pure melodic playing, and is the direct origin of Channel B.

- **"People don't want to be lectured."** Needs to feel like a producer friend crafting your vision with you, not a professor. Rebuilt the entire persona/tone around this — theory is opt-in, never default.

- **"Worried about ElevenLabs cost."** Confirmed manageable — hackathon credits cover the build, and the chattiness cooldowns double as a real cost control, not just a UX one.

- **"Can we use open source models too?"** Yes — validated Groq for low-latency reasoning and existing theory libraries instead of hand-building chord detection.

### Watch Out For

- **UI too bogged down.** Default view must stay glanceable — one line, a status glow — never a running feed or wall of text to read.

- **UI getting in the way of the DAW.** Collapsed-by-default strip, not a second dashboard competing for attention. Expand only when summoned, then collapse back down on its own.

- **Backseat-driving annoyance.** Cooldown numbers (90s/40s, no-repeat, flow-state suppression) are starting points, not gospel — budget real Phase 3 time to sit with it live and retune.

- **Transport/play-pause state.** Still unconfirmed whether the bot can detect this at all — needs a real spike, don't design a feature that assumes an answer either way.

- **Scope creep back into cut features.** Sample-file search and DAW-canvas highlighting were both closed for real technical reasons — don't let them quietly reappear mid-build.
