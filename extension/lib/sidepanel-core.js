/**
 * Side-panel setup kept separate from the service-worker entry so it can be
 * tested without Chrome. The panel hosts the same Dr. Zay web client; it does
 * not contain provider credentials, the PAT, or a second producer planner.
 */
export async function registerSidePanel(chrome) {
  if (chrome.sidePanel?.setPanelBehavior === undefined) return
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
}

const AUDIO_TOOL_HOSTS = new Set(["audiotool.com", "www.audiotool.com"])

function projectFromUrl(value) {
  if (typeof value !== "string" || value === "") return undefined
  try {
    const url = new URL(value)
    if (!AUDIO_TOOL_HOSTS.has(url.hostname)) return undefined
    return url.searchParams.get("project") ?? undefined
  } catch {
    return undefined
  }
}

/** Return only the active tab id and project id; no title, URL, or page data crosses into the panel. */
export async function getActiveProjectContext(chrome) {
  const tabs = await new Promise((resolve) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, resolve)
  })
  const tab = tabs.find((candidate) => typeof candidate?.id === "number")
  return {
    tabId: tab?.id,
    project: projectFromUrl(tab?.url),
  }
}

/** Background-side contract shared by the side panel and future native UI. */
export function registerExtensionRouter(chrome) {
  if (chrome.runtime?.onMessage?.addListener === undefined) return
  // Chrome extension API methods are receiver-bound. Calling a detached
  // `addListener` produces `Illegal invocation` and prevents the MV3 worker
  // from registering at all (Chrome reports status code 15).
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "drzay:get-context") return undefined
    void getActiveProjectContext(chrome).then(sendResponse)
    return true
  })
}
