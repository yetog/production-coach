# Production Coach - Implementation Status

> NEXUS Hackathon 2026 - Audiotool Integration
> Last Updated: 2026-08-09

---

## Overview

Production Coach is an AI-powered music production assistant that coaches users through creating tracks in Audiotool. It uses Dr. Zay as a persona - a motivating, no-nonsense coach who teaches rather than does the work for the user.

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + Vite)                │
│  - Chat UI with Dr. Zay avatar                              │
│  - Voice input (Web Speech API)                             │
│  - Settings sidebar                                         │
│  - Progress checklist                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ /production-coach/api/*
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Express.js)                     │
│  Port 3021                                                  │
│  - POST /api/chat → IONOS Model Hub                         │
│  - POST /api/tts → ElevenLabs                               │
│  - GET /api/health → Service status                         │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│    IONOS Model Hub      │     │      ElevenLabs         │
│  meta-llama/Meta-Llama  │     │   eleven_flash_v2_5     │
│  -3.1-8B-Instruct       │     │   Voice: pNInz6obpg...  │
└─────────────────────────┘     └─────────────────────────┘
```

---

## What's Implemented

### Frontend (`/src`)
| Component | Status | Description |
|-----------|--------|-------------|
| `App.tsx` | ✅ Done | Main layout with chat, avatar, input |
| `HeroAvatar.tsx` | ✅ Done | Animated avatar with 4 states (idle/listening/thinking/speaking) |
| `Sidebar.tsx` | ✅ Done | Settings panel (voice toggle, chattiness, persona) |
| `GoalBanner.tsx` | ✅ Done | Shows current production goal + session info |
| `QuickPrompts.tsx` | ✅ Done | Contextual suggestion chips |
| `MiniChecklist.tsx` | ✅ Done | 9-step progress tracker |

### Hooks (`/src/hooks`)
| Hook | Status | Description |
|------|--------|-------------|
| `useApi.ts` | ✅ Done | API calls to backend (chat, TTS, health) |
| `useCoach.ts` | ✅ Done | Chat state, messages, checklist, goal management |
| `useVoice.ts` | ✅ Done | Web Speech API for voice input (STT) |
| `useNexus.ts` | 🔲 Stub | NEXUS SDK integration (needs real implementation) |

### Backend (`/server`)
| Endpoint | Status | Description |
|----------|--------|-------------|
| `POST /api/chat` | ✅ Done | AI chat via IONOS Model Hub |
| `POST /api/tts` | ✅ Done | Text-to-speech via ElevenLabs |
| `GET /api/health` | ✅ Done | Service health check |

---

## What Needs Backend Work

### 1. NEXUS SDK Integration
**File:** `src/hooks/useNexus.ts`
**Priority:** HIGH

The NEXUS SDK integration is currently stubbed. Backend needs to:
- Connect to Audiotool NEXUS WebSocket
- Expose session state (BPM, key, devices)
- Implement `addDevice()` to add instruments to session
- Handle real-time session updates

```typescript
// Current stub that needs real implementation:
export function useNexus() {
  const [session, setSession] = useState<SessionState>({
    connected: false,  // Always false in demo mode
    bpm: null,
    key: null,
    devices: [],
  })

  const addDevice = async (type: string, displayName?: string) => {
    // TODO: Call NEXUS SDK to add device
    console.log('Would add device:', type, displayName)
  }

  return { session, addDevice }
}
```

### 2. Action Execution
**File:** `server/index.js` (parseActionFromResponse function)
**Priority:** MEDIUM

When Dr. Zay suggests adding a device, we parse it from the response and show a button. The actual device-adding needs NEXUS SDK integration.

Current device patterns recognized:
- Beatbox 8/9
- Heisenberg
- Pulverisateur
- Bassline
- Machiniste
- Tonematrix

### 3. Session Context
**Priority:** MEDIUM

The AI currently receives basic session info but needs richer context:
- Current track structure (patterns, timeline)
- Active devices and their settings
- Effects chain
- What the user just did (for contextual coaching)

---

## What Needs Testing

### Critical Path Tests
1. **Chat Flow**
   - [ ] Send message, receive AI response
   - [ ] Verify Dr. Zay persona is consistent
   - [ ] Check fallback works when API fails

2. **Voice Features**
   - [ ] Enable voice in sidebar
   - [ ] Verify TTS plays Dr. Zay's response
   - [ ] Test voice input (microphone button)
   - [ ] Check state transitions (idle → listening → thinking → speaking)

3. **Goal Setting**
   - [ ] Set production goal on first visit
   - [ ] Verify goal persists in localStorage
   - [ ] Check "Change" goal works from sidebar

4. **Settings**
   - [ ] Voice toggle on/off
   - [ ] Chattiness slider (affects AI response length - not yet implemented)
   - [ ] Persona switch (Dr. Zay vs Classic - not yet implemented)

5. **Progress Checklist**
   - [ ] Toggle checklist items
   - [ ] Verify progress bar updates
   - [ ] Check expand/collapse works

### API Tests
```bash
# Health check
curl https://zaylegend.com/production-coach/api/health

# Chat (replace with actual message)
curl -X POST https://zaylegend.com/production-coach/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "How do I make a beat?"}], "goal": "Lo-fi beat"}'

# TTS
curl -X POST https://zaylegend.com/production-coach/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Yo lets make a beat"}' \
  --output test.mp3
```

### Edge Cases
- [ ] Very long messages
- [ ] Rapid message sending
- [ ] Network disconnection
- [ ] Browser without Web Speech API support
- [ ] Mobile responsiveness

---

## Environment Variables

### Backend (`server/.env`)
```env
PORT=3021
IONOS_API_KEY=<JWT token>
IONOS_BASE_URL=https://openai.inference.de-txl.ionos.com/v1
IONOS_CHAT_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct
ELEVEN_LABS_API_KEY=<API key>
ELEVEN_LABS_VOICE_ID=pNInz6obpgDQGcFmaJgB
```

---

## Known Issues

1. **Avatar scrolls out of view** - When chat gets long, the Dr. Zay avatar at the top scrolls away. Need UI decision on layout.

2. **Chat bubbles use initials** - Coach messages show "DZ" instead of actual avatar image.

3. **Chattiness slider not wired** - Settings exist but don't affect AI response length yet.

4. **Persona switch not wired** - Can select Classic mode but system prompt doesn't change.

---

## File Structure

```
production-coach/
├── src/
│   ├── components/
│   │   ├── HeroAvatar.tsx    # Animated Dr. Zay avatar
│   │   ├── Sidebar.tsx       # Settings panel
│   │   ├── GoalBanner.tsx    # Production goal display
│   │   ├── QuickPrompts.tsx  # Suggestion chips
│   │   └── MiniChecklist.tsx # Progress tracker
│   ├── hooks/
│   │   ├── useApi.ts         # Backend API calls
│   │   ├── useCoach.ts       # Chat/state management
│   │   ├── useVoice.ts       # Web Speech API
│   │   └── useNexus.ts       # NEXUS SDK (stub)
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   ├── lib/
│   │   └── utils.ts          # Utility functions
│   └── App.tsx               # Main app component
├── server/
│   ├── index.js              # Express API server
│   ├── .env                  # API keys (not committed)
│   └── package.json          # Server dependencies
├── dist/                     # Built frontend
└── IMPLEMENTATION.md         # This file
```

---

## Next Steps

### Immediate (This Week)
1. Fix avatar visibility during chat (UI layout change)
2. Add Dr. Zay image to chat bubbles
3. Wire up chattiness slider to AI prompt

### Short Term
4. Implement NEXUS SDK connection
5. Add device-adding functionality
6. Display real session data (BPM, key, devices)

### Medium Term
7. Contextual coaching based on session state
8. Pattern/arrangement suggestions
9. Real-time feedback on what user is doing

---

## Contacts

- **Frontend:** Isayah (Dr. Zay)
- **Backend/NEXUS:** [TBD]
- **Testing:** [TBD]
