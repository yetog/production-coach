/**
 * The wire contract between the extension and the Dr. Zay web app (issue #55).
 *
 * Pure and side-effect free on purpose: it is imported by the background worker,
 * by the app-side listener's drift test, and by unit tests, none of which have a
 * `chrome` global. The content script (a classic script that cannot import ES
 * modules) inlines PTT_EVENT instead; a drift test keeps that copy honest.
 */

/** The command id the manifest binds to Ctrl+Shift+Y. */
export const COMMAND = "toggle-ptt"

/** The window event the content script dispatches and the app listens for. */
export const PTT_EVENT = "drzay:ptt-toggle"

/**
 * The runtime message the background worker sends to the app tab for a command,
 * or null if the command is not ours (so unrelated commands are ignored).
 */
export function messageForCommand(command) {
  return command === COMMAND ? { type: PTT_EVENT } : null
}

/** Whether a received runtime message is our toggle message. */
export function isToggleMessage(message) {
  return (
    typeof message === "object" &&
    message !== null &&
    message.type === PTT_EVENT
  )
}
