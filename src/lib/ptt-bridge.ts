/**
 * App side of the push-to-talk extension bridge (issue #55).
 *
 * The extension can't hold a bare "Y" while the DAW has focus, so it sends a
 * single "toggle" via a window event. This module owns the contract (the event
 * name) and the toggle decision; useExtensionPtt wires the actual DOM listener.
 *
 * PTT_EVENT MUST match protocol.js / content.js in extension/ — a drift test
 * (extension/protocol.drift.test.js) enforces it.
 */

/** The window event the extension's content script dispatches on this page. */
export const PTT_EVENT = "drzay:ptt-toggle"

/** Toggle semantics: each command press flips the mic. */
export function togglePtt(isListening: boolean): "start" | "stop" {
  return isListening ? "stop" : "start"
}
