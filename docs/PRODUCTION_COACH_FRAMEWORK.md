# Audiotool Production Coach - Framework Document

> For wireframing and technical planning
> Created: 2026-07-15

---

## Core Concept

**Product Name:** Audiotool Production Coach

**One-liner:**
> Audiotool gives creators the studio. We help them understand what to do next.

**Central Promise:**
Turn musical ideas into finished tracks by guiding creators through every stage of production inside the DAW.

---

## The Problem We Solve

**Surface problem:** People don't know which buttons to press in a DAW.

**Real problem:** People have a musical idea, but they don't know the sequence of decisions required to turn that idea into a finished song.

**Key insight:** DAWs give users tools. They do not tell users what to do next.

---

## User Journey: Idea to Arranged Loop

```
┌─────────────────────────────────────────────────────────────────┐
│  USER INPUT                                                      │
│  "I want to make a dark, soulful house track that feels         │
│   cinematic."                                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  COACH CREATES PRODUCTION CHECKLIST                              │
│                                                                  │
│  □ 1. Select a reference track                                  │
│  □ 2. Establish BPM and key                                     │
│  □ 3. Create foundational chord progression                     │
│  □ 4. Choose drums and bass                                     │
│  □ 5. Build an eight-bar loop                                   │
│  □ 6. Expand into arrangement                                   │
│  □ 7. Add transitions and movement                              │
│  □ 8. Review the mix                                            │
│  □ 9. Prepare for mastering                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  COACH ANALYZES SESSION STATE                                    │
│                                                                  │
│  Reading from NEXUS:                                            │
│  • Current devices/instruments                                  │
│  • Track regions and arrangement                                │
│  • BPM, key, time signature                                     │
│  • Routing and effects chain                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  COACH IDENTIFIES CURRENT STAGE                                  │
│                                                                  │
│  "You have drums, bass, and chords. The arrangement stays at   │
│   the same energy for 32 bars."                                 │
│                                                                  │
│  NEXT STEP: Create contrast before the drop.                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  USER CHOOSES ACTION                                             │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Explain it  │  │  Show me     │  │  Suggest a   │          │
│  │              │  │  where       │  │  change      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │  Apply a safe change (via NEXUS)                 │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  CHECKLIST UPDATES AUTOMATICALLY                                 │
│                                                                  │
│  ✓ 1. Select a reference track                                  │
│  ✓ 2. Establish BPM and key                                     │
│  ✓ 3. Create foundational chord progression                     │
│  ✓ 4. Choose drums and bass                                     │
│  ✓ 5. Build an eight-bar loop                                   │
│  ▶ 6. Expand into arrangement  ← CURRENT                        │
│  □ 7. Add transitions and movement                              │
│  □ 8. Review the mix                                            │
│  □ 9. Prepare for mastering                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature Hierarchy

### MVP (Hackathon Scope)

| Feature | Description | NEXUS Dependency |
|---------|-------------|------------------|
| Project-goal intake | User describes desired track vibe | None (text input) |
| Dynamic production checklist | 9-step workflow tracker | None (UI state) |
| DAW-state analysis | Read current session | NEXUS session API |
| Next-step recommendation | Context-aware suggestion | LLM + session data |
| Educational explanation | "Here's why..." | LLM |
| One-click safe action | Apply change via NEXUS | NEXUS write API |
| Progress tracking | Auto-update checklist | Session comparison |

### Strong Secondary Features

| Feature | Description | Integration |
|---------|-------------|-------------|
| Reference-track guidance | Analyze BPM/key/structure of reference | Audio analysis |
| **Chord Genesis integration** | Generate progressions matching goal | Existing app |
| Arrangement analysis | Identify energy curves, repetition | NEXUS + LLM |
| Session-intent memory | Remember creative decisions | Custom storage |
| Beginner/Advanced modes | Adjust explanation depth | User preference |

### Future Specialist Modules

```
┌─────────────────────────────────────────────────────────────┐
│                   PRODUCTION COACH (Core)                    │
├─────────────┬─────────────┬─────────────┬─────────────┬────┤
│   Harmony   │    Drums    │  Arrange-   │     Mix     │ DJ │
│   Coach     │    Coach    │   ment      │    Coach    │Coach│
│             │             │   Coach     │             │    │
│  (Chord     │  (Pattern   │  (Structure │  (EQ/Comp/  │(For│
│   Genesis)  │   builder)  │   analysis) │   Levels)   │sets│
└─────────────┴─────────────┴─────────────┴─────────────┴────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
     ┌────────▼────────┐           ┌─────────▼─────────┐
     │ Cultural Context │           │ Creative-Intent   │
     │ Module           │           │ Memory            │
     │                  │           │                   │
     │ (Non-Western     │           │ (Remember "why"   │
     │  traditions)     │           │  not just "what") │
     └──────────────────┘           └───────────────────┘
```

---

## Chord Genesis Integration

**Current state:** Standalone app at port 3001

**Future state:** Harmony specialist within Production Coach

**Trigger example:**
> "Your track has drums and bass, but no harmonic foundation. Would you like help generating a chord progression?"

**Parameters passed to Chord Genesis:**
- Desired mood (from project goal)
- Key (from session or user input)
- Genre
- Complexity level
- Reference track characteristics
- Existing bass notes (from session)

**Return to Coach:**
- Generated progression
- MIDI data for NEXUS injection
- Explanation of theory choices

---

## Creative-Intent Memory

**What DAW already saves:**
- Devices, regions, routing, parameters, arrangement state

**What we add (creative intent):**
- "The user wants the chorus to feel triumphant."
- "Version two had the preferred bass."
- "The reference is a cinematic house track."
- "Do not remove the tabla rhythm."
- "The mix is intended for live performance."
- "The user rejected a brighter lead."

**Storage approach:**
- JSON file per project
- Keyed to Audiotool session ID
- Versioned with timestamps

```json
{
  "session_id": "abc123",
  "project_goal": "dark, soulful house that feels cinematic",
  "reference_tracks": ["Track A - Artist X"],
  "creative_decisions": [
    {"timestamp": "2026-07-15T10:30:00Z", "decision": "Keep tabla rhythm in verse"},
    {"timestamp": "2026-07-15T10:45:00Z", "decision": "Rejected brighter lead synth"}
  ],
  "current_stage": 6,
  "completed_steps": [1, 2, 3, 4, 5]
}
```

---

## Demo Script (90 seconds)

**0:00 - 0:15 | Problem Setup**
> "Most DAWs give you tools but don't tell you what to do next. Beginners get stuck."

**0:15 - 0:30 | Goal Input**
> User types: "I want to make a dark, soulful house track that feels cinematic."
> Coach generates 9-step checklist.

**0:30 - 0:45 | Session Analysis**
> Coach reads Audiotool session via NEXUS.
> "You have drums, bass, and chords. Everything enters at once."

**0:45 - 1:00 | Recommendation + Action**
> "Create an 8-bar intro by muting the bass and reducing drum density."
> User clicks "Apply safe change."
> NEXUS modifies the arrangement. Checklist updates.

**1:00 - 1:30 | Explain + Scale**
> "That's Production Coach. It can also generate chords via Chord Genesis, remember your creative intent across sessions, and eventually support mixing, transitions, and cultural music traditions."

---

## NEXUS API Requirements (To Verify)

| Capability | Needed For | Priority |
|------------|-----------|----------|
| Read current devices | Know what instruments exist | Critical |
| Read track regions | Understand arrangement structure | Critical |
| Read BPM/key/time sig | Context for recommendations | Critical |
| Write/modify regions | "Apply safe change" | Critical |
| Read routing/effects | Mix analysis (later) | Medium |
| Inject MIDI | Chord Genesis integration | Medium |
| Read parameter values | Detailed analysis | Low |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│  ┌─────────────┐  ┌─────────────────┐  ┌────────────────────┐  │
│  │ Goal Input  │  │ Checklist View  │  │ Recommendation     │  │
│  │             │  │                 │  │ Panel              │  │
│  └─────────────┘  └─────────────────┘  └────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PRODUCTION COACH CORE                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Session      │  │ Stage        │  │ Recommendation       │  │
│  │ Analyzer     │  │ Detector     │  │ Engine (LLM)         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Intent       │  │ Action       │  │ Specialist           │  │
│  │ Memory       │  │ Executor     │  │ Router               │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────────────────┐
│  NEXUS API      │ │ LLM API     │ │ SPECIALIST MODULES          │
│                 │ │ (Claude/    │ │                             │
│  • Read session │ │  GPT/etc)   │ │ • Chord Genesis             │
│  • Write actions│ │             │ │ • Drum Coach (future)       │
│                 │ │             │ │ • Mix Coach (future)        │
└─────────────────┘ └─────────────┘ └─────────────────────────────┘
```

---

## Competitive Differentiation

| Existing Solution | What It Does | Our Advantage |
|-------------------|--------------|---------------|
| YouTube tutorials | Passive learning | Active, context-aware guidance |
| Splice tutorials | Pre-made projects | Works with YOUR project |
| ChatGPT | Generic music advice | Reads actual DAW session |
| BandLab AI | Generates full tracks | Teaches you to create |
| iZotope Assistants | Mix/master only | Full production workflow |

**Key differentiator:** We're not generating music FOR you. We're teaching you what to do next WITH your own creative input.

---

## Next Steps

1. **Verify NEXUS API** - Confirm read/write session capabilities
2. **Wireframe UI** - Checklist panel, recommendation cards, action buttons
3. **Build MVP** - Goal → Checklist → Analyze → Recommend → Act
4. **Integrate Chord Genesis** - First specialist module
5. **Demo prep** - 90-second script with live Audiotool session

---

## Research Evidence (Summary)

**Pain points validated:**
- 94% of AI music training data is Western ([arXiv](https://arxiv.org/pdf/2412.04100))
- "40 files you actually love" version chaos ([Jack Righteous](https://jackrighteous.com/en-us/blogs/music-creation-process-guide/ai-music-workflow-explained))
- "AI tools give finished files, not workflows" ([Toolworthy](https://www.toolworthy.ai/blog/suno-alternatives))
- Suno Studio regression: "no longer generates individual tracks" ([Opus Blog](https://www.opus.pro/blog/ai-music-news-april-2026))

**NEXUS capabilities:**
- "AI-to-AI communication within the DAW—an industry first" ([AccessNewswire](https://www.accessnewswire.com/newsroom/en/computers-technology-and-internet/audiotool-launches-multiplayer-cloud-daw-and-debuts-nexus-an-indu-1129612))
- "Audio engine, routing, signal-processing, MIDI, automation control" ([Yahoo Finance](https://finance.yahoo.com/news/audiotool-launches-multiplayer-cloud-daw-170000346.html))
