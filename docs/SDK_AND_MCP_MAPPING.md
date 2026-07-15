# NEXUS SDK Capabilities & MCP Action Mapping

> Research-based guide for building Production Coach
> Last updated: 2026-07-15

---

## SDK Capabilities Overview

### What NEXUS Can Do

Based on [official documentation](https://developer.audiotool.com) and [SDK examples](https://github.com/audiotool/nexus-sdk-examples):

| Capability | Description | API Access |
|------------|-------------|------------|
| **Create devices** | Add instruments, effects, tools | `t.create("deviceType", {...})` |
| **Connect cables** | Route audio/MIDI between devices | `t.create("desktopAudioCable", {fromSocket, toSocket})` |
| **Modify parameters** | Change device settings | Entity modification API |
| **Read project state** | Query all entities in session | `nexus.queryEntities.ofTypes(...).get()` |
| **Timeline control** | Create/modify regions | Note/audio region creation |
| **MIDI manipulation** | Add/edit notes | Note track and region APIs |
| **Automation** | Create automation curves | Automation editor API |
| **Real-time sync** | Multiplayer collaboration | Built into SDK |
| **Event monitoring** | React to changes | `nexus.events.onCreate(...)` |

### What NEXUS Exposes (Protocol Buffers)

Every entity and action in the DAW is defined via Protocol Buffers:
- Devices and their parameters
- Cables and routing
- Patterns and sequences
- Automation data
- Timeline regions
- Project metadata

Explore at: https://developer.audiotool.com/explore-protobufs

---

## Audiotool Learning Paths → MCP Actions

Based on [Audiotool Manual](https://www.audiotool.com/help/):

### 1. BASICS (Getting Started)

| Tutorial Step | What User Learns | MCP Action |
|---------------|------------------|------------|
| Create new project | Start fresh session | `createOfflineDocument()` or OAuth flow |
| Add a device | Drag instrument to desktop | `t.create("heisenberg", {positionX, positionY})` |
| Connect to mixer | Wire device to output | `t.create("desktopAudioCable", {fromSocket, toSocket})` |
| Play a note | Trigger sound | MIDI note injection |
| Save project | Persist work | Document sync (automatic) |

**Coach Action:** "You have an empty project. Let's add a synth first."
```typescript
t.create("heisenberg", {
  displayName: "Lead Synth",
  positionX: 200,
  positionY: 100
});
```

### 2. ADD SOUNDS

| Tutorial Step | What User Learns | MCP Action |
|---------------|------------------|------------|
| Add drum machine | Use Beatbox 8/9 or Machiniste | `t.create("beatbox8", {...})` |
| Load preset | Apply sound preset | Preset loading API |
| Add sample | Import audio | Sample upload + region creation |
| Layer sounds | Multiple devices | Create multiple devices + routing |

**Coach Action:** "Your track needs drums. Adding Beatbox 8..."
```typescript
t.create("beatbox8", {
  displayName: "Drums",
  positionX: 100,
  positionY: 200
});
// Auto-connect to mixer
t.create("desktopAudioCable", {
  fromSocket: drumDevice.outputSocket,
  toSocket: mixer.inputSocket
});
```

### 3. RECORD MIDI

| Tutorial Step | What User Learns | MCP Action |
|---------------|------------------|------------|
| Create note track | Add MIDI lane | `t.create("noteTrack", {orderAmongTracks})` |
| Draw notes | Place notes in piano roll | Note creation in region |
| Quantize | Snap to grid | Note position modification |
| Set velocity | Dynamics | Note velocity parameter |

**Coach Action:** "Let's create a chord progression in the piano roll."
```typescript
// Create note track for the synth
t.create("noteTrack", {
  device: synthDevice,
  orderAmongTracks: 0
});
// Create region with notes
t.create("noteRegion", {
  track: noteTrack,
  startTick: Ticks.Bar,
  // ... note data from Chord Genesis
});
```

### 4. RECORD AUDIO

| Tutorial Step | What User Learns | MCP Action |
|---------------|------------------|------------|
| Add audio track | Create audio lane | `t.create("audioTrack", {...})` |
| Import sample | Add audio file | Sample upload + region |
| Trim/edit | Adjust boundaries | Region modification |
| Normalize | Level adjustment | Audio processing |

### 5. AUTOMATE

| Tutorial Step | What User Learns | MCP Action |
|---------------|------------------|------------|
| Enable automation | Show automation lane | Automation track creation |
| Draw curves | Modulate parameters | Automation point creation |
| LFO patterns | Rhythmic modulation | LFO preset application |

**Coach Action:** "Add a filter sweep to build tension."
```typescript
// Create automation for filter cutoff
t.create("automationTrack", {
  targetDevice: synthDevice,
  targetParameter: "filterCutoff"
});
// Add automation points
t.create("automationRegion", {
  points: [
    { tick: 0, value: 0.2 },
    { tick: Ticks.Bar * 4, value: 0.8 }
  ]
});
```

### 6. DESIGN YOUR SOUND

| Tutorial Step | What User Learns | MCP Action |
|---------------|------------------|------------|
| Adjust oscillators | Shape waveform | Device parameter modification |
| Apply filter | Tone shaping | Filter parameters |
| Add effects | Process signal | Create + route effect devices |
| Save preset | Store sound | Preset save API |

---

## Device Reference for MCP

### Drum Machines
```typescript
// Machiniste - Full-featured sampler
t.create("machiniste", { displayName, positionX, positionY });

// Beatbox 8 - Classic 8-pad
t.create("beatbox8", { displayName, positionX, positionY });

// Beatbox 9 - Analog-style
t.create("beatbox9", { displayName, positionX, positionY });
```

### Synthesizers
```typescript
t.create("heisenberg", {...});     // Main synth
t.create("pulverisateur", {...});  // Aggressive synth
t.create("bassline", {...});       // Bass synth
t.create("tonematrix", {...});     // Grid sequencer/synth
t.create("gakki", {...});          // Multi-instrument
t.create("space", {...});          // Pad synth
```

### Effects
```typescript
// Delay
t.create("stompboxDelay", {
  feedbackFactor: 0.5,
  mix: 0.3,
  stepLengthIndex: 2
});

// Reverb
t.create("quasar", {...});

// Distortion
t.create("waveshaper", {...});

// EQ
t.create("curve", {...});          // Graphical EQ
t.create("parametricEq", {...});   // Parametric EQ

// Dynamics
t.create("gravity", {...});        // Compressor
t.create("quantum", {...});        // Compressor
```

### Routing/Mixing
```typescript
// Cables
t.create("desktopAudioCable", { fromSocket, toSocket });
t.create("desktopMidiCable", { fromSocket, toSocket });

// Mixers
t.create("centroid", {...});       // Main mixer
t.create("kobolt", {...});         // Legacy mixer
t.create("minimixer", {...});      // Simple mixer

// Utilities
t.create("splitter", {...});
t.create("merger", {...});
t.create("bandSplitter", {...});
```

---

## Production Coach MCP Actions

### Core Actions to Build

| Action | Trigger | NEXUS API |
|--------|---------|-----------|
| `analyzeSession` | On load / on demand | `queryEntities` |
| `addDrumMachine` | "Add drums" | `t.create("beatbox8")` |
| `addSynth` | "Add melody" | `t.create("heisenberg")` |
| `addBass` | "Add bass" | `t.create("bassline")` |
| `connectToMixer` | After device creation | `t.create("desktopAudioCable")` |
| `createChordProgression` | Chord Genesis trigger | Note region creation |
| `addAutomation` | "Add movement" | Automation track/region |
| `addEffect` | "Add reverb/delay" | Effect device + routing |
| `muteDevice` | Arrangement control | Device parameter |
| `adjustVolume` | Mix control | Mixer channel parameter |

### Session Analysis Query

```typescript
// Get all devices in session
const devices = nexus.queryEntities.ofTypes(
  "beatbox8", "beatbox9", "machiniste",
  "heisenberg", "pulverisateur", "bassline",
  "tonematrix", "gakki", "space"
).get();

// Get all note regions (arrangement)
const noteRegions = nexus.queryEntities.ofTypes("noteRegion").get();

// Get all audio regions
const audioRegions = nexus.queryEntities.ofTypes("audioRegion").get();

// Get mixer state
const mixer = nexus.queryEntities.ofTypes("centroid", "stagebox").get();
```

### Coach Decision Logic

```typescript
function analyzeAndRecommend(session) {
  const devices = getDevices(session);
  const regions = getRegions(session);

  // Check what's missing
  const hasDrums = devices.some(d => isDrumMachine(d));
  const hasBass = devices.some(d => isBassDevice(d));
  const hasHarmony = devices.some(d => isHarmonyDevice(d));
  const hasArrangement = regions.length > 0;

  // Recommend based on stage
  if (!hasDrums) return { action: "addDrumMachine", reason: "Every track needs rhythm" };
  if (!hasBass) return { action: "addBass", reason: "Bass provides foundation" };
  if (!hasHarmony) return { action: "triggerChordGenesis", reason: "Add harmonic content" };
  if (!hasArrangement) return { action: "createArrangement", reason: "Build your song structure" };

  // Analyze arrangement
  const energyCurve = analyzeEnergy(regions);
  if (energyCurve.isFlat) {
    return { action: "addVariation", reason: "Your track needs dynamic contrast" };
  }

  return { action: "reviewMix", reason: "Time to balance your levels" };
}
```

---

## Testing Plan

### Phase 1: Read Operations
- [ ] OAuth authentication flow
- [ ] Query devices in empty project
- [ ] Query devices in existing project
- [ ] Read device parameters
- [ ] Read timeline regions
- [ ] Read automation data

### Phase 2: Write Operations
- [ ] Create a synth device
- [ ] Create a drum machine
- [ ] Connect devices with cables
- [ ] Create note track
- [ ] Create note region with notes
- [ ] Modify device parameters

### Phase 3: Coach Integration
- [ ] Session analysis → recommendation
- [ ] "Apply safe change" → NEXUS write
- [ ] Chord Genesis → NEXUS note injection
- [ ] Checklist state tracking

### Offline Testing
```typescript
import { createOfflineDocument } from '@audiotool/nexus';

// Test without backend connection
const doc = createOfflineDocument();
// ... run tests
```

---

## Example Apps to Study

From [developer.audiotool.com](https://developer.audiotool.com):

| App | What It Does | Relevant Patterns |
|-----|--------------|-------------------|
| **Harmony Editor** | Compose from chord progressions | Chord → MIDI → NEXUS injection |
| **Beat Machine** | Drum pattern generator | Device creation, pattern programming |
| **Technorat** | Sequencer | Timeline manipulation |
| **at-patterns** | Pattern library | Preset/pattern loading |
| **Vocalink** | Voice integration | Audio processing |

### GitHub Examples
Repository: https://github.com/audiotool/nexus-sdk-examples

| Example | Purpose |
|---------|---------|
| `web-auth/` | OAuth flow implementation |
| `web/` | Browser-based app patterns |
| `deno/` | Server-side integration |
| `templates/` | Starter templates |

---

## MCP Server Structure (Proposed)

```
production-coach-mcp/
├── src/
│   ├── index.ts              # MCP server entry
│   ├── tools/
│   │   ├── analyzeSession.ts # Read project state
│   │   ├── addDevice.ts      # Create devices
│   │   ├── connectDevices.ts # Route audio/MIDI
│   │   ├── createNotes.ts    # MIDI manipulation
│   │   ├── addAutomation.ts  # Automation curves
│   │   └── applyChange.ts    # Safe modifications
│   ├── prompts/
│   │   ├── coachPrompt.ts    # Production guidance
│   │   └── stageDetection.ts # Identify production phase
│   └── resources/
│       ├── deviceRef.ts      # Device documentation
│       └── workflowRef.ts    # Production workflow steps
├── package.json
└── tsconfig.json
```

---

## Sources

- [NEXUS SDK](https://github.com/audiotool/nexus)
- [SDK Examples](https://github.com/audiotool/nexus-sdk-examples)
- [Developer Portal](https://developer.audiotool.com)
- [JS Package Docs](https://developer.audiotool.com/js-package-documentation/)
- [Protocol Buffers](https://developer.audiotool.com/explore-protobufs)
- [Audiotool Manual](https://www.audiotool.com/help/)
- [Launch Announcement](https://finance.yahoo.com/news/audiotool-launches-multiplayer-cloud-daw-170000346.html)
