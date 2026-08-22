# Unified Dr. Zay Agent QA

Parent: #61

This checklist covers the unified path shared by the web app and Chrome
extension:

```text
client → Dr. Zay tool loop → typed producer tool
  → AgentService → loopback bridge → Nexus SDK
  → verification/action log → client event
```

## Security gates

- [ ] LLM/provider keys exist only in the chat service environment.
- [ ] `AUDIOTOOL_PAT` exists only in the loopback agent bridge.
- [ ] No browser or extension bundle contains a PAT or provider key.
- [ ] `apply` requires a current plan ID and explicit user confirmation.
- [ ] Approval state is server-side; the model cannot approve itself by adding a
      boolean to tool arguments.
- [ ] Tool arguments are schema-validated and bounded.
- [ ] Bridge error responses do not expose credentials, stacks, or file paths.
- [ ] Extension sessions are bound to the intended user/project before writes.

## Automated gates

```bash
npm test
npm run build
npm run lint
npm --prefix server test
npm --prefix bot run typecheck
```

The expected baseline is all tests passing, a successful frontend build, and
lint warnings limited to the existing warnings documented in CI output.

## Producer workflow

- [ ] `yoo` receives normal Dr. Zay coaching and does not hit the deterministic
      unknown-command response.
- [ ] `add a dark 808 at bar 33` returns a typed plan with the expected target.
- [ ] `add a beatbox 9` returns a typed device plan.
- [ ] `add an 808 under the drop` asks for clarification when no confident drop
      exists.
- [ ] No plan is applied before the user confirms it.
- [ ] Apply re-plans against current state and rejects a stale plan ID.
- [ ] Apply success includes verification and a recorded action ID.
- [ ] Apply refusal/error does not create an applied UI state or false success
      message.
- [ ] Undo removes only entities recorded for the selected action.

## Client parity

- [ ] Web chat and Command Center render the same plan/result/undo state.
- [ ] Chrome side panel uses the shared Dr. Zay client and does not duplicate
      planner or Nexus logic.
- [ ] Chrome global Ctrl/Command+Shift+Y PTT still reaches the app while the
      Audiotool tab is unfocused.
- [ ] Closing/reopening the side panel rehydrates pending plan and action state.
- [ ] Typed and voice input enter the same agent routing path.

## Live evidence

Record the date, project reference (never the PAT), provider/model, plan IDs,
action IDs, verification result, and undo result for each live run. Attach
screenshots or logs to #66 and link the evidence from #61.
