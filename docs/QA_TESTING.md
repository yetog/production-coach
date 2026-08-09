# QA Testing Plan

> For Arian - Production Coach v1 Testing

---

## Overview

This document covers what to test in the current v1 build. Note that **NEXUS SDK integration is NOT implemented yet** - the app runs in "Demo Mode" and doesn't connect to real Audiotool sessions.

**Test URL:** https://zaylegend.com/production-coach/

---

## What's Testable Now

| Feature | Status | Notes |
|---------|--------|-------|
| Chat with AI | Working | Real AI responses via IONOS |
| Voice Output (TTS) | Working | Enable in sidebar settings |
| Voice Input (STT) | Working | Click mic button, requires browser permission |
| Avatar Animations | Working | Changes based on state |
| Goal Setting | Working | Set on first visit |
| Progress Checklist | Working | Toggle items |
| Settings Sidebar | Partial | Some options not wired yet |
| NEXUS Connection | NOT Working | Always shows "Demo Mode" |

---

## Test Checklist

### 1. First Visit Experience
- [ ] App loads without errors
- [ ] Dr. Zay avatar displays correctly
- [ ] Goal input form appears
- [ ] Can enter and submit a production goal
- [ ] After setting goal, Goal Banner appears with the goal text

### 2. Chat Functionality
- [ ] Can type message in input field
- [ ] Send button works (or press Enter)
- [ ] AI responds within ~3-5 seconds
- [ ] Dr. Zay's responses are coaching-style (not generic AI)
- [ ] Chat persists after page refresh (localStorage)
- [ ] "Clear Conversation" in sidebar works

### 3. Avatar States
| State | Trigger | What to See |
|-------|---------|-------------|
| Idle | Default | Blue/purple glow, "Ready to coach" |
| Thinking | After sending message | Yellow glow, "Thinking...", pulsing |
| Speaking | When TTS plays | Cyan glow, "Speaking...", audio bars |
| Listening | Mic button pressed | Green glow, "Listening...", "Recording" |

### 4. Voice Features

**Text-to-Speech (TTS):**
- [ ] Open sidebar, enable "Dr. Zay Voice"
- [ ] Send a message
- [ ] Audio should play after AI responds
- [ ] Avatar should show "Speaking" state during playback

**Speech-to-Text (STT):**
- [ ] Click microphone button (bottom left of input)
- [ ] Browser asks for mic permission - allow it
- [ ] Button turns red, avatar shows "Listening"
- [ ] Speak a message
- [ ] Message should auto-send when you stop speaking
- [ ] If browser doesn't support STT, mic button won't appear

### 5. Sidebar Settings
- [ ] Hamburger menu opens sidebar
- [ ] "X" button closes sidebar
- [ ] Clicking backdrop closes sidebar
- [ ] Connection status shows "Demo Mode" (expected for now)
- [ ] Voice toggle works
- [ ] Current goal displays correctly
- [ ] "Change" goal button works (clears conversation)
- [ ] "Clear Conversation" button works

**Not working yet (expected):**
- Chattiness slider (UI only, doesn't affect AI)
- Coach Preferences (Dr. Zay vs Classic - UI only)

### 6. Progress Checklist
- [ ] Checklist appears after goal is set
- [ ] Can expand/collapse with header click
- [ ] Can toggle individual items complete/incomplete
- [ ] Progress bar updates correctly
- [ ] Shows "+X more steps" when collapsed

### 7. Quick Prompts
- [ ] Prompt chips appear above input
- [ ] Clicking a chip sends that message
- [ ] Prompts change based on whether goal is set

### 8. Responsive Design
Test on:
- [ ] Desktop (1920x1080)
- [ ] Tablet (iPad size)
- [ ] Mobile (iPhone size)
- [ ] Avatar should scale appropriately
- [ ] Chat should remain usable
- [ ] Sidebar should work on mobile

### 9. Edge Cases
- [ ] Very long message (500+ characters)
- [ ] Rapid message sending (spam test)
- [ ] Empty message (should not send)
- [ ] Special characters in message
- [ ] Emoji in message
- [ ] Page refresh mid-conversation
- [ ] Opening in incognito (no localStorage)

### 10. Error Handling
- [ ] Network disconnect during chat (should show fallback)
- [ ] If TTS fails, chat still works
- [ ] No console errors during normal use

---

## Known Issues (Don't Report These)

1. **"Demo Mode" always shows** - NEXUS SDK not implemented yet
2. **Chattiness slider doesn't change AI response length** - Not wired up
3. **Persona switch doesn't change AI behavior** - Not wired up
4. **No actual devices get added** - NEXUS SDK not implemented
5. **BPM/Key/Devices always empty** - NEXUS SDK not implemented

---

## Browser Compatibility

Test in:
- [ ] Chrome (primary)
- [ ] Firefox
- [ ] Safari
- [ ] Edge

Note: Voice input (STT) may not work in all browsers. Chrome has best support.

---

## Bug Report Template

```
**Summary:**
**Steps to Reproduce:**
1.
2.
3.

**Expected:**
**Actual:**
**Browser/Device:**
**Screenshot:** (if applicable)
```

---

## Questions?

- **Isayah** - Frontend/UI issues
- **Nolan** - Backend/API issues (when NEXUS is implemented)

Check [IMPLEMENTATION.md](../IMPLEMENTATION.md) for full technical details.
