# Dr. Zay Push-to-Talk (Chrome extension)

Global keyboard shortcut and side panel to talk to Dr. Zay while the Audiotool window has focus
— issue #55.

## Why an extension (and the one compromise)

A web page can only see keystrokes when its tab is focused, so it cannot capture
push-to-talk while you're working in the DAW. An extension can, via
`chrome.commands`. Two constraints come with that API, and this build accepts
both:

- **No bare "Y".** `chrome.commands` rejects unmodified keys, so the shortcut is
  **Ctrl+Shift+Y** (Command+Shift+Y on macOS). Rebind it at
  `chrome://extensions/shortcuts`.
- **Keydown only (no hold).** The API has no key-up event, so this is a
  **toggle**: press once to start the mic, press again to stop.

## How it works

```
Ctrl+Shift+Y
  -> background.js (service worker)         chrome.commands.onCommand
     -> finds Audiotool tabs                chrome.tabs.query
     -> sends a toggle message              chrome.tabs.sendMessage
        -> content.js (Audiotool page)      chrome.runtime.onMessage
           -> page event "drzay:ptt-toggle"

Side panel action
  -> background context router              active tab/project id only
     -> sidepanel.js                         embeds the shared Dr. Zay app
        -> app iframe                        same chat/tool/plan/apply path
```

The app side is already wired (`src/hooks/useExtensionPtt.ts`); with no extension
installed nothing dispatches the event and the app is unaffected.

## Load it (unpacked)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. **Load unpacked** → select this `extension/` folder.
4. Confirm the shortcut at `chrome://extensions/shortcuts` (default
   Ctrl+Shift+Y). Chrome will not let two extensions share a chord — rebind if
   it's taken.

The unpacked QA extension targets the local Vite Dr. Zay app at
`http://localhost:5174/production-coach/`. The hosted `zaylegend.com` app
currently sends `X-Frame-Options: SAMEORIGIN`, so it cannot be embedded in a
Chrome side panel until its frame policy is updated. A production package must
point `APP_URL` in `sidepanel.js` at a deployment that explicitly allows
framing from the extension origin.

The extension targets Audiotool plus the Dr. Zay app origins. It requests only
the `tabs` permission needed to read the active tab's project query parameter;
it never reads page content. To point it
at another origin, edit **both** `content_scripts.matches` and
`host_permissions` in `manifest.json` **and** `APP_URL_PATTERNS` in
`lib/background-core.js` (a test enforces they agree).

## Manual test (after loading)

1. Open the Dr. Zay app, enable **Dr. Zay Voice** in the sidebar (the shortcut is
   gated on voice being enabled and STT supported).
2. Click into the DAW / another window so the app tab is **not** focused.
3. Press **Ctrl+Shift+Y** → the avatar should switch to *Listening*.
4. Press it again → listening stops.
5. Grant the mic permission prompt on first use.

## Tests

Everything but the browser itself is covered, run from the repo root with
`npm test`:

- `lib/protocol.test.js` — the wire contract (command + event names).
- `lib/background-core.test.js` — command → find tabs → send message (fake `chrome`).
- `content.test.js` — runs the real `content.js`: message → window event.
- `manifest.test.js` — MV3, module worker, **modifier-chord** command, origins
  aligned with `APP_URL_PATTERNS`.
- `protocol.drift.test.js` — the event literal stays identical across
  `protocol.js`, `content.js` and the app's `ptt-bridge.ts`.
- `e2e.test.js` — background and content wired together end to end.
- `src/lib/ptt-bridge.test.ts` — the app's event name and toggle decision.

Only steps 1–5 above need a human and a browser; the wiring is verified in CI.
