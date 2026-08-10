# QA: producer agent

Issue #26. Two halves: an automated suite that runs in CI, and a live checklist
that cannot be automated because it needs a real Audiotool project and a pair
of eyes on the studio.

---

## The automated half

```bash
npm --prefix bot test          # 236 tests, includes the acceptance suite
```

`bot/src/acceptance/` runs full journeys — analyze → plan → apply → verify →
undo — through the **same entry point the CLI and the HTTP bridge use**, so a
regression in either front door shows up here.

It runs against **offline documents**: no token, no network, but real SDK
validation of every entity, field and socket name. That is why it can run in
CI on every PR, and why a wrong device name fails the build instead of a demo.

Known project states live in `bot/src/acceptance/fixtures.ts`:

| Fixture | Shape |
|---|---|
| `emptyProject()` | config + mixer furniture, nothing on the timeline |
| `loopProject()` | one 8-bar block, 3 voices — no density contrast |
| `arrangedProject()` | intro / build / **drop at bars 33-48** / outro |
| `buildProject({...})` | anything else, incl. `unroutedDevice`, `withoutMaster` |

Use these rather than hand-rolling a project in a new test — three files used
to build "an arranged project" slightly differently, which made failures hard
to compare.

### Negative cases covered automatically

The five raised on #22, plus three more:

1. apply with a plan id that does not exist → `plan_id_mismatch`
2. apply a plan with zero actions → `needs_confirmation`
3. undo twice in a row → `already_undone`
4. undo when the producer already deleted the entities by hand → reported as
   `missingEntityIds`, **not** an error — the desired end state is reached
5. undo with nothing recorded / unknown id → `no_actions` / `action_not_found`
6. apply with no plan id at all → `plan_id_required`
7. unusable project reference → `invalid_project`
8. a command the agent cannot carry out → `intent: "unknown"`, zero actions

Also asserted: applying twice creates two independent sets of entities; undo
removes only the named action; each verb opens its own document; and the action
log carries enough to undo from a different process.

---

## The live checklist

Needs a real project and the studio open beside you. **Nothing here is covered
by CI.**

### Setup

```bash
npm --prefix server start     # :3021  chat + tts
npm --prefix bot run bridge   # :3022  agent  (needs bot/.env with AUDIOTOOL_PAT)
npm run dev                   # :5173  UI
```

Make a throwaway project in the studio and put its URL in `bot/.env` as
`AUDIOTOOL_PROJECT_URL`. **Do not point this at anything you care about** — the
PAT has full account access and no read-only scope.

### Checks

| # | Do | Expect |
|---|---|---|
| 1 | Open the UI with the bridge **stopped** | "The agent is not running. Start it with `npm run bridge`" — not a blank panel |
| 2 | Start the bridge, reload | Session shows the project's real tempo and device count |
| 3 | `add a beatbox 9` → Preview | A plan naming the device; an Apply button appears |
| 4 | Apply | Device appears **in the studio**, wired to a mixer channel; result says verified |
| 5 | Play something through it | It is audible — routing is real, not just present |
| 6 | Undo | Device and cable disappear from the studio |
| 7 | `add a dark 808 under the drop` on an **empty** project | A question, **no Apply button** |
| 8 | Same command on an **arranged** project | Plan names the drop bars; Apply creates an audible 808 there |
| 9 | Undo it | Timeline back to how it started |
| 10 | Apply, then delete the agent's track by hand, then Undo | Reports what was already gone; does not error |
| 11 | Apply the same command twice, undo once | Only the undone action disappears; the other stays |
| 12 | Watch the studio while the agent works | Edits appear live, without a refresh |

### What "left as found" means

Every apply is undoable, so a QA pass should end with the project in its
starting state. If it does not, that is a bug worth filing with the `actionId`
— it is printed on apply and stored in `bot/.actions/`.

### Reporting a failure

Include the `actionId`, the command, and the JSON from
`GET /api/actions/<id>`. That names every entity the agent created, which is
what makes a failure reproducible rather than a story.

---

## Not covered by either half

- **Note-level latency** (#14) — needs someone editing in the studio while
  `npm --prefix bot run spike:live` runs. Still unmeasured.
- **Audio output.** Nothing here proves a device *sounds* right, only that it
  exists and is routed. Check 5 is the human substitute.
- **Voice** (#25) and the chat coach itself — this document is the producer
  agent only.
