/**
 * HTTP bridge (issue #23).
 *
 * A thin layer over the agent service. It owns transport concerns only -
 * routing, JSON, status codes, and keeping the PAT on this side of the wire.
 * Every safety rule lives in service.ts and is tested there; what matters here
 * is that the bridge does not accidentally route around them.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AgentError, type AgentService } from "./service.js"
import { createBridge, type Bridge } from "./bridge.js"

const UUID = "00000000-0000-4000-8000-000000000000"
const PROJECT = `projects/${UUID}`

function stubService(overrides: Partial<AgentService> = {}): AgentService {
  return {
    analyze: vi.fn(async () => ({ tempoBpm: 128, shape: "arranged" }) as never),
    plan: vi.fn(async () => ({ planId: "add_808-33-48", summary: "…" }) as never),
    apply: vi.fn(async () => ({ action: { actionId: "a1" }, verification: { ok: true } }) as never),
    undo: vi.fn(async () => ({ actionId: "a1", removedEntityIds: ["x"] }) as never),
    getAction: vi.fn(async () => ({ actionId: "a1" }) as never),
    ...overrides,
  }
}

let bridge: Bridge
let base: string

async function start(service: AgentService): Promise<void> {
  bridge = createBridge({ service })
  const { port } = await bridge.listen(0)
  base = `http://127.0.0.1:${port}`
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return { status: res.status, body: await res.json().catch(() => undefined) }
}

beforeEach(() => {
  base = ""
})
afterEach(async () => {
  await bridge?.close()
})

describe("routing - the contract from the issue", () => {
  it("POST /api/projects/analyze returns the session report", async () => {
    const service = stubService()
    await start(service)

    const res = await post("/api/projects/analyze", { project: PROJECT })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ tempoBpm: 128 })
    expect(service.analyze).toHaveBeenCalledWith(PROJECT)
  })

  it("POST /api/producer/plan returns the plan", async () => {
    const service = stubService()
    await start(service)

    const res = await post("/api/producer/plan", { project: PROJECT, command: "add an 808" })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ planId: "add_808-33-48" })
    expect(service.plan).toHaveBeenCalledWith(PROJECT, "add an 808")
  })

  it("POST /api/producer/apply returns action status plus verification", async () => {
    const service = stubService()
    await start(service)

    const res = await post("/api/producer/apply", {
      project: PROJECT,
      command: "add an 808",
      planId: "add_808-33-48",
    })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ action: { actionId: "a1" }, verification: { ok: true } })
  })

  it("POST /api/producer/undo undoes the last action when no id is given", async () => {
    const service = stubService()
    await start(service)

    const res = await post("/api/producer/undo", { project: PROJECT })

    expect(res.status).toBe(200)
    expect(service.undo).toHaveBeenCalledWith(PROJECT, undefined)
  })

  it("GET /api/actions/:id returns the recorded action", async () => {
    const service = stubService()
    await start(service)

    const res = await fetch(`${base}/api/actions/a1`)

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ actionId: "a1" })
    expect(service.getAction).toHaveBeenCalledWith("a1")
  })

  it("GET /api/actions/:id is a 404 for an unknown id", async () => {
    const service = stubService({ getAction: vi.fn(async () => undefined) })
    await start(service)

    const res = await fetch(`${base}/api/actions/nope`)

    expect(res.status).toBe(404)
  })

  it("GET /api/agent/health reports readiness without touching a project", async () => {
    const service = stubService()
    await start(service)

    const res = await fetch(`${base}/api/agent/health`)

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: "ok" })
    expect(service.analyze).not.toHaveBeenCalled()
  })
})

describe("errors the UI can render", () => {
  it("maps an AgentError to its own status and code", async () => {
    const service = stubService({
      apply: vi.fn(async () => {
        throw new AgentError("needs_confirmation", "Which bar did you mean?", 409)
      }),
    })
    await start(service)

    const res = await post("/api/producer/apply", { project: PROJECT, command: "x", planId: "y" })

    expect(res.status).toBe(409)
    expect(res.body).toEqual({
      error: { code: "needs_confirmation", message: "Which bar did you mean?" },
    })
  })

  it("never leaks a stack trace or internal detail for an unexpected failure", async () => {
    const service = stubService({
      analyze: vi.fn(async () => {
        throw new Error("PAT at_pat_secret rejected by backend at /Users/nolmak/secret.ts")
      }),
    })
    await start(service)

    const res = await post("/api/projects/analyze", { project: PROJECT })

    expect(res.status).toBe(500)
    expect(JSON.stringify(res.body)).not.toMatch(/at_pat_|\/Users\/|\.ts/)
    expect(res.body).toMatchObject({ error: { code: "internal" } })
  })

  it("rejects a malformed JSON body with 400, not a crash", async () => {
    await start(stubService())

    const res = await fetch(`${base}/api/producer/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not json",
    })

    expect(res.status).toBe(400)
  })

  it("requires a command for plan and apply", async () => {
    await start(stubService())

    expect((await post("/api/producer/plan", { project: PROJECT })).status).toBe(400)
    expect((await post("/api/producer/apply", { project: PROJECT })).status).toBe(400)
  })

  it("returns 404 for an unknown route", async () => {
    await start(stubService())

    expect((await fetch(`${base}/api/nope`)).status).toBe(404)
  })

  it("returns 405 when a mutating verb is requested with GET", async () => {
    const service = stubService()
    await start(service)

    const res = await fetch(`${base}/api/producer/apply`)

    expect(res.status).toBe(405)
    expect(service.apply).not.toHaveBeenCalled()
  })

  it("caps the request body so a huge payload cannot exhaust memory", async () => {
    await start(stubService())

    const res = await fetch(`${base}/api/producer/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: PROJECT, command: "x".repeat(2_000_000) }),
    })

    expect(res.status).toBe(413)
  })
})

describe("the PAT stays server-side", () => {
  it("binds to loopback only, because this process holds a full-access token", async () => {
    await start(stubService())

    expect(bridge.address).toBe("127.0.0.1")
  })

  it("never includes credentials in any response", async () => {
    process.env.AUDIOTOOL_PAT = "at_pat_should_never_appear"
    const service = stubService()
    await start(service)

    const bodies = [
      JSON.stringify((await post("/api/projects/analyze", { project: PROJECT })).body),
      JSON.stringify((await post("/api/producer/plan", { project: PROJECT, command: "x" })).body),
      await (await fetch(`${base}/api/agent/health`)).text(),
    ]

    for (const body of bodies) expect(body).not.toMatch(/at_pat_/)
  })

  it("does not send permissive CORS headers - the UI reaches it via a proxy", async () => {
    await start(stubService())

    const res = await fetch(`${base}/api/agent/health`)

    expect(res.headers.get("access-control-allow-origin")).toBeNull()
  })
})
