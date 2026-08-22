import { describe, expect, it, vi } from "vitest"
import { getActiveProjectContext, registerExtensionRouter, registerSidePanel } from "./sidepanel-core.js"

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

  it("extracts the active Audiotool project without exposing unrelated tab data", async () => {
    const chrome = {
      tabs: { query: (_query, callback) => callback([{ id: 7, url: "https://audiotool.com/studio?project=abc-123", title: "Studio" }]) },
    }
    await expect(getActiveProjectContext(chrome)).resolves.toEqual({
      tabId: 7,
      project: "abc-123",
    })
  })

  it("answers the side panel context request through the background worker", async () => {
    let listener
    const chrome = {
      runtime: { onMessage: { addListener: (callback) => { listener = callback } } },
      tabs: { query: (_query, callback) => callback([{ id: 9, url: "https://www.audiotool.com/studio?project=p9" }]) },
    }
    registerExtensionRouter(chrome)
    const sendResponse = vi.fn()
    expect(listener({ type: "drzay:get-context" }, {}, sendResponse)).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(sendResponse).toHaveBeenCalledWith({ tabId: 9, project: "p9" })
  })
})
