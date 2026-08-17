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

## Implementation Plan

### Phase 1: ElevenAgents Integration (Week 1)

1. Set up ElevenAgents agent with Dr. Zay persona
2. Configure BYOLLM backend (start with Claude)
3. Update frontend to use ElevenAgents WebSocket SDK
4. Deprecate IONOS endpoint (keep as fallback)

### Phase 2: User API Keys (Week 2)

1. Add settings UI for API key input
2. Implement frontend-direct provider calls
3. Add provider selector (ElevenLabs, OpenAI, Anthropic)
4. Secure localStorage handling

### Phase 3: NEXUS Integration (Nolan's work)

- ElevenAgents agent gets session context from NEXUS
- Device suggestions become executable actions
- Real-time session state updates

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
