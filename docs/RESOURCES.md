# NEXUS Hackathon Resources

> All links, SDKs, tutorials, and sources in one place.
> Last updated: 2026-07-15

---

## Official Audiotool Resources

### Developer Portal
| Resource | URL |
|----------|-----|
| Developer Dashboard | https://developer.audiotool.com |
| JS Package Docs | https://developer.audiotool.com/js-package-documentation/ |
| App Registration | https://developer.audiotool.com/applications |
| Personal Access Tokens | https://developer.audiotool.com/personal-access-tokens |
| Protocol Buffers | https://developer.audiotool.com/explore-protobufs |

### SDK & GitHub
| Resource | URL |
|----------|-----|
| NEXUS SDK (npm) | `npm install @audiotool/nexus` |
| GitHub Repository | https://github.com/audiotool/nexus |
| SDK Version | v0.0.17 (pre-1.0, expect breaking changes) |

### Audiotool Studio
| Resource | URL |
|----------|-----|
| Main Studio | https://audiotool.com |
| Beta Studio | https://beta.audiotool.com |
| Let's Build Page | https://audiotool.com/letsbuild |

---

## NEXUS SDK Quick Reference

### Installation
```bash
npm install @audiotool/nexus
```

### Starter Templates
- TypeScript starter (ZIP)
- Svelte starter (ZIP)
- React starter (ZIP)
- Protobuf starter (for Python, Go, Rust)

Download from: https://developer.audiotool.com

### Core Functions
```typescript
// Authentication
import { audiotool } from '@audiotool/nexus';

// Client initialization (server-side)
import { createAudiotoolClient, createServerAuth } from '@audiotool/nexus';

// Offline document (for testing)
import { createOfflineDocument } from '@audiotool/nexus';
```

### Device Control
```typescript
// Create devices
t.create("stompboxDelay", { feedbackFactor, mix, stepLengthIndex });
t.create("tonematrix", { displayName, positionX, positionY });
t.create("desktopAudioCable", { fromSocket, toSocket });

// Query entities
nexus.queryEntities.ofTypes("stompboxDelay").get();
nexus.queryEntities.pointedToBy.types("desktopAudioCable").get();
```

### Timeline & Notes
```typescript
// Create note tracks and regions
t.create("noteTrack", { orderAmongTracks });
t.create("noteRegion", { /* tick-based positioning */ });

// Ticks utility for musical time
import { Ticks } from '@audiotool/nexus';
```

### Events
```typescript
// Monitor changes
nexus.events.onCreate("tonematrix", (entity) => {
  console.log("Tonematrix created:", entity);
});
```

### OAuth Setup
- Redirect URI: `http://127.0.0.1:5173/` (NOT localhost)
- Scope: `project:write`

---

## Audiotool Devices Reference

### Instruments
| Device | Type | Notes |
|--------|------|-------|
| Beatbox 8 | Drum machine | 8-pad sampler |
| Beatbox 9 | Drum machine | 9-pad sampler |
| Machiniste | Sampler | Multi-channel with automation |
| Gakki | Synth/Sampler | With drum instrument mode |
| Heisenberg | Synth | Filter, envelopes |
| Quantum | Synth | Redesigned June 2026 |
| Pulverisateur | Synth | LFO, envelopes |
| Helmholtz | Synth | C major default tuning |

### Sequencers
| Device | Type | Notes |
|--------|------|-------|
| Matrix | Pattern sequencer | Step indicator added July 2026 |
| Tonematrix | Grid sequencer | Visual sequencer |
| Rasselbock | Step sequencer | Gate effects |

### Effects
| Device | Type | Notes |
|--------|------|-------|
| Waveshaper | Distortion | Redesigned July 2026 |
| Graphical EQ | EQ | Visual EQ |
| Quasar | Reverb | Plate decay |
| Space | Reverb/Delay | Decay/attack behavior |
| Stompbox Delay | Delay | Feedback, mix controls |
| Stompbox Compressor | Dynamics | RMS/Peak modes |

### Routing
| Device | Type | Notes |
|--------|------|-------|
| Splitter | Signal routing | Blend modes |
| Merger | Signal routing | Blend modes |
| Stagebox | I/O routing | Channel management |
| Centroid | Mixer | Channel removal supported |
| Kobolt | Legacy mixer | Use Track Recabler to migrate |

### External
| Device | Type | Notes |
|--------|------|-------|
| VST Bridge | Plugin host | Version 1.3.3 |

---

## Testing Parameters

### Local Development
```bash
# Start dev server
npm run dev

# OAuth redirect must be 127.0.0.1, not localhost
# Default port: 5173
```

### Testing Checklist
- [ ] OAuth flow works with 127.0.0.1 redirect
- [ ] Can read project state via NEXUS
- [ ] Can create devices programmatically
- [ ] Can modify timeline regions
- [ ] Can inject MIDI notes
- [ ] Real-time sync works in multiplayer

