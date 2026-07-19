# Production Coach

> **NEXUS Hackathon Entry** | Team: Isayah, Aryan, Nolan, Randall
>
> A quiet companion that helps you understand your own music.

---

## What This Is

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

---

## Two Channels, One Voice

### Channel A — Ambient Coach (Unprompted)
- Trigger: something happened — you didn't ask
- Looks like: collapsed pill glows, one short spoken line
- Example: you play a chord, it reacts a few seconds later

### Channel B — Chat Assistant (Prompted)
- Trigger: you asked it something
- Looks like: strip expands into a chat drawer
- Example: you ask "what's missing here?", it answers directly

---

## Demo Flow

```
User opens empty session, selects "dark house" intent
                    ↓
Adds a Heisenberg synth, plays some chords
                    ↓
Coach (ambient): "Fmaj7 · borrowed iv — nice tension"
                    ↓
User asks: "what's missing here?"
                    ↓
Coach (chat): "no low end yet — try a Kobolt sub"
                    ↓
User adds bass, keeps building
                    ↓
Coach stays quiet during flow state
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| DAW Integration | NEXUS SDK (`@audiotool/nexus` v0.0.17) |
| AI Reasoning | Claude API / Groq (low-latency) |
| Voice | ElevenLabs TTS |
| Theory Detection | Tonal.js (open source) |
| Frontend | React + TypeScript |

---

## NEXUS Capabilities

### Can Read ✓
- Every note: MIDI pitch, timing, velocity — **live**
- Every device on the desktop, by type, with parameters
- Timeline: tracks, regions, patterns, automation
- Cable routing between devices
- Events fire in ~150–300ms

### Cannot Read ✗
- Selection/cursor state
- Transport (play/pause) — unconfirmed
- Raw audio — symbolic only
- Sample catalog

---

## Project Structure

```
production-coach/
├── README.md              # You are here
├── docs/
│   ├── FEATURE_SPEC.md    # Full feature breakdown with difficulty ratings
│   ├── SIGNAL_MAP.md      # Judge analysis → pain points → ideas
│   ├── PITCH.md           # 1-page pitch for judges
│   ├── RESOURCES.md       # All links, SDKs, device reference
│   ├── SDK_AND_MCP_MAPPING.md  # NEXUS API mapping
│   └── ...
├── mcp-server/
│   ├── src/
│   │   ├── index.ts
│   │   ├── tools/
│   │   ├── prompts/
│   │   └── resources/
│   └── package.json
└── examples/
```

---

## Feature Priority

### Phase 1: Channel A (Hero)
- 🟢 Bot joins live session
- 🟢 Live chord/key narration
- 🟢 Instrument recognition
- 🟢 Flow-state suppression
- 🟢 Chattiness cooldowns

### Phase 2: Channel B
- 🟡 Session-grounded Q&A
- 🟡 "What should I add?"
- 🟢 Voice input

### Phase 3: Polish
- 🟡 Collapsible UI
- 🟡 Intent capture (onboarding)
- Live tuning of cooldowns

### Explicitly Cut
- ⛔ Highlighting in DAW canvas
- ⛔ Raw audio analysis
- ⛔ Sample catalog search
- ⚠️ Agent writes notes (out of scope)

---

## Team

| Person | Role |
|--------|------|
| **Isayah** | Technical lead, NEXUS integration, Chord Genesis |
| **Aryan** | Product direction, judge strategy, domain expert |
| **Nolan** | NEXUS API, Audiotool platform |
| **Randall** | TBD |

---

## Key Resources

| Resource | Link |
|----------|------|
| Audiotool Studio | https://audiotool.com |
| NEXUS SDK | https://github.com/audiotool/nexus |
| Developer Portal | https://developer.audiotool.com |
| Prototype | https://celadon-bombolone-9819d2.netlify.app |

---

## Status

- [x] Pain point research
- [x] Judge signal mapping
- [x] SDK capability audit
- [x] Feature spec with difficulty ratings
- [x] UI wireframes
- [ ] NEXUS SDK local setup
- [ ] OAuth flow
- [ ] Channel A implementation
- [ ] Channel B implementation
- [ ] Voice integration
- [ ] Demo polish

---

## Quick Start

```bash
# Install dependencies
cd mcp-server
npm install

# Run dev server
npm run dev
```

---

## License

MIT
