/**
 * Action log (issue #22).
 *
 * The log is what makes undo possible, so it is written to disk before it is
 * needed rather than reconstructed after the fact. Its correctness bounds how
 * safe apply can ever be: undo removes exactly what the log says the agent
 * created, and nothing else.
 *
 * Logs contain real project ids, so they live in bot/.actions/ which is
 * gitignored. These tests write to a temp directory instead.
 */
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { ActionLog } from "./action-log.js"

const UUID = "00000000-0000-4000-8000-000000000000"
let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "pc-actions-"))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

function entry() {
  return {
    project: `projects/${UUID}`,
    command: "add a dark 808 under the drop",
    planId: "add_808-33-48",
    createdEntityIds: ["entity-1", "entity-2"],
    updatedFields: [],
  }
}

describe("ActionLog", () => {
  it("records what an apply created and returns a retrievable id", async () => {
    const log = new ActionLog(dir)

    const record = await log.record(entry())

    expect(record.actionId).toMatch(/\S/)
    expect(record.createdEntityIds).toEqual(["entity-1", "entity-2"])
    expect(await log.get(record.actionId)).toEqual(record)
  })

  it("persists to disk so undo works from a different process", async () => {
    const written = await new ActionLog(dir).record(entry())

    // A fresh instance: no shared in-memory state.
    const reloaded = await new ActionLog(dir).get(written.actionId)

    expect(reloaded).toEqual(written)
  })

  it("stamps every record with a timestamp and the project it touched", async () => {
    const record = await new ActionLog(dir).record(entry())

    expect(record.project).toBe(`projects/${UUID}`)
    expect(Number.isNaN(Date.parse(record.timestamp))).toBe(false)
  })

  it("returns the most recent action for `undo` with no id", async () => {
    const log = new ActionLog(dir)
    await log.record({ ...entry(), planId: "first" })
    const second = await log.record({ ...entry(), planId: "second" })

    expect((await log.latest())?.actionId).toBe(second.actionId)
  })

  it("gives distinct ids to two applies of the same plan", async () => {
    const log = new ActionLog(dir)

    const a = await log.record(entry())
    const b = await log.record(entry())

    expect(a.actionId).not.toBe(b.actionId)
  })

  it("records the previous value when a field is updated, so undo can restore it", async () => {
    const log = new ActionLog(dir)

    const record = await log.record({
      ...entry(),
      updatedFields: [
        { entityId: "entity-9", field: "tempoBpm", previousValue: 120, newValue: 128 },
      ],
    })

    expect(record.updatedFields[0]!.previousValue).toBe(120)
  })

  it("marks an action undone rather than deleting it, keeping the audit trail", async () => {
    const log = new ActionLog(dir)
    const record = await log.record(entry())

    await log.markUndone(record.actionId)

    const after = await log.get(record.actionId)
    expect(after?.undoneAt).toBeDefined()
    expect(await log.get(record.actionId)).not.toBeUndefined()
  })

  it("returns undefined for an unknown action id instead of throwing", async () => {
    expect(await new ActionLog(dir).get("nope")).toBeUndefined()
    expect(await new ActionLog(dir).latest()).toBeUndefined()
  })

  it("never lets a project id reach the log filename", async () => {
    const record = await new ActionLog(dir).record(entry())

    expect(record.actionId).not.toContain(UUID)
  })

  it("survives a corrupt file on disk without taking down the run", async () => {
    const log = new ActionLog(dir)
    const record = await log.record(entry())
    const { writeFile } = await import("node:fs/promises")
    await writeFile(join(dir, `${record.actionId}.json`), "{ not json", "utf8")

    expect(await log.get(record.actionId)).toBeUndefined()
    await expect(log.latest()).resolves.not.toThrow()
  })

  it("writes json a human can read when something goes wrong at 2am", async () => {
    const log = new ActionLog(dir)
    const record = await log.record(entry())

    const raw = await readFile(join(dir, `${record.actionId}.json`), "utf8")
    expect(raw).toContain("\n")
    expect(JSON.parse(raw)).toEqual(record)
  })
})
