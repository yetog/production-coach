# Production Coach

> AI-powered music production assistant for Audiotool - NEXUS Hackathon 2026

## Quick Start

```bash
# Frontend
npm install
npm run dev

# Backend (separate terminal)
cd server
npm install
node index.js
```

**Live Demo:** https://zaylegend.com/production-coach/

---

## Current Status

| Component | Status | Owner |
|-----------|--------|-------|
| Frontend UI | **v1 Complete** | Isayah |
| Backend API | **v1 Complete** | Isayah |
| NEXUS SDK Integration | **Unified typed Dr. Zay tool loop + AgentService bridge implemented** | Nolan |
| QA Testing | **Automated QA complete; live write/browser gates pending** | Arian |

---

## Documentation

| Document | Audience | Description |
|----------|----------|-------------|
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | All | Full technical overview |
| [docs/BACKEND.md](./docs/BACKEND.md) | Nolan | Backend integration guide |
| [docs/QA_TESTING.md](./docs/QA_TESTING.md) | Arian | Testing checklist |

---

## What's Built (Frontend v1)

- Chat interface with Dr. Zay AI persona
- Animated avatar with state transitions (idle/listening/thinking/speaking)
- Voice input (Web Speech API)
- Voice output (ElevenLabs TTS)
- Settings sidebar (voice toggle, preferences)
- Production goal tracking
- 9-step progress checklist
- Quick prompt suggestions
- Session persistence (localStorage)

## What's Built (Backend v1)

- Express.js API server (port 3021)
- IONOS Model Hub integration for AI chat
- ElevenLabs integration for text-to-speech
- Dr. Zay system prompt with coaching persona
- Device suggestion parsing from AI responses

## Current Release Gates

- Live Audiotool apply → verify → undo against an approved test project
- Browser-level unpacked Chrome extension E2E

## Deferred Follow-ups

- Chattiness slider functionality
- Persona switching

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Express.js, Node.js
- **AI:** Vercel AI SDK tool loop with OpenAI/IONOS-compatible providers
- **Voice:** ElevenLabs TTS, Web Speech API STT
- **Hosting:** Nginx reverse proxy

---

## Team

- **Isayah** - Frontend, Backend API
- **Nolan** - NEXUS SDK, Backend Integration
- **Arian** - QA Testing
