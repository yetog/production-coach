# Production Coach

> **NEXUS Hackathon Entry** | Team: Isayah, Aryan, Nolan
>
> Audiotool gives creators the studio. We help them understand what to do next.

---

## The Problem

DAWs give users tools. They don't tell users **what to do next**.

Beginners have a musical idea but don't know the sequence of decisions to turn it into a finished song:
- Reference -> BPM -> Chords -> Drums -> Arrangement -> Transitions -> Mix -> Master

They get stuck. They quit. Music doesn't get made.

---

## The Solution

**Production Coach** - an in-DAW assistant that:
1. Understands the current project via NEXUS SDK
2. Identifies what production stage you're at
3. Recommends what to do next
4. Can apply changes directly to your session

---

## Demo Flow

```
User: "I want dark, soulful house that feels cinematic"
           |
Coach creates 9-step checklist
           |
Coach reads session via NEXUS:
"You have drums, bass, chords - but everything enters at once"
           |
Coach recommends:
"Create 8-bar intro by muting bass, reducing drum density"
           |
User clicks: [Apply safe change]
           |
NEXUS modifies arrangement
Checklist updates automatically
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| DAW Integration | NEXUS SDK (`@audiotool/nexus` v0.0.17) |
| AI Backend | Claude API |
| Audio Generation | ElevenLabs API |
| Frontend | React + TypeScript |
| MCP Server | Node.js / Deno |

---

## Project Structure

```
production-coach/
├── README.md              # You are here
├── docs/
│   ├── PITCH.md           # 1-page pitch for judges
│   ├── RESOURCES.md       # All links, SDKs, device reference
│   ├── SDK_AND_MCP_MAPPING.md  # NEXUS capabilities + MCP actions
│   ├── PRODUCTION_COACH_FRAMEWORK.md  # Full architecture spec
│   └── NEXUS_PAIN_POINT_RESEARCH.md   # Pain point evidence
├── mcp-server/
│   ├── src/
│   │   ├── index.ts       # MCP server entry
│   │   ├── tools/         # NEXUS action tools
│   │   ├── prompts/       # Coach prompts
│   │   └── resources/     # Device/workflow reference
│   └── package.json
└── examples/              # NEXUS SDK usage examples
```

---

## Existing Work

**Chord Genesis** (live): https://zaylegend.com/chord-genesis
- Generates chord progressions based on key/mood
- ElevenLabs integration for AI music generation
- Becomes the "harmony specialist" module inside Production Coach

---

## Key Resources

| Resource | Link |
|----------|------|
| Audiotool Studio | https://audiotool.com |
| NEXUS SDK | https://github.com/audiotool/nexus |
| Developer Portal | https://developer.audiotool.com |
| SDK Examples | https://github.com/audiotool/nexus-sdk-examples |
| Hackathon Submission | https://forms.gle/NK2Mmw5sUo1FNqrx5 |

---

## Team

| Person | Role |
|--------|------|
| **Isayah** | Technical lead, NEXUS integration, Chord Genesis |
| **Aryan** | Product direction, judge criteria |
| **Nolan** | NEXUS API, Audiotool expertise |

---

## Status

- [x] Pain point research
- [x] SDK capability mapping
- [x] MCP action design
- [ ] NEXUS SDK local setup
- [ ] OAuth authentication flow
- [ ] Session read operations
- [ ] Device creation operations
- [ ] Coach UI prototype
- [ ] Chord Genesis integration

---

## Quick Start

```bash
# Install NEXUS SDK
npm install @audiotool/nexus

# Run MCP server (coming soon)
cd mcp-server
npm install
npm run dev
```

---

## License

MIT
