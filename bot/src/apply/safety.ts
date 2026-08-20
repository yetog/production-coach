/**
 * Dry-run, verification and undo (issue #22).
 *
 * The safety envelope that makes it acceptable to point the agent at a live
 * project during a demo:
 *
 *  - `describeDryRun` takes a plan and nothing else. It cannot mutate because
 *    it never receives a document - that is a signature-level guarantee, not a
 *    promise in a comment.
 *  - `undoAction` removes exactly the entity ids the action log recorded, and
 *    tolerates ids that have already gone. It never consults the document for
 *    "things that look like the agent made them".
 *  - `verifyAction` reports which check failed, not a bare boolean.
 *
 * A note on the wedge, which corrects the acceptance criteria on #22: after a
 * failed apply the document is unusable - the throw never released the
 * transaction lock. Undo and verify therefore have to run against a FRESH
 * document from a new open(), not the one the failed apply left behind. Both
 * functions here take a document rather than opening one, so the caller (the
 * CLI) is what enforces that.
 */
import type { Plan, PlanAction } from "../plan/contract.js"
import { audioOutputSocket } from "../routing.js"
import type { ActionRecord } from "./action-log.js"

/** The document surface these need. Narrow, so tests stay cheap. */
interface WritableDocument {
  queryEntities: {
    getEntity: (id: string) => unknown
    ofTypes: (...types: string[]) => { get: () => unknown[] }
  }
  modify: <T>(fn: (t: RemoveTransaction) => T) => Promise<T>
}

interface RemoveTransaction {
  remove: (entityId: string) => unknown
}

export interface UndoResult {
  removedEntityIds: string[]
  /** Ids in the log that were already gone. Not an error - undo is idempotent. */
  missingEntityIds: string[]
}

export interface VerifyResult {
  ok: boolean
  checked: number
  failures: string[]
}

/**
 * Human-readable preview of what a plan would do. Pure by construction.
 */
export function describeDryRun(plan: Plan): string[] {
  if (plan.actions.length === 0) {
    return [
      plan.clarification ??
        "No changes: this plan has no actions, so nothing would be created or modified.",
    ]
  }
  return plan.actions.map(describeAction)
}

function describeAction(action: PlanAction): string {
  switch (action.type) {
    case "create_source":
      return `create a ${action.deviceType} named "${action.displayName}"${
        action.tone === undefined ? "" : ` with a ${action.tone} tone`
      }`
    case "route_to_mixer":
      return `route the ${action.deviceType} to a new mixer channel so it is audible`
    case "create_note_track":
      return `create a note track named "${action.displayName}"`
    case "create_note_region":
      return `create a ${action.durationBars}-bar region starting at bar ${action.startBar}`
    case "create_notes":
      return `place ${action.pattern} notes at pitch ${action.pitch} (velocity ${action.velocity})`
    case "create_melody_notes":
      return `place a ${action.pattern} melodic pattern with ${action.noteDuration} notes across ${action.pitches.length} scale tones (velocity ${action.velocity})`
    case "create_chord_notes":
      return `place ${action.chords.length} chords with ${action.voicing} voicing, ${action.chordsPerBar} per bar (velocity ${action.velocity})`
    case "create_drum_notes":
      return `place a ${action.patternName} drum pattern with ${action.hits.length} hits per bar`
    case "extend_region":
      return `extend the ${action.contentType} by ${action.additionalBars} more bars`
    case "copy_region":
      return `copy ${action.contentType} from bars ${action.sourceStartBar}-${action.sourceEndBar} to bar ${action.targetStartBar}`
  }
}

/**
 * Remove exactly what the action log says the agent created.
 *
 * Reverse creation order, because cables and regions point at the devices and
 * collections created before them; removing a target first can leave a
 * dangling reference and throw - which would wedge the document.
 */
export async function undoAction(
  doc: WritableDocument,
  record: ActionRecord,
): Promise<UndoResult> {
  const present: string[] = []
  const missing: string[] = []

  // Split BEFORE opening the transaction: a throw inside modify() is
  // unrecoverable, so nothing that can be checked outside it belongs inside.
  for (const id of record.createdEntityIds) {
    if (doc.queryEntities.getEntity(id) === undefined) missing.push(id)
    else present.push(id)
  }

  if (present.length > 0) {
    const inRemovalOrder = [...present].reverse()
    await doc.modify((t) => {
      for (const id of inRemovalOrder) t.remove(id)
    })
  }

  return { removedEntityIds: present, missingEntityIds: missing }
}

/**
 * Run the plan's declared verification checks against the document.
 *
 * Never throws for a failed check - a failure is a report, because the caller
 * needs to tell the difference between "the edit did not land" and "the run
 * itself broke".
 */
export async function verifyAction(
  doc: WritableDocument,
  record: ActionRecord,
  plan: Plan,
): Promise<VerifyResult> {
  const failures: string[] = []

  for (const check of plan.verification) {
    switch (check.kind) {
      case "entities_exist": {
        for (const id of record.createdEntityIds) {
          if (doc.queryEntities.getEntity(id) === undefined) {
            failures.push(`missing entity ${id} (${check.description})`)
          }
        }
        break
      }
      case "entity_count": {
        const found = record.createdEntityIds.filter((id) => {
          const entity = doc.queryEntities.getEntity(id) as { entityType?: string } | undefined
          return entity?.entityType === check.entityType
        }).length
        if (found < check.atLeast) {
          failures.push(
            `expected at least ${check.atLeast} ${check.entityType} entities from this action, found ${found}`,
          )
        }
        break
      }
      case "routed_to_mixer": {
        if (!isRouted(doc, record)) {
          failures.push(`not routed to the mixer (${check.description})`)
        }
        break
      }
    }
  }

  return { ok: failures.length === 0, checked: plan.verification.length, failures }
}

/**
 * True when at least one device this action created has a desktopAudioCable
 * leaving it. Only considers cables the action itself created, so a device
 * that happens to sit next to somebody else's routing does not count.
 */
function isRouted(doc: WritableDocument, record: ActionRecord): boolean {
  const created = new Set(record.createdEntityIds)

  const sources = record.createdEntityIds.filter((id) => {
    const entity = doc.queryEntities.getEntity(id) as { entityType?: string } | undefined
    return entity?.entityType !== undefined && audioOutputSocket(entity.entityType) !== undefined
  })
  if (sources.length === 0) return false

  for (const cable of doc.queryEntities.ofTypes("desktopAudioCable").get()) {
    const typed = cable as {
      id?: string
      fields?: { fromSocket?: { value?: { entityId?: string } } }
    }
    if (typed.id === undefined || !created.has(typed.id)) continue
    const from = typed.fields?.fromSocket?.value?.entityId
    if (from !== undefined && sources.includes(from)) return true
  }
  return false
}
