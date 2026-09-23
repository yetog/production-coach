# Production Coach - Technical Findings & Recommendations

## Context
While building Pulse Play (a fitness-to-music prototype using the same NEXUS SDK), I identified several gaps in our Production Coach architecture that should be addressed before demo.

## Technical Gaps Identified

### 1. OAuth/Redirect Flow Not Configured
- **Issue**: The app doesn't have a proper OAuth redirect flow set up
- **What's needed**: Register redirect URIs in Audiotool Developer Portal, configure client to use proper redirect URL
- **Reference**: See how ambient-chess handles this in `src/hooks/useAuth.ts`

### 2. Scopes Not Fully Aligned
- **Issue**: `project:write` scope is required for creating/modifying projects but may not be registered
- **What's needed**: Add `project:write` scope in Audiotool Developer Portal → Application Settings → Scopes
- **Status**: Without this, the assistant cannot create or modify tracks

### 3. No Direct NEXUS Integration
- **Issue**: Current architecture uses bridge server + chat API, but doesn't directly manipulate NEXUS entities
- **Comparison**: ambient-chess uses direct `nexus.modify()` calls to create tonematrix, synths, and cables in real-time
- **Recommendation**: Evaluate if bridge architecture is necessary or if direct browser SDK would be simpler

### 4. QA Testing Gap
- **Issue**: End-to-end flow (chat → project creation → entity manipulation → playback) has not been fully tested
- **What's needed**:
  - Create a test project manually in Audiotool
  - Verify each command actually creates the expected instruments
  - Document which commands work and which don't

## Recommendations for Demo

### Short-term (before demo)
1. Verify OAuth redirect is registered and working
2. Confirm `project:write` scope is enabled
3. Test at least one happy path: "add drums" → verify drums appear in Audiotool

### For Documentation
- Update README with actual setup steps (not aspirational)
- Document known limitations honestly

## My Contributions (Frontend/UX)
- Built chat interface with message history
- Implemented project URL input flow
- Connected to chat server API
- Created responsive UI

## Blockers Outside My Scope
- Backend API key management and NEXUS bridge logic (Nolan)
- End-to-end QA testing and validation (Arian)

---

*This feedback is intended to help the team identify gaps before demo and is not a criticism of anyone's effort. We all contributed what we could with the time available.*
