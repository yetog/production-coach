# Agent Bridge API

Local HTTP surface for the producer agent (issue #23). Lets the frontend run
`analyze / plan / apply / undo` against a real Audiotool project without ever
importing the NEXUS SDK or seeing a credential.

```
npm --prefix bot run bridge      # http://127.0.0.1:3022
```

---

## Why it exists

`bot/` can already open a project, analyze it, plan an edit, apply it and undo
it — but only from a terminal. The frontend needed the same thing over HTTP.

The important property is that **the safety rules are not reimplemented here.**
Both the CLI and this bridge call `bot/src/agent/service.ts`. If the bridge had
its own copy of the plan-id check or the confirmation gate, the two would
drift, and the safer path would be whichever one nobody happened to be demoing.

```
       CLI  ─┐
              ├─→  agent/service.ts  ─→  analyzer / planner / executor / action log
    bridge  ─┘        (all safety rules live here)
```

## Security posture

- **The PAT never leaves this process.** `AUDIOTOOL_PAT` grants full account
  access and has no read-only scope, so the browser must never hold it.
- **Binds `127.0.0.1` only.** Not reachable off the machine.
- **No CORS headers.** The UI reaches it same-origin through the Vite dev
  proxy. Permissive CORS would make a full-access token reachable from any page
  the browser happened to load.
- **Errors never echo internals.** Unexpected failures return a generic message;
  file paths, upstream detail and anything token-shaped stay in the server log.
- **Request bodies are capped** at 1 MB.

This is a *local* bridge, as the issue scopes it. Exposing it publicly would
need auth and a rethink of all of the above.

---

## Endpoints

All request and response bodies are JSON. `project` accepts a studio URL
(`https://www.audiotool.com/studio?project=<uuid>`), a `projects/<uuid>` name,
or a bare UUID. Omit it to use `AUDIOTOOL_PROJECT_URL` from `bot/.env`.

### `GET /api/agent/health`

Readiness. Touches no project.

```json
{ "status": "ok", "service": "production-coach-agent" }
```

### `POST /api/projects/analyze`

Read-only. Returns the session report.

```jsonc
// → { "project": "projects/<uuid>" }
{
  "tempoBpm": 128,
  "signature": "4/4",
  "lengthBars": 64,
  "shape": "arranged",              // "empty" | "loop" | "arranged"
  "inventory": { "drums": 1, "bass": 0, "synths": 2, ... },
  "sections": [
    { "label": "drop", "startBar": 33, "endBar": 48, "confidence": 0.81, "density": 6 }
  ],
  "drop": { "label": "drop", "startBar": 33, "endBar": 48, "confidence": 0.81 },
  "risks": ["unrouted device: Heisenberg"],
  "clarification": "…"              // present when the agent wants to ask first
}
```

### `POST /api/producer/plan`

Read-only. Returns a plan to show the user **before** applying.

```jsonc
// → { "project": "…", "command": "add a dark 808 under the drop" }
{
  "planId": "add_808-33-48",
  "interpretedIntent": "Add a dark 808 bassline under the drop (bars 33-48)",
  "target": { "section": "drop", "startBar": 33, "endBar": 48, "confidence": 0.81 },
  "actions": [ /* create_source, route_to_mixer, create_note_region, … */ ],
  "summary": "I will add a dark 808 bassline across bars 33-48 …",
  "safety": "creates_only",
  "requiresConfirmation": false,
  "clarification": "…"              // present when requiresConfirmation is true
}
```

**Render `summary` and `interpretedIntent`, not `actions`** — the actions are
for the executor.

When `requiresConfirmation` is `true` the plan carries **zero actions**, so
there is nothing to apply even by mistake. Show `clarification` and ask.

### `POST /api/producer/apply`

The only mutating endpoint. Requires `planId`.

```jsonc
// → { "project": "…", "command": "…", "planId": "add_808-33-48" }
{
  "action": {
    "actionId": "20260810T031613974-0001-1k63l9",
    "createdEntityIds": ["…"],
    "timestamp": "2026-08-10T03:16:13.974Z"
  },
  "verification": { "ok": true, "checked": 3, "failures": [] },
  "plan": { /* the plan that was applied */ },
  "summary": "Created a bassline (\"Agent 808\") routed to a new mixer channel…"
}
```

Apply **re-plans first** and compares ids, so a plan the user looked at five
minutes ago cannot be applied against a project that has since changed.

### `POST /api/producer/undo`

Removes only what the named action created. Omit `actionId` for the most recent.

```jsonc
// → { "project": "…", "actionId": "…" }   // actionId optional
{
  "actionId": "20260810T031613974-0001-1k63l9",
  "removedEntityIds": ["…"],
  "missingEntityIds": [],           // already gone; not an error
  "summary": "Removed 22 entities created by …"
}
```

### `GET /api/actions/:id`

The recorded action, or `404`.

---

## Errors

Every failure is `{ "error": { "code": "…", "message": "…" } }`. The `message`
is written for a human and can be rendered directly.

| Code | Status | Meaning |
|---|---|---|
| `invalid_project` | 400 | Project reference unusable; message says what was expected |
| `bad_request` | 400 | Missing or wrong-typed field |
| `payload_too_large` | 413 | Body over 1 MB |
| `plan_id_required` | 400 | `apply` without a `planId`; message names the current one |
| `plan_id_mismatch` | 409 | The project changed — re-plan and show the user again |
| `needs_confirmation` | 409 | Plan is unresolved; message is the question to ask |
| `no_actions` | 404 | Nothing recorded to undo |
| `action_not_found` | 404 | Unknown action id |
| `already_undone` | 409 | That action was already undone |
| `timeout` | 504 | Operation exceeded its deadline; nothing further was applied |
| `internal` | 500 | Unexpected — check the bridge log |
| `unreachable` | — | Client-side only: the bridge process is not running |

---

## Wiring

The Vite dev proxy routes agent paths to the bridge and everything else under
`/api` to Dr. Zay's chat server:

| Path | Target |
|---|---|
| `…/api/projects/*`, `…/api/producer/*`, `…/api/actions/*`, `…/api/agent/*` | bridge, `:3022` |
| `…/api/chat`, `…/api/tts`, `…/api/health` | chat server, `:3021` |

Order matters — the agent prefixes are registered first, because Vite takes the
first matching key and the `…/api` catch-all would otherwise swallow them.

Override targets with `VITE_DEV_AGENT_TARGET` / `VITE_DEV_API_TARGET`; override
the bridge port with `AGENT_BRIDGE_PORT`.

From the frontend, use `src/lib/agent-client.ts` rather than calling `fetch`
directly — it is the only module in `src/` that knows the bridge exists.

## Running the whole stack

```bash
npm --prefix server start     # :3021  chat + tts
npm --prefix bot run bridge   # :3022  agent (needs bot/.env with AUDIOTOOL_PAT)
npm run dev                   # :5173  UI
```

## Container deployment

The root `docker-compose.yml` starts the same three boundaries as local
development: `web` (Nginx SPA), `chat` (Dr. Zay + TTS), and `agent` (the
PAT-bearing Nexus bridge). The agent is reachable only on the compose network;
its port is not published to the host.

```bash
export AUDIOTOOL_PAT=... AUDIOTOOL_PROJECT_URL=...
export OPENAI_API_KEY=... # or IONOS_API_KEY=...
docker compose up --build
```

Open `http://localhost:5173/production-coach/`. The bridge defaults to
loopback outside containers; Compose explicitly uses `AGENT_BRIDGE_HOST=0.0.0.0`
only for the private container network. Never publish port 3022 or put the PAT
in the web/chat service environment.
