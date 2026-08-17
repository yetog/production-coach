# Proposal: Unified AI Backend Architecture

> RFC for Production Coach AI integration
> Author: Isayah
> Date: 2026-08-17
> Status: **Draft - Needs Team Review**

---

## Summary

Replace our current split architecture (IONOS Model Hub for chat + ElevenLabs for TTS) with a unified approach using **ElevenLabs Conversational AI** (ElevenAgents). Additionally, add support for **user-provided API keys** to allow flexibility in LLM choice.

---

## Current Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│  Express API    │────▶│ IONOS Model Hub │
│   (React/TS)    │     │   (port 3021)   │     │  (Llama 3.1 8B) │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   ElevenLabs    │
                        │   (TTS only)    │
                        └─────────────────┘
```

**Problems:**
1. **Two services to maintain** - Different auth, different error handling
2. **Latency issues** - IONOS responses sometimes 20-25 seconds (QA feedback)
3. **No flexibility** - Users locked to our LLM choice
4. **Duplicate costs** - Paying for both IONOS + ElevenLabs

---

## Proposed Architecture

### Option A: ElevenLabs Conversational AI (Recommended)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│    Frontend     │────▶│  ElevenAgents   │────▶│  BYOLLM Backend     │
│   (React/TS)    │     │  Unified API    │     │  (User's choice)    │
└─────────────────┘     └─────────────────┘     └─────────────────────┘
                                                        │
                        ┌───────────────────────────────┼───────────────┐
                        │                               │               │
                        ▼                               ▼               ▼
                ┌──────────────┐              ┌──────────────┐  ┌──────────────┐
                │   OpenAI     │              │   Claude     │  │   Gemini     │
                │   GPT-4o     │              │   Sonnet     │  │   Pro        │
                └──────────────┘              └──────────────┘  └──────────────┘
```

**Benefits:**
- Single service handles chat + TTS + STT
- Built-in BYOLLM support (GPT-4, Claude, Gemini, or custom)
- Lower latency (optimized for real-time conversation)
- Consistent voice quality
- WebSocket support for streaming

### Option B: Multi-Provider Backend (Maximum Flexibility)

```
┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│   Express API   │
│   (React/TS)    │     │   (port 3021)   │
└─────────────────┘     └────────┬────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 │               │               │
                 ▼               ▼               ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │ ElevenAgents │ │    OpenAI    │ │  Anthropic   │
        │ (all-in-one) │ │ + 11Labs TTS │ │ + 11Labs TTS │
        └──────────────┘ └──────────────┘ └──────────────┘
```

**Benefits:**
- Users choose their provider
- Fallback if one service is down
- Can compare providers during hackathon demo

---

## User API Key Support

Allow users to bring their own API keys for:
1. **Privacy** - Their conversations don't go through our keys
2. **Cost** - They pay for their own usage
3. **Model choice** - Use their preferred LLM

### Settings UI Addition

```typescript
// New settings in sidebar
interface AISettings {
  provider: 'default' | 'openai' | 'anthropic' | 'elevenlabs'
  apiKey?: string  // User's API key (stored in localStorage, never sent to our server)
  model?: string   // e.g., "gpt-4o", "claude-sonnet-4-20250514"
}
```

### Security Considerations

- **Never store user API keys on our server**
- Keys stay in localStorage and go directly to provider
- Frontend-to-provider direct calls (skip our backend)
- Clear warning about key security

---

## Dr. Zay ElevenLabs Agent Specification

Create Dr. Zay as a dedicated ElevenLabs Conversational AI agent with full persona, voice, and behavior configuration.

### Agent Configuration

```json
{
  "name": "Dr. Zay - Production Coach",
  "description": "AI music production coach for Audiotool",
  "first_message": "Yo, what's good! I'm Dr. Zay, your production coach. I'm not here to make music FOR you - I'm here to help you level up YOUR skills. Tell me what vibe you're going for, and let's get to work. No shortcuts, just growth.",
  "language": "en"
}
```

### Voice Configuration

| Setting | Value | Reason |
|---------|-------|--------|
| **Voice ID** | `pNInz6obpgDQGcFmaJgB` (Adam) | Deep, confident male voice |
| **Stability** | 0.5 | Natural variation |
| **Similarity Boost** | 0.75 | Consistent character |
| **Style** | 0.5 | Balanced expression |
| **Speaker Boost** | true | Clearer output |

*Alternative: Clone a custom Dr. Zay voice for unique identity*

### System Prompt (Agent Instructions)

```
You are Dr. Zay, a music production coach with deep expertise in Audiotool.

PERSONALITY:
- Confident, encouraging, but never does the work FOR the user
- Uses casual, conversational language ("yo", "let's", "that's dope")
- Focuses on TEACHING concepts, not giving fish
- When users ask you to create/make something, refuse politely and teach them how instead
- Keep responses concise (2-3 sentences) for voice - longer explanations only when asked
- NEVER echo back typos - interpret what the user meant and respond naturally

AUDIOTOOL DEVICES - Suggest based on genre:
- Beatbox 8/9: Drum machines - any beat-based genre
- Heisenberg: FM synth - complex pads, leads, bass (house, EDM, experimental)
- Pulverisateur: Granular synth - ambient textures, experimental
- Bassline: TB-303 style - acid, techno, house bass
- Machiniste: Analog-style synth - warm leads, bass, arpeggios
- Tonematrix: Melodic sequencer - simple melodies, chiptune
- Centauri: Sampler - any genre needing samples
- Rasselbock: Drum synth - punchy electronic drums

GENRE-SPECIFIC RECOMMENDATIONS:
- Lo-fi/Chill: Beatbox 9, Machiniste, vinyl effects
- Hip-hop/Trap: Beatbox 9, Bassline (808-style), Heisenberg
- House/EDM: Beatbox 8 (4-on-floor), Bassline, Heisenberg
- Ambient/Experimental: Pulverisateur, Heisenberg (pads), long reverbs
- Techno: Beatbox 8 (mechanical), Bassline (acid), Machiniste

VOICE INTERACTION GUIDELINES:
- Speak naturally as if in a studio session
- Use affirmations: "bet", "aight", "let's go"
- When user pauses, ask what they want to tackle next
- If user seems stuck, offer 2-3 specific options

ACTIONS YOU CAN TRIGGER:
When suggesting a device, format it clearly so the system can parse it:
"Let's add a [DEVICE_NAME] to your session" - this triggers the add_device action
```

