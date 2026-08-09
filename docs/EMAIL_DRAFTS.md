# Email Drafts

---

## Email to Nolan (Backend/NEXUS SDK)

**Subject:** Production Coach - Backend Integration Ready for NEXUS SDK

---

Hey Nolan,

I've pushed the frontend and basic backend for Production Coach. The app is live at https://zaylegend.com/production-coach/ - give it a try!

**What's done:**
- Full chat UI with Dr. Zay avatar (animates based on state)
- Express.js backend with IONOS Model Hub for AI chat
- ElevenLabs integration for text-to-speech
- Voice input using Web Speech API
- Settings sidebar, progress checklist, goal tracking

**What we need from you:**
The main thing is NEXUS SDK integration so we can connect to real Audiotool sessions. I've documented exactly what the frontend expects and how to integrate it here:

**Read this:** https://github.com/yetog/production-coach/blob/main/docs/BACKEND.md

Key things:
1. The frontend has a stub hook (`src/hooks/useNexus.ts`) that needs real NEXUS connection
2. We need real-time session data (BPM, key, devices)
3. The `addDevice()` function needs to actually add devices via NEXUS

The backend is already set up to pass session context to the AI, so once NEXUS is connected, Dr. Zay will give more relevant coaching based on what's actually in the session.

Let me know if you have questions or want to hop on a call to walk through the architecture.

-Isayah

---

## Email to Arian (QA Testing)

**Subject:** Production Coach - Ready for QA Testing (v1)

---

Hey Arian,

Production Coach v1 is ready for testing!

**Test URL:** https://zaylegend.com/production-coach/

**Important:** This is v1 - the NEXUS SDK integration isn't done yet, so the app runs in "Demo Mode" and doesn't connect to real Audiotool sessions. That's expected for now. Focus on testing what IS working.

I've put together a full QA testing checklist for you:

**Read this:** https://github.com/yetog/production-coach/blob/main/docs/QA_TESTING.md

**What to test:**
- Chat with Dr. Zay (real AI responses)
- Voice output (enable in sidebar settings)
- Voice input (mic button)
- Avatar animations
- Goal setting flow
- Progress checklist
- Settings sidebar
- Responsive design (desktop/tablet/mobile)
- Edge cases (long messages, rapid sending, etc.)

**What's NOT working yet (don't report these):**
- "Demo Mode" always shows (NEXUS not implemented)
- Chattiness slider doesn't affect AI
- Persona switch doesn't change behavior
- No actual devices get added to Audiotool

The testing doc has a full checklist and bug report template. Let me know what you find!

-Isayah

---
