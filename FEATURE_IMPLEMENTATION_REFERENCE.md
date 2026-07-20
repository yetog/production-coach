# Production Coach — Feature Implementation Reference

> For the dev team. Grounded in the real `@audiotool/nexus` v0.0.17 docs (developer.audiotool.com).
> Last updated: 2026-07-19

---

## 📍 Build tracker — where we are

Update the status column as we go. This table is the single source of truth for build progress.

| Phase | Name | Status |
|-------|------|--------|
| **Phase 0** | Foundation | 🔲 Not started |
| **Phase 1** | Channel A core (hero) | 🔲 Not started |
| **Phase 2** | Channel B | 🔲 Not started |
| **Phase 3** | Polish | 🔲 Not started |

Status key: 🔲 Not started · 🟡 In progress · ✅ Done · ⛔ Blocked

| # | Feature | Phase | Owner | Status |
|---|---------|-------|-------|--------|
| 0.1 | Bot joins live session | Foundation | — | 🔲 |
| 0.2 | Read-only event/query pipeline | Foundation | — | 🔲 |
| 1.1 | Live chord/key narration | Channel A | — | 🔲 |
| 1.2 | Instrument recognition | Channel A | — | 🔲 |
| 1.3 | Rhythm/density feedback | Channel A | — | 🔲 |
| 1.4 | "What's missing" gap check | Channel A | — | 🔲 |
| 1.5 | Intent-aware suggestions | Channel A | — | 🔲 |
| 1.6 | Idle-nudge system | Channel A | — | 🔲 |
| 1.7 | Flow-state suppression | Channel A | — | 🔲 |
| 1.8 | Chattiness modes + cooldowns | Channel A | — | 🔲 |
| 1.9 | Live visual readout | Channel A | — | 🔲 |
| 1.10 | Attribution companion | Channel A | — | 🔲 |
| 2.1 | Session-grounded Q&A | Channel B | — | 🔲 |
| 2.2 | "What should I add?" | Channel B | — | 🔲 |
| 2.3 | Collapsible chat UI | Channel B | — | 🔲 |
| 2.4 | Voice input for questions | Channel B | — | 🔲 |
| 3.1 | Collapsible strip, collapsed by default | Polish | — | 🔲 |
| 3.2 | Intent capture (onboarding) | Polish | — | 🔲 |
| 3.3 | Live tuning of cooldowns | Polish | — | 🔲 |

---

## The one rule that governs everything

Our user is a **beginner**. They don't know what a Kobolt is, they don't know what key they're
in, and they did not open Audiotool to receive a theory lecture. Every feature exists to answer
one of their real questions — *"what do I do next," "why does this sound off," "how do I make
this happier"* — at the moment they have it, and to shut up otherwise.

**If an implementation choice makes the coach talk more, it's probably wrong.**

---

## What NEXUS actually gives us (verified against the docs)

The bot connects as **another participant in the multiplayer session** — the exact same mechanism
the DAW itself uses. There is no plugin API and no special observer mode; we are simply a second
client that chooses never to write.

### ✅ Confirmed readable, live

| Data | Details |
|------|---------|
| Notes | `positionTicks`, `durationTicks`, `pitch`, `velocity`, `doesSlide`, `collection` pointer — real symbolic MIDI |
| Devices | Every device entity by type (`heisenberg`, `beatbox8`, ...) with live field values (`gain`, `isMuted`, ...) |
| Timeline | `noteTrack`, `noteRegion` (tick positions/durations), automation tracks + the parameters they point to |
| Routing | `desktopAudioCable` / `desktopNoteCable` with `fromSocket`/`toSocket` pointers — full signal graph |
| Events | `onCreate(type, cb)`, `onCreate("*")`, `onUpdate(field, cb)`, `onPointingTo`, `onRemove` |

### ⚠️ Hard constraints (design around these, don't fight them)

