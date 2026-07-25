# Production Coach - Phase 0 Feasibility Read

> For Aryan & Zay (issue #15). Written after building and running the
> foundation: read-only bot package (`bot/`), offline spike green 17/17
> (`docs/NEXUS_CAPABILITIES_VERIFIED.md` has the raw evidence).
> Date: 2026-07-20 · Hackathon deadline: 2026-08-23.

## TL;DR

The SDK gives us everything the concept needs, at note-level granularity, in
real time, read-only. The foundation (bot join + event/query pipeline) is
built and proven offline; one verification step remains (live session, needs a
PAT - 30 minutes of human time, scripts ready). The real engineering work is
exactly where the spec predicted: **filtering** (when to speak) and
**session-summarization** (what Channel B tells the LLM). Nothing found so far
threatens the concept; ship confidence is high.

| Piece | Feasibility | Effort left | Risk |
|-------|-------------|-------------|------|
| Bot joins live session, read-only | Proven offline; live run pending PAT | hours | low (was our #1 risk - see below) |
| Event pipeline (Channel A trigger) | **Built + verified** | - | low |
| Query pipeline (Channel B lookup) | **Built + verified** | - | low |
| Channel A filtering (cooldowns, flow-state) | Clear design, needs live tuning | days | medium |
| Channel B session-summarization | Standard but real work | days | medium |
| Gap-check reasoning | Deterministic core built; phrasing layer left | days | medium-low |
| "Learning the software" (manual RAG + usage gaps) | Same pipeline, additive | days | low |

---

## 1. The #1 risk: bot-join + note-level events (spike result)

**Resolved in our favor, offline; one live confirmation left.**

- Individual notes are first-class entities. `onCreate("note")` fired once per
  note (4/4 in the spike), each event carrying `{pitch, velocity,
  positionTicks, durationTicks}` and resolving through
  collection -> region -> track -> **the device that plays it**. Pitch edits
  fire `onUpdate`; deletions fire cleanups. This is the exact data Channel A
  needs, at the exact granularity.
- Local dispatch latency is negligible (<40ms). The 150-300ms figure is purely
  network sync; `bot/npm run spike:live` prints per-event arrival timestamps
  to measure it against a real edit.
- What offline *cannot* prove: that `start()` syncs a real project to a
  headless second participant, and whether the producer sees the bot join
  (studio shipped an "online status" feature in July - assume **visible** and
  design for it: name the bot account something obvious like
  "Production Coach"). Both answers fall out of one spike-live run; if
  note events do NOT arrive live, the concept is dead and we stop - but every
  API contract says they will (that is what a "synced document" is).

**Ask:** one PAT (developer.audiotool.com/personal-access-tokens) + one shared
test project; then `cd bot && npm run spike:live` while someone plays notes.

## 2. Read-only connecting tissue (event + query pipeline) - done

The architecture the spec sketched now exists as code:

```
                       NEXUS live session (producer + bot as 2nd participant)
                                          |
                    bot/src/readonly.ts   |   runtime guard: modify() throws
                        __________________|_____________________
                       |  PUSH: events.ts                       |  PULL: query.ts
                       |  onCreate/onUpdate/onRemove            |  queryEntities snapshot
                       |  -> normalized CoachEvent stream       |  -> SessionAnalysis
                       |  {kind, live, pitch, velocity,         |  {bpm, signature, devices
                       |   beats, device, ...}                  |   by category, arrangement,
                       |______________________________________  |   cables, gap list}
                                          |                     |
                          Channel A (deterministic, no LLM)   Channel B (LLM, on demand)
```

- Read-only is enforced, not promised: the live document is wrapped so any
  write call throws. NEXUS has no read-only scope (`project:write` is the only
  scope), so this guard IS our safety story - worth one line in the pitch.
- Events observed during the initial sync replay are flagged `live: false`,
  so Channel A won't narrate the whole existing project at join time. That
  bug was designed out on day one.
- SDK is v0.0.17, "under heavy development", pinned exactly. Expect churn;
  the normalized event shape means SDK breakage stays inside `bot/src`.

## 3. Channel A filtering: cooldowns + flow-state - medium risk, the *product*

The mechanics are trivial (timers + an event-frequency counter over the
normalized stream). The risk is entirely in **tuning**: thresholds decide
whether the coach feels like a friend or a backseat driver, and they can only
be tuned against real playing, after spike-live. Plan:

- Deterministic path stays LLM-free: chord/key detection via Tonal.js over
  note events (pitch+timing are exactly its input format), device glossary
  lookup for instrument recognition. Latency budget survives easily - our
  pipeline adds <40ms to whatever the network delivers.
- Flow-state = rolling events/sec over the CoachEvent stream; speak only when
  the rate drops below a threshold for N seconds. Cooldowns per message
  category, Quiet/Normal/Chatty presets. All numbers are placeholders until
  live tuning - schedule a tuning session with a real producer (Zay?) in
  week 1 of Channel A work.

## 4. Channel B session-summarization - "the real engineering work", confirmed

`SessionAnalysis` already produces the structured facts (bpm, signature,
device inventory by category, arrangement stats, cable graph, gap list). What
remains is compression + phrasing: turning a 50-device, 2000-note session into
a prompt small enough for a low-latency LLM call without losing what matters.
Approach: tiered summary (project header -> per-device summary -> per-region
note digests, include raw notes only for the region under discussion).
Standard LLM-app work, no unknowns, but it deserves the "real work" label:
budget days, not hours, and evaluate answers against real sessions.

## 5. Gap-check reasoning - engineering risk contained

The naive version misfires (announcing "no bass!" during an intentional
ambient intro). Containment strategy, already reflected in the code: the
**facts** come from a deterministic checker (implemented - see
`recommend()` in `bot/src/query.ts`: no drums / no bass / no harmony / no
automation over N bars); the LLM only *phrases* what the checker found, and
the intent profile (from onboarding) gates which gaps are even mentionable.
Wrong-but-confident musical judgment is the failure mode to fear; keeping the
LLM out of the *deciding* seat contains it.

## 6. "Learning the software" angle - cheap, reuses everything

Two additions, both riding the existing pipeline, no new SDK surface:

- **Manual RAG:** index audiotool.com/help + our device glossary; Channel B
  answers "how do I sidechain?" grounded in both the manual and the *actual
  session* ("your Gravity's input is the Beatbox bus...") - the session
  context is what generic chatbots can't do, and it's free for us.
- **Usage-gap detection:** the same deterministic checker pattern over
  SessionAnalysis ("8 bars, no automation yet - want the filter-sweep
  walkthrough?"). Device-added events already carry the device category;
  "first time using X" nudges are a lookup away.

This is the judges' pedagogy story (CH.04) at marginal cost - recommend
keeping it in scope for the demo script.

## 7. What we're deliberately not worrying about

Writes of any kind (out of v1, guard enforces it), audio analysis (not in the
schema), selection/cursor UX (no such entity), sample-catalog features (the
API actually exists - `client.samples.list()` with full-text search - but the
feature stays cut for scope; good post-v1 candidate), cross-session memory
(post-hackathon). The mcp-server/ scaffold is vestigial;
the bot lives in `bot/` and the MCP wrapper can return post-v1 if we want
Claude-facing tools.

## Recommended next steps

1. PAT + shared test project -> run spike-live -> update
   NEXUS_CAPABILITIES_VERIFIED.md with the four live answers (30 min, human).
2. Green-light Channel A build on the normalized stream (Tonal.js + glossary +
   cooldown skeleton) - can start today, offline doc replays make a great test
   harness.
3. Book a live tuning session for the flow-state/cooldown numbers.
4. Channel B summarization layer once A narrates reliably.
