# Production Coach bot

Headless, **read-only** NEXUS participant. Joins the producer's live Audiotool
session, streams normalized note/device/region/cable/automation events (PUSH),
and answers on-demand session snapshots (PULL). It never writes - see
`src/readonly.ts` for the runtime guard.

Built against `@audiotool/nexus` **0.0.17** (pinned exactly - the SDK is
pre-1.0 and marked "under heavy development").

## Layout

| File | Purpose |
|------|---------|
| `src/spike.ts` | Foundation spike, offline half - no auth needed (`npm run spike`) |
| `src/spike-live.ts` | Foundation spike, live half - needs `.env` (`npm run spike:live`) |
| `src/index.ts` | The bot: join live session, snapshot, stream events (`npm run dev`) |
| `src/events.ts` | PUSH pipeline: onCreate/onUpdate/onRemove -> normalized `CoachEvent`s |
| `src/query.ts` | PULL pipeline: `queryEntities` -> `SessionAnalysis` |
| `src/normalize.ts` | Entity -> `{pitch, timing, velocity, device}` normalization |
| `src/readonly.ts` | Runtime guard that makes `modify`/`createTransaction` throw |
| `src/devices.ts` | Device taxonomy over the 96 NEXUS entity types |
| `src/auth.ts` | PAT or exported-OAuth-token auth from `.env` |

## Quick start

```bash
npm install

# 1. Offline spike - proves the read pipeline with zero credentials:
npm run spike

# 2. Live: copy .env.example to .env, set AUDIOTOOL_PAT (from
#    developer.audiotool.com/personal-access-tokens) and AUDIOTOOL_PROJECT_URL,
#    open the same project in the studio, then:
npm run spike:live   # edit notes in the studio and watch them arrive here

# 3. The actual bot:
npm run dev
```

## Read-only rules

- Never call `nexus.modify()` or `createTransaction()` - the guard throws.
- The only write anywhere is `spike.ts` populating a throwaway **offline**
  in-memory document so the read pipeline has events to observe.
- Auth scope is `project:write` because NEXUS has no read-only scope;
  read-only is our discipline, not the platform's.