1. **~150–300ms event latency** to US-Central. Fast, but not synced to the playhead. We always
   describe the recent past — phrase narration in past tense ("that last chord was...").
2. **Subscriptions must be registered before `nexus.start()`.** Remote changes are withheld until
   `start()` — set up every listener first or we silently miss entities. The #1 foot-gun in the SDK.
3. **Query results are short-lived.** The document mutates under us at any time (multiplayer).
   Never cache entity references across async boundaries; stale references throw.
4. **No raw audio, no transport state, no selection state.** We see the score, not the sound. We
   don't know if the project is playing, and we can't highlight anything in the DAW canvas.
5. **`nexus.modify()` works — we never call it.** v1 is read-only end to end. Product decision,
   not a technical limit. Any PR introducing a `modify` call gets rejected.
6. **SDK is pre-1.0 (v0.0.17)** and the docs warn it may break. Wrap all NEXUS access behind one
   thin adapter module so a breaking change is a one-file fix.

---

# PHASE 0 — Foundation

> Nothing here is user-visible. Everything user-visible depends on it.

## 0.1 Bot joins live session

**👤 The beginner's experience**
None — and that's the point. They open their project like always. Nothing installs, nothing pops
up, no "connect your account" wall before they've made a sound. The companion is just quietly
*there*, the way a friend in a multiplayer session would be.

**⚙️ What it does**
Authenticates via OAuth (`audiotool({...})` with scope `project:write` — required by the platform
even though we only read) and opens the project with `at.open(projectUrl)`.

**🛠 Implementation advice**
- OAuth redirect **must** be `http://127.0.0.1:5173/`, not `localhost` — the docs call this out
  explicitly and it fails silently otherwise. Match the Vite config, the registered redirect URI,
  and the `redirectUrl` param exactly.
- Handle `at.status === "unauthenticated"` with a single login button and halt. No retry
  cleverness for v1.
- For server-side pieces: tokens exported via `at.exportTokens()` feed `createServerAuth` +
  `createNodeTransport` + `createDiskWasmLoader`. Decide early whether the reasoning loop lives
  in-browser or server-side — it changes where this handoff happens.
- Develop against `createOfflineDocument()` from day one — full document instance, no backend,
  no auth. The entire event/analysis pipeline is testable without a live session. Pass
  `{ validated: false }` in integration tests to reduce transaction-error noise.

## 0.2 Read-only event/query pipeline

**👤 The beginner's experience**
Still none, still the point. But every single thing the coach ever says traces back to this layer
being right. If this is flaky, the coach narrates chords that weren't played and recommends adding
drums that already exist — and a beginner has no way to know the tool is wrong. They'll assume
*they* are.

**⚙️ What it does**
One adapter module that owns all NEXUS access and emits clean app-level events ("note added",
"device added", "region moved") that the rest of the app consumes. Nobody outside this module ever
touches `nexus.*` directly.

