/**
 * Side-panel setup kept separate from the service-worker entry so it can be
 * tested without Chrome. The panel hosts the same Dr. Zay web client; it does
 * not contain provider credentials, the PAT, or a second producer planner.
 */
export async function registerSidePanel(chrome) {
  if (chrome.sidePanel?.setPanelBehavior === undefined) return
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
}
