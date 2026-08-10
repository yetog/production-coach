/**
 * Typed client for the agent bridge (issue #23).
 *
 * The frontend must never talk to Nexus directly, and must never see the PAT.
 * This is the only thing in src/ that knows the bridge exists.
 *
 * What matters in these tests is error handling: the bridge returns structured
 * {error:{code,message}} bodies, and the UI needs the message rather than
 * "Request failed with status 409".
 */
import { afterEach, describe, expect, it, vi } from "vitest"
import { AgentApiError, createAgentClient } from "./agent-client.js"

const UUID = "00000000-0000-4000-8000-000000000000"

function withFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  const spy = vi.fn(impl)
  vi.stubGlobal("fetch", spy)
  return spy
}

function json(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("createAgentClient", () => {
  it("posts analyze to the documented path with the project", async () => {
    const spy = withFetch(() => json({ tempoBpm: 128, shape: "arranged" }))
    const agent = createAgentClient("/production-coach/api")

    const report = await agent.analyze(`projects/${UUID}`)

    expect(report.tempoBpm).toBe(128)
    const [url, init] = spy.mock.calls[0]!
    expect(url).toBe("/production-coach/api/projects/analyze")
    expect(init?.method).toBe("POST")
    expect(JSON.parse(String(init?.body))).toEqual({ project: `projects/${UUID}` })
  })

  it("posts plan and apply with the fields the bridge expects", async () => {
    const spy = withFetch(() => json({ planId: "add_808-33-48" }))
    const agent = createAgentClient("/api")

    await agent.plan("p", "add an 808")
    await agent.apply("p", "add an 808", "add_808-33-48")

    expect(JSON.parse(String(spy.mock.calls[0]![1]?.body))).toEqual({
      project: "p",
      command: "add an 808",
    })
    expect(JSON.parse(String(spy.mock.calls[1]![1]?.body))).toEqual({
      project: "p",
      command: "add an 808",
      planId: "add_808-33-48",
    })
  })

  it("omits actionId from undo when none is given, so the bridge uses the latest", async () => {
    const spy = withFetch(() => json({ actionId: "a1", removedEntityIds: [] }))
    const agent = createAgentClient("/api")

    await agent.undo("p")

    expect(JSON.parse(String(spy.mock.calls[0]![1]?.body))).toEqual({ project: "p" })
  })

  it("surfaces the bridge's own message, not a generic status string", async () => {
    withFetch(() =>
      json({ error: { code: "needs_confirmation", message: "Which bar did you mean?" } }, 409),
    )
    const agent = createAgentClient("/api")

    const error = await agent.apply("p", "x", "y").catch((e: unknown) => e)

    expect(error).toBeInstanceOf(AgentApiError)
    expect((error as AgentApiError).code).toBe("needs_confirmation")
    expect((error as AgentApiError).message).toBe("Which bar did you mean?")
    expect((error as AgentApiError).status).toBe(409)
  })

  it("still produces a readable error when the body is not the expected shape", async () => {
    withFetch(() => Promise.resolve(new Response("<html>502 Bad Gateway</html>", { status: 502 })))
    const agent = createAgentClient("/api")

    const error = (await agent.analyze("p").catch((e: unknown) => e)) as AgentApiError

    expect(error).toBeInstanceOf(AgentApiError)
    expect(error.status).toBe(502)
    expect(error.message).toMatch(/502|agent/i)
    expect(error.message).not.toContain("<html>")
  })

  it("reports a readable error when the bridge is not running at all", async () => {
    withFetch(() => Promise.reject(new TypeError("Failed to fetch")))
    const agent = createAgentClient("/api")

    const error = (await agent.analyze("p").catch((e: unknown) => e)) as AgentApiError

    expect(error).toBeInstanceOf(AgentApiError)
    expect(error.code).toBe("unreachable")
    expect(error.message).toMatch(/not running|unreachable|npm run bridge/i)
  })

  it("reports health without throwing when the bridge is down", async () => {
    withFetch(() => Promise.reject(new TypeError("Failed to fetch")))
    const agent = createAgentClient("/api")

    expect(await agent.health()).toEqual({ ok: false })
  })

  it("reports health as ok when the bridge answers", async () => {
    withFetch(() => json({ status: "ok" }))
    const agent = createAgentClient("/api")

    expect(await agent.health()).toEqual({ ok: true })
  })
})
