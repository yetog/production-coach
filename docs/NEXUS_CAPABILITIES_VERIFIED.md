# NEXUS Capabilities - Verified

> Foundation spike results (issue #14). Everything below was verified against
> the **installed** `@audiotool/nexus@0.0.17` package (shipped `.d.ts` files)
> and a **running** spike (`bot/src/spike.ts`, offline document, 12/12 checks
> green), not against docs prose. Live-session verification is staged and
> pending credentials - see "Open questions" at the bottom.
>
> Last updated: 2026-07-20 · Spike: `cd bot && npm run spike`

---

## The headline answer

**Yes: `onCreate` fires for individual notes.** `"note"` is a first-class
entity type (one of 96). Creating 4 notes in one transaction produced 4
distinct `note-added` events, each carrying pitch, timing, and velocity, each
resolvable to the device that plays it. Field edits (`pitch`, `velocity`,
`positionTicks`, `durationTicks`) fire per-field `onUpdate` callbacks, and
note deletion fires the cleanup returned from the `onCreate` callback.

Local event dispatch latency measured **< 40ms** (max observed ~21-36ms across
runs, and that includes the transaction itself; events dispatch synchronously
during the modifying transaction). The ~150-300ms budget is therefore entirely
a network-sync question, answerable only against a live session.

---

## Verified API surface (v0.0.17, from shipped .d.ts)

### Connect (Node, headless bot)

```ts
import { createAudiotoolClient } from "@audiotool/nexus"
import { createNodeTransport, createDiskWasmLoader } from "@audiotool/nexus/node"

const client = await createAudiotoolClient({
  auth: process.env.AUDIOTOOL_PAT,          // PAT string works directly
  transport: createNodeTransport(),
  wasm: createDiskWasmLoader(),
})
const nexus = await client.open("https://beta.audiotool.com/studio?project=<id>")
// register ALL event listeners here - start() replays every existing entity
await nexus.start()
```

There is **no** `at.open(...)` on a bare import in 0.0.17: `audiotool(...)` is
the *browser* OAuth entry point (`audiotool({clientId, redirectUrl, scope})` ->
`AuthenticatedClient`). Headless code uses `createAudiotoolClient` as above.
`open()` accepts a studio URL, UUID, or `projects/<id>` name.

### Offline (no auth - what the spike uses)

```ts
import { createOfflineDocument } from "@audiotool/nexus/node" // wasm handled automatically
const doc = await createOfflineDocument()   // empty; no start()/stop(); discarded on exit
```

Offline docs start **completely empty** - not even a `config` entity (no
bpm/signature) until something creates one. Live projects always have one.

### Events (PUSH) - all verified firing in the spike

```ts
nexus.events.onCreate("note", (n) => { ...; return () => {/* fires on removal */} })
nexus.events.onCreate("*", (entity) => { ... })            // every entity type
nexus.events.onUpdate(note.fields.pitch, (v) => { ... }, false) // per-field
nexus.events.onRemove(entity, cb)
nexus.events.onPointingTo(location, cb)                    // pointer tracking
// all return { terminate(): void }
```

- Listener registration **must** happen before `await nexus.start()`: start()
  replays `onCreate` for every existing entity (verified in the .d.ts contract;
  the spike confirmed the inverse - late listeners on an offline doc get no
  replay).
- `onUpdate`'s third arg `initialTrigger` fires the callback immediately with
  the current value - pass `false` for edge-triggered behavior.

### Queries (PULL) - all verified in the spike

```ts
nexus.queryEntities.get()                                   // everything
nexus.queryEntities.ofTypes("heisenberg", "beatbox8").get()
nexus.queryEntities.ofTypes("note")
  .pointingTo.entities(region.fields.collection.value.entityId).get() // notes of a region
nexus.queryEntities.getEntity(uuid) / .mustGetEntityAs(uuid, "note")
nexus.queryEntities.ofTypes("noteRegion").pointedToBy...    // reverse pointers
```

Note the real reference-query API is `pointingTo.entities(...)` /
`.entityOfType(...)` / `.locations(...)` - the `pointedToBy.types(...)` form
floating around in older notes does not exist in 0.0.17.

---

## The readable set (all verified)

| Data | Where | Spike check |
|------|-------|-------------|
| Notes: MIDI pitch (60=C4), velocity 0-1, positionTicks, durationTicks, doesSlide | `note` entity fields | 4/4 note events with all fields |
| Which device plays a note | `note.collection` -> `noteRegion` -> `noteTrack.player` -> device | resolved `heisenberg` / "Lead Synth" |
| Device types + params (displayName, position, gain, envelopes, ...) | 50+ device entity types | device-added events + snapshot classification |
| Timeline regions (position/duration/loop, nested `region` struct) | `noteRegion`, `audioRegion`, `automationRegion`, `patternRegion` | region-added + bar-length math |
| Automation | `automationTrack` (automatedParameter -> any param location), `automationCollection`, `automationEvent` {positionTicks, value} | automation-added event |
| Cable routing | `desktopAudioCable`/`desktopNoteCable`/`mixerSideChainCable` {fromSocket, toSocket} - socket locations resolve to device ids | cable endpoints resolved to devices |
| Project config: BPM, time signature, base frequency, song length | `config` entity: tempoBpm, signatureNumerator/Denominator, baseFrequencyHz, durationTicks | bpm=128, signature=4/4 read back |
| Musical time | `Ticks` from `@audiotool/nexus/utils`: Beat=3840, SemiBreve=15360, SemiQuaver=960; `ticksToSeconds(ticks, bpm)` | used for beats/bars math |

### Confirmed NOT readable (absent from the 96-type schema)

- Audio waveforms / rendered audio (symbolic data only; `sample` entities +
  `client.samples.download()` exist but that's file access, not live audio)
- Play/pause & transport state - no such entity
- Selection / cursor / UI state - no such entity
- Sample catalog browsing/search - no catalog API in the SDK

Full 96-type list: see `bot/node_modules/@audiotool/nexus/dist/gen/audiotool/document/v1/utils/types.d.ts`
or `bot/src/devices.ts` for our device taxonomy over it.

---

## Auth facts (issue #2)

- `project:write` is the **only** scope. Read-only is our discipline
  (enforced at runtime by `bot/src/readonly.ts`, which makes `modify()` and
  `createTransaction()` throw), not the platform's.
- PAT: create at developer.audiotool.com/personal-access-tokens, pass directly
  as `auth:` (string) - full account access, keep out of git.
- Browser OAuth: `audiotool({clientId, redirectUrl: "http://127.0.0.1:5173/",
  scope: "project:write"})` - must be `127.0.0.1` (not `localhost`), trailing
  slash matters, app registered at developer.audiotool.com/applications.
  Tokens can be exported (`exportTokens()`) and used headless via
  `createServerAuth({accessToken, refreshToken, expiresAt, clientId})`.

## Toolchain gotcha (cost ~30 min, don't rediscover it)

The SDK's shipped `.d.ts` files use extensionless relative imports, which
`moduleResolution: "NodeNext"` refuses to resolve - every import appears to
have "no exported member". Use `module: "ESNext"` +
`moduleResolution: "bundler"` (see `bot/tsconfig.json`); the runtime JS is a
proper ESM bundle and runs fine under plain Node (verified: `node dist/spike.js`).

---

## Open questions - need a live session + PAT (the remaining #14 risk)

`bot/src/spike-live.ts` is ready to answer all four; it needs
`AUDIOTOOL_PAT` + `AUDIOTOOL_PROJECT_URL` in `bot/.env`, then `npm run
spike:live` while a producer edits the same project in the studio.

1. **Does a headless bot's `start()` complete against a real project, and do
   another participant's note edits arrive?** (The API contract says yes -
   this is exactly what "synced document" means - but it must be observed.)
2. **Real end-to-end latency** vs the ~150-300ms budget (arrival timestamps
   print per event; compare against the moment of the edit).
3. **Does the producer see the bot join?** (Watch the studio's participant
   UI while spike-live is connected. July 2026 changelog mentions an "online
   status" feature, so expect: probably yes.)
4. Initial-sync replay size/time on a real, dense project (spike-live prints
   both).
