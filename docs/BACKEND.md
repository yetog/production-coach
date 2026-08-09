# Backend Integration Guide

> For Nolan - NEXUS SDK & Backend Development

---

## Overview

The frontend is built and working with a basic Express.js backend. Your main task is integrating the NEXUS SDK so the app can connect to real Audiotool sessions.

---

## Current Backend Architecture

```
server/
├── index.js          # Express API server
├── .env              # API keys (not in repo)
├── package.json      # Dependencies
└── server.log        # Runtime logs
```

### Endpoints Already Implemented

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Service health check |
| `/api/chat` | POST | AI chat via IONOS Model Hub |
| `/api/tts` | POST | Text-to-speech via ElevenLabs |

### Environment Variables

```env
PORT=3021
IONOS_API_KEY=<JWT token>
IONOS_BASE_URL=https://openai.inference.de-txl.ionos.com/v1
IONOS_CHAT_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct
ELEVEN_LABS_API_KEY=<API key>
ELEVEN_LABS_VOICE_ID=pNInz6obpgDQGcFmaJgB
```

---

## What You Need to Implement

### 1. NEXUS SDK Connection

The frontend has a stub hook at `src/hooks/useNexus.ts` that needs real implementation.

**Current stub:**
```typescript
export function useNexus() {
  const [session, setSession] = useState<SessionState>({
    connected: false,  // Always false - needs real SDK
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

**What the frontend expects:**
```typescript
interface SessionState {
  connected: boolean      // Is NEXUS connected?
  bpm: number | null      // Current BPM
  key: string | null      // Current key (e.g., "C minor")
  devices: Array<{        // Devices in session
    id: string
    type: string
    name?: string
  }>
}
```

### 2. Device Adding

When Dr. Zay suggests adding a device (e.g., "Add Heisenberg"), the AI response includes an action:

```json
{
  "content": "Let's add some synth pads...",
  "action": {
    "type": "add_device",
    "label": "Add Heisenberg",
    "params": {
      "deviceType": "heisenberg",
      "displayName": "Heisenberg"
    }
  }
}
```

The frontend shows a button. When clicked, it calls `addDevice(deviceType, displayName)`. You need to make this actually add the device via NEXUS SDK.

### 3. Real-time Session Updates

The frontend displays session info in the GoalBanner component:
- BPM
- Key
- Device count

These should update in real-time as the Audiotool session changes.

---

## How Frontend Calls Backend

**Chat Request:**
```typescript
POST /api/chat
{
  "messages": [
    { "role": "user", "content": "How do I add bass?" },
    { "role": "coach", "content": "Previous response..." }
  ],
  "goal": "Lo-fi beat",
  "sessionInfo": {
    "bpm": 85,
    "key": "C minor",
    "devices": [{ "id": "1", "type": "beatbox9" }]
  }
}
```

**Chat Response:**
```typescript
{
  "content": "AI response text...",
  "action": {
    "type": "add_device",
    "label": "Add Bassline",
    "params": { "deviceType": "bassline", "displayName": "Bassline" }
  } | null,
  "model": "meta-llama/Meta-Llama-3.1-8B-Instruct"
}
```

---

## Integration Options

### Option A: WebSocket from Frontend
- Frontend connects directly to NEXUS WebSocket
- Backend only handles AI/TTS
- Simpler backend, more frontend work

### Option B: Backend Proxies NEXUS
- Backend maintains NEXUS connection
- Frontend calls backend for everything
- More complex backend, simpler frontend

### Option C: Hybrid
- Frontend connects to NEXUS for real-time updates
- Backend still handles AI with session context
- Best of both worlds

---

## Device Types to Support

The AI is trained to suggest these Audiotool devices:

| Device | Type ID | Description |
|--------|---------|-------------|
| Beatbox 8 | `beatbox8` | Classic drum machine |
| Beatbox 9 | `beatbox9` | Modern drum machine |
| Heisenberg | `heisenberg` | FM synthesizer |
| Pulverisateur | `pulverisateur` | Granular synth |
| Bassline | `bassline` | TB-303 style bass |
| Machiniste | `machiniste` | Analog-style synth |
| Tonematrix | `tonematrix` | Melodic sequencer |

---

## Testing the Current Backend

```bash
# Health check
curl http://localhost:3021/api/health

# Chat test
curl -X POST http://localhost:3021/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "How do I start?"}], "goal": "Lo-fi beat"}'

# TTS test
curl -X POST http://localhost:3021/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Yo lets make a beat"}' \
  --output test.mp3
```

---

## Questions?

Hit up Isayah on Slack or check the full implementation details in [IMPLEMENTATION.md](../IMPLEMENTATION.md).
