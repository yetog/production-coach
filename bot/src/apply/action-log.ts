/**
 * Action log (issue #22).
 *
 * One JSON file per apply, under bot/.actions/ (gitignored - these contain
 * real project ids and the repo is public). Written before undo needs it, not
 * reconstructed afterwards.
 *
 * This is the boundary on how safe apply can be: undo removes exactly the
 * entity ids recorded here and nothing else, so an incomplete log means an
 * incomplete undo. Records are marked undone rather than deleted, because the
 * audit trail is the point.
 *
 * File-per-action rather than one append-only file: two applies racing cannot
 * corrupt each other, and a single unreadable record cannot take out the rest.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

export interface UpdatedField {
  entityId: string
  field: string
  /** Required for undo of an update - without it, the change is one-way. */
  previousValue: unknown
  newValue: unknown
}

export interface ActionRecordInput {
  project: string
  command: string
  planId: string
  createdEntityIds: string[]
  updatedFields: UpdatedField[]
}

export interface ActionRecord extends ActionRecordInput {
  actionId: string
  /** ISO 8601. */
  timestamp: string
  undoneAt?: string
}

/** Default location, relative to the bot package. Gitignored. */
export const DEFAULT_ACTIONS_DIR = ".actions"

export class ActionLog {
  constructor(private readonly dir: string = DEFAULT_ACTIONS_DIR) {}

  async record(input: ActionRecordInput): Promise<ActionRecord> {
    await mkdir(this.dir, { recursive: true })
    const record: ActionRecord = {
      ...input,
      actionId: newActionId(),
      timestamp: new Date().toISOString(),
    }
    await this.write(record)
    return record
  }

  async get(actionId: string): Promise<ActionRecord | undefined> {
    try {
      const raw = await readFile(this.pathFor(actionId), "utf8")
      return JSON.parse(raw) as ActionRecord
    } catch {
      // Missing or unreadable: the caller decides what to do about it, and a
      // corrupt record must not take down a run that could still undo others.
      return undefined
    }
  }

  /** Most recent action by timestamp, for `undo` with no explicit id. */
  async latest(): Promise<ActionRecord | undefined> {
    const all = await this.all()
    return all.at(-1)
  }

  /** Every readable record, oldest first. Unreadable files are skipped. */
  async all(): Promise<ActionRecord[]> {
    let names: string[]
    try {
      names = await readdir(this.dir)
    } catch {
      return []
    }
    const records: ActionRecord[] = []
    for (const name of names) {
      if (!name.endsWith(".json")) continue
      const record = await this.get(name.slice(0, -".json".length))
      if (record !== undefined) records.push(record)
    }
    // Sort by actionId, not timestamp: ids carry millisecond precision plus a
    // monotonic counter, so two applies in the same second still order
    // correctly. `undo` with no id depends on this being exact - getting it
    // wrong undoes somebody else's action.
    return records.sort((a, b) => a.actionId.localeCompare(b.actionId))
  }

  async markUndone(actionId: string): Promise<void> {
    const record = await this.get(actionId)
    if (record === undefined) return
    await this.write({ ...record, undoneAt: new Date().toISOString() })
  }

  private async write(record: ActionRecord): Promise<void> {
    await mkdir(this.dir, { recursive: true })
    // Indented on purpose: someone will read this by hand when a demo breaks.
    await writeFile(this.pathFor(record.actionId), `${JSON.stringify(record, null, 2)}\n`, "utf8")
  }

  private pathFor(actionId: string): string {
    return join(this.dir, `${actionId}.json`)
  }
}

/** Breaks ties when two applies land in the same millisecond. */
let sequence = 0

/**
 * Lexically sortable, collision-resistant, and deliberately carries no project
 * id - action ids get printed, pasted into chat and used as filenames.
 *
 * Millisecond precision plus a monotonic counter, because sorting these is how
 * `undo` decides which action was last. A second-resolution id would let two
 * applies in the same second come back in filesystem order instead of write
 * order, and undo the wrong one.
 */
function newActionId(): string {
  const stamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 18)
  const counter = (sequence += 1).toString(36).padStart(4, "0")
  const random = Math.random().toString(36).slice(2, 8)
  return `${stamp}-${counter}-${random}`
}