### Knowledge Base (RAG)

Upload these documents to the agent's knowledge base:
1. **Audiotool Device Manual** - All device parameters and usage
2. **Genre Production Guides** - Lo-fi, house, trap, ambient, techno techniques
3. **Common Beginner Questions** - FAQ for new producers
4. **Dr. Zay Catchphrases** - Personality consistency

### Conversation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      USER STARTS                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Dr. Zay: "Yo, what's good! What vibe are we going for?"   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  User states goal (e.g., "I want to make a lo-fi beat")    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Dr. Zay acknowledges, asks about starting point:          │
│  "Dope! You got any drums yet or we starting fresh?"       │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────┐         ┌──────────────────────┐
│  User has devices    │         │  Starting fresh      │
│  → Analyze & coach   │         │  → Suggest first     │
│                      │         │    device to add     │
└──────────────────────┘         └──────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Coaching loop: teach, suggest, encourage, repeat          │
└─────────────────────────────────────────────────────────────┘
```

### Tools & Functions

Configure these as agent tools for NEXUS integration:

```typescript
// Tool: Add Device
{
  name: "add_device",
  description: "Add an Audiotool device to the user's session",
  parameters: {
    device_type: "string", // e.g., "heisenberg", "beatbox9"
    display_name: "string" // Human-readable name
  }
}

// Tool: Get Session Info
{
  name: "get_session_info",
  description: "Get current BPM, key, and devices in the session",
  parameters: {}
}

// Tool: Set BPM
{
  name: "set_bpm",
  description: "Change the project tempo",
  parameters: {
    bpm: "number" // 20-999
  }
}
```

### Avatar Integration

| Agent State | Avatar Image | Visual Cue |
|-------------|--------------|------------|
| Idle | `A9A7709C-...` | Cyan/purple glow |
| Listening | `3737FA40-...` | Green glow, pulsing |
| Thinking | `E0C16600-...` | Gold glow, processing |
| Speaking | `AF32901C-...` | Cyan glow, audio bars |

Frontend maps ElevenAgents WebSocket events to avatar states:
- `agent.on('speech_start')` → Speaking
- `agent.on('listening')` → Listening
- `agent.on('processing')` → Thinking
- `agent.on('idle')` → Idle

---

## Implementation Plan

### Phase 1: Create Dr. Zay Agent (Week 1)

1. **ElevenLabs Dashboard Setup**
   - Create new agent in ElevenLabs console
   - Configure voice (Adam or custom clone)
   - Input system prompt from above
   - Upload knowledge base documents
   - Configure tools (add_device, get_session_info)

2. **Frontend Integration**
   - Install `@11labs/react` SDK
   - Replace current chat UI with ElevenAgents widget OR
   - Use headless SDK for custom UI (recommended)
   - Map WebSocket events to avatar states

3. **Backend Simplification**
   - Remove IONOS chat endpoint (or keep as fallback)
   - Keep Express server for NEXUS bridge only
   - ElevenAgents handles chat + TTS directly

### Phase 2: User API Keys (Week 2)

1. Add settings UI for API key input
2. Implement frontend-direct provider calls
3. Add provider selector (ElevenLabs, OpenAI, Anthropic)
4. Secure localStorage handling

### Phase 3: NEXUS Integration (Nolan's work)

- ElevenAgents tools connect to NEXUS via local bridge
- Device suggestions become executable actions
- Real-time session state updates feed into agent context

---

## Cost Comparison

| Provider | Chat Cost | TTS Cost | Total |
|----------|-----------|----------|-------|
| **Current** (IONOS + ElevenLabs) | ~$0.001/msg | ~$0.30/1K chars | Split billing |
| **ElevenAgents** (unified) | Included | Included | ~$0.07/min |
| **User's own keys** | $0 to us | $0 to us | User pays |

---

## Questions for Team

1. **Nolan**: Does the NEXUS SDK work with WebSocket connections? ElevenAgents uses WebSocket.

2. **Arian**: Can you test latency differences between IONOS and ElevenAgents?

3. **Everyone**: Should we support user API keys in v1, or save for v2?

---

## References

- [ElevenLabs Agents Platform](https://elevenlabs.io/agents)
- [ElevenLabs BYOLLM Docs](https://elevenlabs.io/docs/conversational-ai/customization/llm)
- [VocalLabs ElevenLabs Guide 2026](https://www.vocallabs.ai/blogs/elevenlabs-ai-voice-agent-guide-2026)

---

## Next Steps

1. [ ] Team review of this proposal
2. [ ] Spike: Test ElevenAgents latency vs current setup
3. [ ] Decision: Option A or Option B?
4. [ ] Implementation begins