**🛠 Implementation advice**
- Register listeners, **then** call `nexus.start()`. Order is load-bearing (constraint #2).
- Use `onCreate("*")` during development to log everything and learn a session's real entity
  traffic; switch to typed subscriptions (`onCreate("note", ...)`) for production paths.
- `onCreate` callbacks can return a cleanup function that runs on entity removal — use this to
  keep an in-memory session inventory (devices, notes, regions) that's always current without
  re-querying. That inventory is the single source every downstream feature reads.
- When querying, prefer typed helpers (`getEntityAs(id, "stompboxDelay")`) and chained filters
  (`ofTypes(...).pointedToBy.entitiesOfType("desktopAudioCable")`) — documented as more efficient
  and they keep TypeScript honest.
- Terminate unneeded subscriptions (`sub.terminate()`); long sessions leak listeners otherwise.
- Build `summarizeSession()` here too — the function turning the live inventory into a compact
  structured summary. Channel B lives or dies on this existing (see 2.1).

---

# PHASE 1 — Channel A core (hero)

> The beginner never asked Channel A anything. So the bar for speaking is "worth interrupting
> someone for," which almost nothing is. Every feature below has more implementation effort in
> the **restraint** logic than in the detection logic.

## 1.1 Live chord/key narration

**👤 The beginner's experience**
They play by ear. They found three chords that sound good together and have no idea why. What they
want is the occasional *"that move from F to D minor is what's giving you that bittersweet feel"*
— a name for the thing their ear already found. What they absolutely do not want is a voice
announcing every single note like a subtitle track. If it narrates every key press, they close the
panel in two minutes and never reopen it.

**⚙️ What it does**
Batches incoming `note` entities into musical phrases, runs chord/key detection, and speaks a
short observation — occasionally, about the *phrase*, never about individual notes.

**🛠 Implementation advice**
- Notes give us `pitch` + `positionTicks` + `durationTicks` directly — feed **Tonal.js** (or
  similar). Do not hand-roll chord detection; solved problem, hackathon-killing rabbit hole.
- **Batch, don't stream.** Buffer notes; run detection only when the buffer has been quiet ~2s or
  spans a full bar (`Ticks` constants for bar math). One spoken line per *phrase*, not per note.
  This is the single most important implementation decision in the product.
- Narrate meaning, not vocabulary. "Fmaj7 — borrowed iv, nice tension" is our jargon ceiling, and
  even that should be rare. Prefer effect-first phrasing the beginner can *use*: "that last chord
  adds tension — resolving back to F would feel like coming home."
- Track what's been said. The same chord loop playing 5 minutes = say it once, then never again.
  Keep a per-session "already narrated" set.
- The 150–300ms latency means we always describe the recent past. Write every line in past tense
  so the delay reads as natural rather than laggy.

## 1.2 Instrument recognition

**👤 The beginner's experience**
They dragged something called "Pulverisateur" onto the desktop because the icon looked cool. They
have no idea what it is. One quiet line — *"that's an aggressive synth, good for hard leads and
wobble bass"* — turns a random click into a small win. That's the whole feature.

**⚙️ What it does**
On `onCreate` for any device type, looks the type up in our static glossary and optionally speaks
one plain-language line about what it's for.

**🛠 Implementation advice**
- The entity type string **is** the identity — `onCreate("pulverisateur", ...)` fires with
  certainty. Zero LLM involvement; dictionary lookup against `deviceGlossary.json`.
- The engineering is trivial; the *curation* is the feature. Every glossary line must answer
  "what would I use this for" in beginner words, not spec-sheet words ("warm, vintage drum
  sounds" — not "analog-style 9-pad sampler").
- Speak only for the first instance of a device type per session. The second Beatbox they add,
  they already know.
- Shares Channel A's cooldown budget (1.8) — a device drop right after a chord narration should
  queue or drop, not stack two voice lines back to back.

## 1.3 Rhythm/density feedback

**👤 The beginner's experience**
Their loop feels flat and they can't articulate why. The question in their head isn't "what is my
note density" — it's *"how do I give this more rhythm?"* Useful feedback is directional: *"your
drums hit the same way every bar — try adding a hit just before beat 3 to give it a push."*
Useless feedback is descriptive: "your pattern density is low."

**⚙️ What it does**
Reads note timing within drum patterns/regions, computes simple density and repetition measures
per bar, and — only when the producer seems to be working on rhythm — offers one concrete,
directional suggestion.

**🛠 Implementation advice**
- Same note pipeline: `positionTicks` within a region, bucketed by beat via `Ticks` math. Group
  notes per track by following the `collection` pointer chain so drums and melody aren't scored
  together.
- Start with two dumb, explainable heuristics: (a) onsets-per-bar vs. a genre-typical range,
  (b) bar-to-bar self-similarity (identical bars N times = "flat"). Resist anything fancier until
  live-tuned — the data is free, the *thresholds* are pure taste and need Aryan's ear, not math.
- Trigger contextually: only speak when recent events concentrate on a drum device's tracks (i.e.,
  they're actively working on rhythm). Rhythm advice while they're picking a synth preset is the
  definition of the backseat-driving failure mode.
- Every suggestion must be *actionable in one move*: one added hit, one moved note, one muted
  layer. Never a paragraph of rhythm theory.

## 1.4 "What's missing" gap check

**👤 The beginner's experience**
They've been looping the same 8 bars for ten minutes. It sounds okay-but-thin and they genuinely
can't tell what's absent — they don't have the checklist in their head that says a house track
wants drums + bass + chords + movement. One line — *"this is sounding good; the reason it feels
thin is there's no low end yet"* — is the difference between finishing a track and quitting.

**⚙️ What it does**
Maintains a session inventory (from Phase 0), compares it to a simple genre/intent profile, and
surfaces the single most important gap — mostly via the idle nudge (1.6) or when asked directly in
Channel B.

**🛠 Implementation advice**
- Inventory is cheap: the live device map plus per-device "has notes?" (does any `noteTrack`
  pointing at this device have populated `noteRegion`s). Routing via cable queries tells us if
  something is wired to the mixer vs. sitting disconnected — a device with no cable is a gap of
  its own ("your Bassline isn't connected to anything yet").
- The reasoning is an LLM call: inventory summary + intent profile in, **one** ranked gap out.
  Prompt for exactly one suggestion — never a list. A beginner handed five gaps hears "you're
  failing at five things."
- Gate on session maturity: an empty project has everything "missing." Don't run the check until
  at least one device has notes; before that, onboarding (3.2) owns the conversation.
- Phrase gaps as the *feeling* they cause, then the fix: "feels thin → no low end → try a bass,"
  not "MISSING: bass."

## 1.5 Intent-aware suggestions

**👤 The beginner's experience**
They said "dark, soulful house" at the start. If the coach later suggests a bright plucky lead,
the spell breaks instantly — it proves the thing was never actually listening. Intent-awareness
isn't a feature they see; it's the **absence** of suggestions that contradict what they said.

**⚙️ What it does**
Injects the captured intent profile (genre, mood, vibe — from 3.2) plus a per-session rejection
memory into every LLM prompt the coach makes, across both channels.

**🛠 Implementation advice**
- Pure prompt engineering — zero new NEXUS surface. Maintain one `sessionContext` object
  (intent + rejected suggestions + already-narrated items) and thread it through every prompt as
  a system-message block.
- Rejection memory matters more than intent: if they ignored or dismissed a suggestion, log it
  and never re-suggest this session. Repeating a rejected suggestion is the fastest trust-killer.
- In-memory only, dies with the session. No database — cross-session memory is explicitly
  post-hackathon (needs Mem0/Zep-style integration; ElevenLabs has no native cross-session recall).

## 1.6 Idle-nudge system

**👤 The beginner's experience**
Stuck is silent. When a beginner doesn't know what to do next, they don't ask — they stare, then
close the tab. The nudge exists for exactly that moment: several minutes of nothing, then one
gentle *"if you're stuck — this could use some low end, want ideas?"* It must never fire during a
listening pass, which from our side looks identical to being stuck.

**⚙️ What it does**
Client-side timer on event inactivity; on expiry, delivers one contextual suggestion sourced from
the gap check.

**🛠 Implementation advice**
- Trivial mechanics: reset a timer on every pipeline event; fire once at ~3–5 min idle.
- The hard part is what we *can't* see: no transport state means "idle" might mean "listening to
  their loop on repeat" — engaged, not stuck. Mitigations: (a) long threshold, (b) fire at most
  once, maybe twice per session ever, (c) soft phrasing that lands fine mid-listen ("if you're
  stuck..." reads okay; "you seem stuck" does not).
- If Nolan's transport spike ever lands, gate on paused-state. Until then, assume we cannot
  distinguish and phrase defensively.

## 1.7 Flow-state suppression

**👤 The beginner's experience**
Invisible, and the most important feature in the product. When they're heads-down laying notes as
fast as they can think, *any* voice is an interruption — even a correct, helpful one. The magic
moment we're building toward is the user realizing afterward: "it stayed quiet the whole time I
was in the zone."

**⚙️ What it does**
Measures rolling event frequency from the pipeline; above a threshold, hard-mutes all Channel A
output. Channel B always answers — a direct question is never suppressed.

**🛠 Implementation advice**
- Rolling window (events in the last 30–60s) with hysteresis: enter flow-state fast, exit slowly.
  Flapping between chatty and silent is worse than either extreme.
- Queue-then-mostly-drop: observations generated during flow should expire, not pile up. Speaking
  four stale observations the moment they pause is the nightmare scenario. At most, the single
  most recent high-value observation may survive the queue.
- Thresholds are placeholders until live tuning (3.3). Build them as hot-reloadable config from
  day one so tuning sessions don't require redeploys.

## 1.8 Chattiness modes + cooldowns

**👤 The beginner's experience**
Control. Some people want a talkative companion; most beginners, already overwhelmed by the DAW
itself, want Quiet. The mode toggle is the user's one big lever over the product's entire
personality — and every skipped line is also an ElevenLabs call we didn't pay for.

**⚙️ What it does**
Global speech governor — Quiet/Normal/Chatty modes, per-category cooldown timers, a no-repeat
set, and priority ordering when multiple observations compete.

**🛠 Implementation advice**
- One module, one responsibility: every Channel A utterance passes through `canSpeak(category)`
  before TTS is ever called. No feature talks directly to ElevenLabs.
- Local state machine, zero SDK dependency. Categories (harmony / device / rhythm / gap) get
  independent cooldowns so one chatty category can't starve the others.
- Cooldowns are the cost control: TTS is only synthesized *after* the governor approves. Default
  to **Quiet-ish for the demo** — judges seeing restraint is the product thesis; judges seeing a
  chatterbox is the product failing on stage.
- Starting numbers (90s/40s) are placeholders — same hot-reload config as 1.7.

## 1.9 Live visual readout

**👤 The beginner's experience**
The glow answers one question at a glance — *"is it alive and did it notice?"* — without demanding
to be read. A pulse when something was observed, the last line visible if they look over, nothing
more. The moment it becomes a scrolling feed, it's a second screen competing with the DAW, and
we've recreated the exact overwhelm we exist to fix.

**⚙️ What it does**
Collapsed-strip status — a pulse animation on new observation, plus the most recent line as a
single static string.

**🛠 Implementation advice**
- Feed it from the same governor as speech (1.8): the glow pulses when a line is *approved*, so
  visual and voice never disagree.
- One line of state, hard limit. No history, no scrollback, no log. If they want history, that's
  a Channel B question ("what did you say earlier?") — don't build a feed UI.
- Cheap on data, expensive on design. Budget real design iteration time with Aryan; this is the
  face of the product in every screenshot.

## 1.10 Attribution companion

**👤 The beginner's experience**
They're blending a tabla pattern into their house track. The coach saying *"that rhythm is rooted
in Hindustani taal — specifically a keherwa feel"* does two things: teaches them what they're
actually reaching for, and credits where it came from. What it must never do is the generic
gesture — "nice ethnic vibes" is worse than silence.

**⚙️ What it does**
When narration touches a recognizable named tradition, names the tradition and lineage aloud,
every time, as part of the same spoken line.

**🛠 Implementation advice**
- Same pipeline as 1.1 — a prompt-layer addition, not a new system. The narration prompt carries
  a standing instruction: if a pattern/scale/technique maps to a named tradition, name it
  specifically; if unsure, say nothing rather than approximate.
- Curate a small, verified tradition reference (scales/taals/modes detectable symbolically from
  pitch + timing data) with Aryan as domain reviewer. Precision over coverage: five traditions
  named correctly beats fifty named vaguely — and one wrong attribution in front of this judging
  panel costs more than the feature earns.
- Never suppressed by novelty rules — unlike chord narration, attribution repeats by design.
  Credit every time it applies.

---

# PHASE 2 — Channel B

> Channel B inverts the rules: they asked, so answer — immediately, directly, no cooldowns, no
> suppression. A beginner asking a question is the best signal we ever get; the answer is the
> moment the product earns its keep.

## 2.1 Session-grounded Q&A

**👤 The beginner's experience**
They ask *"why does this sound muddy?"* and get an answer about **their actual project** — "your
bass and your pad are both sitting low; try muting the pad's low notes" — not a generic mixing
article read aloud. The grounding is the entire difference between this and alt-tabbing to
ChatGPT.

**⚙️ What it does**
On question: serializes current session state into a compact summary, sends summary + intent
context + question to the LLM, returns one direct answer.

**🛠 Implementation advice**
- **The summarizer is the feature.** `summarizeSession()` (built in 0.2): devices (type, name,
  connected-or-not), per-track note stats (count, pitch range, density), region layout in bars,
  detected key/chords from the 1.1 buffer, active intent. Target a compact structured block —
  small enough for fast/cheap calls. Groq-class latency matters: a voice question deserves an
  answer in ~2s, not ~10.
- Snapshot **at question time**, synchronously from the in-memory inventory — never mid-flight
  queries against a mutating document (constraint #3).
- Answer contract in the prompt: 1–3 sentences, concrete, references their actual device names
  ("your Beatbox 8"), ends with an action they can take. Explicitly forbid theory-lecture answers.
- Honesty rule for what we can't see: no audio, no mix analysis. Asked "does my mix sound good,"
  the answer is honest about seeing the score, not the sound — and pivots to what we *can* assess
  (arrangement, density, coverage). Never fake an opinion about audio we can't hear.

## 2.2 "What should I add?"

**👤 The beginner's experience**
The literal most common beginner question, asked at the most vulnerable moment. The answer needs
to be **one** thing, named, findable, and reasoned: *"a bass — try the Bassline device; your track
has rhythm and chords but nothing anchoring the low end."* Three options is a decision they can't
make; a device they can't find is a dead end.

**⚙️ What it does**
Gap check (1.4) + device glossary + intent → single recommendation with a one-line why.

**🛠 Implementation advice**
- Composition, not new machinery: `summarizeSession()` output + glossary + intent into one prompt
  that must return exactly one device recommendation and one reason.
- Only recommend from the curated glossary of built-in devices — "where do I find it" was cut
  because there's no sample-catalog API; don't reintroduce that failure by recommending anything
  we can't name from the glossary.
- Follow-up-ready: "what should I add?" → answer → "okay what else?" should walk the gap ranking
  downward, not repeat itself. Keep the ranked list from 1.4 in session state.

## 2.3 Collapsible chat UI

**👤 The beginner's experience**
The drawer is a conversation that happens, then *gets out of the way*. It opens when they engage
and — critically — closes **itself** after the exchange settles. A beginner will not manage our
window for us; if it stays open, it's permanent clutter they feel vaguely guilty about — the exact
anti-overwhelm failure we exist to prevent.

**⚙️ What it does**
Dormant icon by default; expands on interaction; auto-collapses after N seconds of conversational
inactivity.

**🛠 Implementation advice**
- Auto-collapse is the defining behavior — build it first, not last. Reset the collapse timer on
  any interaction; ~20–30s of quiet → drawer closes on its own, glow strip remains.
- Preserve conversation state across collapse/expand within a session — reopening shows the
  thread, not a blank slate.
- Standard front-end work, but it *is* the product's personality in UI form. Spec the states
  (dormant / glowing / expanded / collapsing) with Aryan before coding — "feels right" is the
  acceptance test.

## 2.4 Voice input for questions

**👤 The beginner's experience**
Their hands are on the keyboard playing. Asking *"what scale was I just in?"* out loud, without
stopping, is the whole promise of a companion over a chatbot. But typing must work first — voice
input with a broken Q&A behind it is a demo of nothing.

**⚙️ What it does**
Speech-to-text feeding the exact same Channel B pipeline as typed input.

**🛠 Implementation advice**
- Sequence strictly after 2.1 works via text. STT is well-trodden (ElevenLabs STT, or browser
  SpeechRecognition as fallback) — the risk isn't the tech, it's building it before the thing it
  feeds exists.
- Push-to-talk, not always-listening, for v1: a mic button or hotkey. Open-mic wake-word
  detection is a rabbit hole and a privacy question we don't need at a hackathon.
- Route STT output through the identical question pipeline — no separate voice path, no
  divergence.

---

# PHASE 3 — Polish

## 3.1 Collapsible strip, collapsed by default

**👤 The beginner's experience**
First impression. They open the project and the companion is a slim, calm presence beside the DAW
— not a dashboard demanding attention. Collapsed-by-default *is* the product thesis rendered as a
default value.

**🛠 Implementation advice**
- Mostly built by now if 1.9 and 2.3 were done right — this phase unifies them into one state
  machine (dormant → glowing → expanded → auto-collapse) and sands the transitions.
- Budget genuine design-iteration time with Aryan; the acceptance test is a feeling.

## 3.2 Intent capture (onboarding)

**👤 The beginner's experience**
One friendly question before anything else — *"what are we making today?"* — answered in one tap
("dark house") or one typed phrase, skippable entirely. This is the only setup moment in the whole
product; if it feels like a form, we've lost them before the first note.

**🛠 Implementation advice**
- Pure UI + one small parse (free-text vibe → `{genre, moods[], vibe}` via a single LLM call).
  Writes the `sessionContext` object that 1.4, 1.5, and 2.2 all read.
- **Sequencing trap:** listed under Polish, but intent-aware features silently degrade without it.
  Ship a stub early (hardcoded intent or a plain text box) so Channel A development never blocks
  on the pretty version.
- Skippable, with a sane default profile — a beginner who skips still gets a working coach, just
  a less personalized one.

## 3.3 Live tuning of cooldowns

**👤 The beginner's experience**
This is where "technically works" becomes "feels like a friend." Every threshold in 1.6/1.7/1.8 is
a guess until someone actually produces music next to the running app and reports where it nagged
and where it went weirdly mute.

**🛠 Implementation advice**
- Prerequisite (build during Phase 1, use now): all thresholds in one hot-reloadable config file,
  plus a debug overlay showing suppression state, per-category cooldown timers, and the
  would-have-spoken queue — a tuning session becomes "Aryan produces for 30 minutes, we watch the
  overlay and turn knobs," not "change constant, redeploy, guess."
- Schedule it like a feature with owned calendar time in the final week — not "if we have time."
  The judges' entire read of the product is whether it speaks at the right moments on stage.

---

# Appendix — cut list (do not reintroduce)

| Cut feature | Why (verified) |
|---|---|
| Agent writes notes/MIDI into session | `nexus.modify()` fully supports it — excluded by product decision, human stays in control |
| Highlighting inside the DAW canvas | No selection/cursor/highlight entity exists in the document schema |
| Real audio / mix analysis | NEXUS is symbolic only — notes, devices, routing; never audio |
| Sample-library search / recommendations | No documented sample catalog API |
| "Where exactly do I find it?" (Channel B) | Same missing catalog API |
| Transport-aware features (play/pause) | No documented transport entity — needs Nolan's spike before anything assumes an answer |
| Cross-session memory | No native ElevenLabs cross-session recall (their memory schemas are search primitives, not automatic recall); needs Mem0/Zep-style integration — post-hackathon |
