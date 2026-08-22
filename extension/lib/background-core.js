/**
 * Background worker logic for the push-to-talk extension (issue #55).
 *
 * Kept separate from `background.js` (the two-line service-worker entry) so it
 * can be unit-tested against a fake `chrome`. When the global command fires it
 * forwards a toggle message to every open Dr. Zay tab — which is what lets
 * push-to-talk work while the app window is unfocused or minimised.
 */
import { messageForCommand } from "./protocol.js"

/**
 * Where the Dr. Zay app runs. Must stay in sync with the manifest's
 * host_permissions and content_scripts matches (enforced by a drift test).
 */
export const APP_URL_PATTERNS = [
  "https://zaylegend.com/*",
  "http://localhost/*",
  "http://127.0.0.1/*",
  "https://audiotool.com/*",
  "https://www.audiotool.com/*",
]

export function registerCommandHandler(chrome) {
  chrome.commands.onCommand.addListener((command) => {
    const message = messageForCommand(command)
    if (message === null) return

    chrome.tabs.query({ url: APP_URL_PATTERNS }, (tabs) => {
      for (const tab of tabs) {
        if (typeof tab.id === "number") {
          chrome.tabs.sendMessage(tab.id, message)
        }
      }
    })
  })
}
