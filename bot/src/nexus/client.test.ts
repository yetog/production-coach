/**
 * Document lifecycle (issue #18).
 *
 * The two rules these tests exist to enforce, both from footguns that cost the
 * team real time:
 *  - stop() must run on every path, including when the body throws.
 *  - stop() must be time-boxed, because a document whose transaction threw is
 *    wedged and its stop() never returns. Awaiting it unbounded turns a failed
 *    apply into a hung CLI, which is the exact ambiguity #22 needs to avoid.
 */
import { describe, expect, it, vi } from "vitest"
import { openSession, withProject } from "./client.js"

/** Zeroed uuid: this repo is public, real project ids must not land in it. */
const UUID = "00000000-0000-4000-8000-000000000000"
const REF = `projects/${UUID}`

/** Minimal stand-in for a SyncedDocument; `stop` behaviour is the variable. */
function fakeDoc(options: { stopHangs?: boolean } = {}) {
  const calls = { start: 0, stop: 0 }
  return {
    calls,
    doc: {
      start: async () => {
        calls.start += 1
      },
      stop: async () => {
        calls.stop += 1
        if (options.stopHangs === true) await new Promise(() => undefined)
      },
      dawUrl: "https://www.audiotool.com/studio?project=stub",
      queryEntities: {} as never,
      events: {} as never,
      connected: {} as never,
    },
  }
}

function fakeClient(doc: unknown) {
  return { open: vi.fn(async () => doc as never) }
}

describe("withProject", () => {
  it("opens, starts, runs the body, and stops", async () => {
    const { doc, calls } = fakeDoc()
    const client = fakeClient(doc)

    const result = await withProject(client, REF, async () => "done")

    expect(result).toBe("done")
    expect(client.open).toHaveBeenCalledWith(REF)
    expect(calls.start).toBe(1)
    expect(calls.stop).toBe(1)
  })

  it("stops the document even when the body throws", async () => {
    const { doc, calls } = fakeDoc()

    await expect(
      withProject(fakeClient(doc), REF, async () => {
        throw new Error("body failed")
      }),
    ).rejects.toThrow("body failed")

    expect(calls.stop).toBe(1)
  })

  it("surfaces the body's error, not a failure from stop()", async () => {
    const doc = {
      start: async () => undefined,
      stop: async () => {
        throw new Error("stop exploded")
      },
    }

    await expect(
      withProject(fakeClient(doc), REF, async () => {
        throw new Error("body failed")
      }),
    ).rejects.toThrow("body failed")
  })

  it("does not hang when stop() never returns on a wedged document", async () => {
    const { doc } = fakeDoc({ stopHangs: true })

    const started = Date.now()
    const result = await withProject(
      fakeClient(doc),
      REF,
      async () => "done",
      { stopTimeoutMs: 100 },
    )

    expect(result).toBe("done")
    expect(Date.now() - started).toBeLessThan(3000)
  })

  it("normalizes the project reference before opening", async () => {
    const { doc } = fakeDoc()
    const client = fakeClient(doc)

    await withProject(client, UUID, async () => undefined)

    expect(client.open).toHaveBeenCalledWith(REF)
  })

  it("never calls the body when the project reference is unusable", async () => {
    const { doc } = fakeDoc()
    const client = fakeClient(doc)
    const body = vi.fn()

    await expect(withProject(client, "<PROJECT_ID>", body)).rejects.toThrow(/placeholder/i)

    expect(client.open).not.toHaveBeenCalled()
    expect(body).not.toHaveBeenCalled()
  })
})

describe("openSession", () => {
  it("keeps the document open until stop() is called", async () => {
    const { doc, calls } = fakeDoc()

    const session = await openSession(fakeClient(doc), REF)

    expect(calls.start).toBe(1)
    expect(calls.stop).toBe(0)
    expect(session.doc).toBe(doc)

    await session.stop()
    expect(calls.stop).toBe(1)
  })

  it("is idempotent, so a SIGINT handler racing a timer cannot double-stop", async () => {
    const { doc, calls } = fakeDoc()
    const session = await openSession(fakeClient(doc), REF)

    await Promise.all([session.stop(), session.stop(), session.stop()])

    expect(calls.stop).toBe(1)
  })

  it("time-boxes stop() so a wedged session cannot hang shutdown", async () => {
    const { doc } = fakeDoc({ stopHangs: true })
    const session = await openSession(fakeClient(doc), REF, { stopTimeoutMs: 100 })

    const started = Date.now()
    await session.stop()

    expect(Date.now() - started).toBeLessThan(3000)
  })

  it("stops the document if start() fails, so a half-open document is not leaked", async () => {
    const calls = { stop: 0 }
    const doc = {
      start: async () => {
        throw new Error("network down")
      },
      stop: async () => {
        calls.stop += 1
      },
    }

    await expect(openSession(fakeClient(doc), REF)).rejects.toThrow("network down")
    expect(calls.stop).toBe(1)
  })
})
