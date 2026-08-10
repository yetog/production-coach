/**
 * The four producer verbs, as callable functions (issue #23).
 *
 * Extracted from the CLI so that the CLI and the HTTP bridge share ONE copy of
 * the safety rules. If the bridge reimplemented the plan-id check or the
 * confirmation gate, the two would drift, and the safer path would be
 * whichever one nobody happened to be demoing.
 *
 * Rules enforced here, all inherited from #18/#22:
 *  - analyze and plan never mutate; they run behind the read-only proxy.
 *  - apply refuses without an explicit plan id, and re-plans first so the id
 *    is checked against a CURRENT read rather than a stale one.
 *  - apply refuses any plan that still needs confirmation.
 *  - every verb gets its own document. A failed apply wedges the document it
 *    used, so verification and undo must run against fresh opens.
 *  - apply is time-boxed, because a wedge is otherwise indistinguishable from
 *    slowness.
 *
 * Failures are AgentError, which carries a code and an HTTP status so the
 * bridge can render them without string-matching messages.
 */
import { analyzeSessionReport, type SessionReport } from "../analyze/analyzer.js"
import { ActionLog, type ActionRecord } from "../apply/action-log.js"
import { executePlan } from "../apply/executor.js"
import { undoAction, verifyAction, type UndoResult, type VerifyResult } from "../apply/safety.js"
import { withProject, type DocumentOpener } from "../nexus/client.js"
import { normalizeProjectRef } from "../nexus/project-ref.js"
import type { Plan } from "../plan/contract.js"
import { planCommand } from "../plan/planner.js"
import { asReadonly } from "../readonly.js"

/** An apply that hangs is indistinguishable from one that failed. */
const APPLY_TIMEOUT_MS = 60_000

export type AgentErrorCode =
  | "invalid_project"
  | "plan_id_required"
  | "plan_id_mismatch"
  | "needs_confirmation"
  | "no_actions"
  | "action_not_found"
  | "already_undone"
  | "timeout"

/** A failure the UI can render: stable code, human message, HTTP status. */
export class AgentError extends Error {
  constructor(
    readonly code: AgentErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "AgentError"
  }

  /** Deliberately omits the stack: this is sent to a browser. */
  toJSON(): { error: { code: AgentErrorCode; message: string } } {
    return { error: { code: this.code, message: this.message } }
  }
}

export interface ApplyOutcome {
  action: ActionRecord
  verification: VerifyResult
  plan: Plan
  summary: string
}

export interface UndoOutcome extends UndoResult {
  actionId: string
  summary: string
}

export interface AgentService {
  analyze: (project: string | undefined) => Promise<SessionReport>
  plan: (project: string | undefined, command: string) => Promise<Plan>
  apply: (
    project: string | undefined,
    command: string,
    planId: string | undefined,
  ) => Promise<ApplyOutcome>
  undo: (project: string | undefined, actionId?: string) => Promise<UndoOutcome>
  getAction: (actionId: string) => Promise<ActionRecord | undefined>
}

export function createAgentService(deps: {
  client: DocumentOpener
  log?: ActionLog
  /**
   * Used when a caller supplies no project. Both front doors need this: the
   * CLI omits --project, and the bridge omits the `project` field. Resolving
   * it here rather than in each caller is what keeps them consistent.
   */
  defaultProject?: string
}): AgentService {
  const { client } = deps
  const log = deps.log ?? new ActionLog()
  const defaultProject = deps.defaultProject ?? process.env.AUDIOTOOL_PROJECT_URL

  /** Validate the reference before anything opens a connection. */
  const ref = (project: string | undefined): string => {
    try {
      return normalizeProjectRef(
        project === undefined || project.trim() === "" ? defaultProject : project,
      )
    } catch (error) {
      throw new AgentError(
        "invalid_project",
        error instanceof Error ? error.message : String(error),
        400,
      )
    }
  }

  const readReport = async (name: string): Promise<SessionReport> =>
    await withProject(client, name, async (doc) => analyzeSessionReport(asReadonly(doc as never)))

  return {
    async analyze(project) {
      return await readReport(ref(project))
    },

    async plan(project, command) {
      const name = ref(project)
      return planCommand(command, await readReport(name))
    },

    async apply(project, command, planId) {
      const name = ref(project)

      // Re-plan against a current read, so the id is validated against the
      // project as it is now rather than as it was when the user last looked.
      const plan = planCommand(command, await readReport(name))

      if (planId === undefined || planId === "") {
        throw new AgentError(
          "plan_id_required",
          `Applying requires an explicit plan id. This command currently plans as "${plan.planId}" - review the plan, then apply it by id.`,
          400,
        )
      }
      if (planId !== plan.planId) {
        throw new AgentError(
          "plan_id_mismatch",
          `Plan id "${planId}" no longer matches: this command now plans as "${plan.planId}". The project changed - review the new plan before applying.`,
          409,
        )
      }
      if (plan.requiresConfirmation) {
        throw new AgentError(
          "needs_confirmation",
          plan.clarification ?? plan.summary,
          409,
        )
      }

      const result = await withTimeout(
        withProject(client, name, async (doc) => await executePlan(doc as never, plan)),
        APPLY_TIMEOUT_MS,
      )

      const action = await log.record({
        project: name,
        command,
        planId: plan.planId,
        createdEntityIds: result.createdEntityIds,
        updatedFields: [],
      })

      // Fresh document: had the apply above failed, the one it used would be
      // wedged and every call on it would hang.
      const verification = await withProject(client, name, async (doc) =>
        await verifyAction(doc as never, action, plan),
      )

      return { action, verification, plan, summary: result.summary }
    },

    async undo(project, actionId) {
      const name = ref(project)
      const record =
        actionId === undefined || actionId === "" ? await log.latest() : await log.get(actionId)

      if (record === undefined) {
        throw actionId === undefined || actionId === ""
          ? new AgentError("no_actions", "No agent actions have been recorded yet.", 404)
          : new AgentError("action_not_found", `No action "${actionId}" in the log.`, 404)
      }
      if (record.undoneAt !== undefined) {
        throw new AgentError(
          "already_undone",
          `Action ${record.actionId} was already undone at ${record.undoneAt}.`,
          409,
        )
      }

      const result = await withProject(client, name, async (doc) =>
        await undoAction(doc as never, record),
      )
      await log.markUndone(record.actionId)

      return {
        ...result,
        actionId: record.actionId,
        summary:
          `Removed ${result.removedEntityIds.length} entities created by ${record.actionId}` +
          (result.missingEntityIds.length === 0
            ? "."
            : `; ${result.missingEntityIds.length} were already gone.`),
      }
    },

    async getAction(actionId) {
      return await log.get(actionId)
    },
  }
}

async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new AgentError(
                "timeout",
                `The operation did not finish within ${ms}ms. The document may have been wedged by a failed transaction; nothing further was applied.`,
                504,
              ),
            ),
          ms,
        )
      }),
    ])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}
