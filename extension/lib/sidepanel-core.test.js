import { describe, expect, it, vi } from "vitest"
import { registerSidePanel } from "./sidepanel-core.js"

describe("side panel integration", () => {
  it("opens the Dr. Zay side panel when the extension action is clicked", async () => {
    const chrome = {
      sidePanel: { setPanelBehavior: vi.fn().mockResolvedValue(undefined) },
    }

    await registerSidePanel(chrome)

    expect(chrome.sidePanel.setPanelBehavior).toHaveBeenCalledWith({
      openPanelOnActionClick: true,
    })
  })

  it("is a no-op when an older Chrome lacks sidePanel", async () => {
    await expect(registerSidePanel({})).resolves.toBeUndefined()
  })
})
