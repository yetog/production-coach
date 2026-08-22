import { describe, expect, it, vi } from "vitest"
import { createAgentBridgeClient } from "./agent-bridge-client.js"

describe("agent bridge client", () => {
  it("calls the read-only analyze endpoint with the project", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ tempoBpm: 128 }), { status: 200 }))
    const client = createAgentBridgeClient({ baseUrl: "http://bridge/api", fetch })

    await expect(client.analyze("projects/p1")).resolves.toEqual({ tempoBpm: 128 })
    expect(fetch).toHaveBeenCalledWith("http://bridge/api/projects/analyze", expect.objectContaining({ method: "POST" }))
  })

  it("preserves structured bridge errors", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: { code: "plan_id_mismatch", message: "Review the new plan." } }),
      { status: 409 },
    ))
    const client = createAgentBridgeClient({ baseUrl: "http://bridge/api", fetch })

    await expect(client.apply("projects/p1", "add a dark 808 at bar 33", "old"))
      .rejects.toMatchObject({ code: "plan_id_mismatch", status: 409 })
  })

  it("does not send an undefined project field", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }))
    const client = createAgentBridgeClient({ baseUrl: "http://bridge/api", fetch })

    await client.undo(undefined)
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({})
  })
})