### Offline Testing
```typescript
import { createOfflineDocument } from '@audiotool/nexus';

// Create document that isn't synced to backend
const doc = createOfflineDocument();
```

---

## Audiotool Tutorials & Training

### Official Learning Resources
| Resource | URL | Notes |
|----------|-----|-------|
| Audiotool Academy | In-app tutorials | Integrated into Studio |
| Featured Examples | https://developer.audiotool.com | Harmony Editor, Beat Machine, etc. |
| Let's Build Submissions | Google Form | Community projects |

### Example Apps (from Developer Portal)
| App | Description |
|-----|-------------|
| Harmony Editor | Compose songs from chord progressions |
| Beat Machine | Drum pattern generator |
| Technorat | Sequencer app |
| at-patterns | Pattern library |
| Vocalink | Voice/audio integration |

### Community Tools
| Tool | URL | Description |
|------|-----|-------------|
| Track Recabler | https://jaquesolosch.github.io/AT-Trackrecabler/ | Migrate classic projects to new mixer |

---

## Research Sources

### AI Music Generation Pain Points
| Source | URL | Key Finding |
|--------|-----|-------------|
| arXiv - Cultural Bias | https://arxiv.org/pdf/2412.04100 | 94% Western training data |
| arXiv - User Study | https://arxiv.org/html/2509.23364v1 | Creative intent lost across sessions |
| Toolworthy | https://www.toolworthy.ai/blog/suno-alternatives | Workflow fragmentation |
| Opus Blog | https://www.opus.pro/blog/ai-music-news-april-2026 | Suno Studio regressions |

### NEXUS Platform
| Source | URL | Key Finding |
|--------|-----|-------------|
| AccessNewswire | https://www.accessnewswire.com/newsroom/en/computers-technology-and-internet/audiotool-launches-multiplayer-cloud-daw-and-debuts-nexus-an-indu-1129612 | AI-to-AI communication, first in industry |
| Yahoo Finance | https://finance.yahoo.com/news/audiotool-launches-multiplayer-cloud-daw-170000346.html | Full audio engine API access |
| GearNews | https://www.gearnews.com/audiotool-studio-nexus-daw-tech/ | MCP + Context I/O integration |
| Mixdown | https://mixdownmag.com.au/news/audiotool-3-0-launches-with-multiplayer-daw-and-open-sdk/ | Open SDK, multiplayer |

### DJ & Producer Workflow
| Source | URL | Key Finding |
|--------|-----|-------------|
| DJ.Studio | https://dj.studio/blog/bad-dj-mixing-mistakes | Common beginner mistakes |
| Club Ready DJ School | https://www.clubreadydjschool.com/tribe-talk/getting-started/5-mistakes-beginner-djs-make | Beat matching fundamentals |

---

## Hackathon Logistics

### Key Dates
| Milestone | Date |
|-----------|------|
| Hackathon ends | ~August 2026 |
| Days remaining | 39 (as of 2026-07-15) |

### Submission
- **Form:** https://forms.gle/NK2Mmw5sUo1FNqrx5
- **Let's Build page:** https://audiotool.com/letsbuild

### Partners
- ElevenLabs (coupons provided, channel closing)
- Base44 (coupons provided)
- BBC Research & Development
- Music Hackspace
- Spitfire Audio (LABS integration)
- Splice
- Ujam
- Fraunhofer
- DAACI
- BandM8

---

## Our Assets

### Chord Genesis (Existing App)
| Item | Value |
|------|-------|
| URL | https://zaylegend.com/chord-genesis |
| Port | 3001 |
| Repo | https://github.com/yetog/chord-genesis |
| API | Uses server-side ElevenLabs proxy |
| Status | Production ready |

### ElevenLabs Integration
| Item | Value |
|------|-------|
| Account tier | Creator (paid) |
| API proxy | `/api/elevenlabs/*` |
| Endpoints | TTS, music generation, sound effects |

---

## Discord Insights (from #announcements)

### Recent Audiotool Updates (May-July 2026)
- **May 27:** Full launch, audio engine 1.2.4
- **June 8:** Cross-tab copying between projects
- **June 16:** Splitter/Merger redesign
- **June 23:** Quantum redesign
- **June 26:** Tonematrix, Graphical EQ redesign
- **July 3:** Waveshaper redesign
- **July 7:** Stability fixes
- **July 14:** Matrix redesign, online status feature

### Known Pain Points (they're actively fixing)
- Project snapshots missing ("coming back eventually")
- Publishing errors (fixed)
- Sample loading performance
- Drafts becoming inaccessible

### Audio Engine Version
- Current: v1.3.3
- VST Bridge: v1.3.3
