/**
 * Command centre state machine (issue #24).
 *
 * The demo flow from #17 — type a command, see a plan, confirm, apply, verify,
 * undo — expressed as a reducer so the rules are testable without rendering.
 *
 * The rule this exists to guarantee: **the UI can never offer an Apply button
 * for something the agent would refuse.** The agent rejects an apply without a
 * plan id, and rejects any plan still needing confirmation; `canApply` mirrors
 * both, so the interface and the backend agree on what is possible.
 */
import type { AgentApplyOutcome, AgentPlan } from "./agent-client.js"

export type CommandStatus =
  | "idle"
  | "planning"
  | "reviewing"
  | "needs_answer"
  | "applying"
  | "applied"

export interface CommandState {
  status: CommandStatus
  /** What the user last typed. */
  command?: string
  plan?: AgentPlan
  result?: AgentApplyOutcome
  /** The agent's question, when it will not proceed unaided. */
  question?: string
  error?: string
  /** Transient confirmation, e.g. after an undo. */
  notice?: string
  /** Undo targets the last applied action, which survives later failures. */
  lastActionId?: string
  canApply: boolean
  canUndo: boolean
}

export type CommandAction =
  | { type: "planning"; command: string }
  | { type: "planned"; plan: AgentPlan }
  | { type: "applying" }
  | { type: "applied"; outcome: AgentApplyOutcome }
  | { type: "undone"; summary: string }
  | { type: "failed"; message: string }
  | { type: "reset" }

export const initialCommandState: CommandState = {
  status: "idle",
  canApply: false,
  canUndo: false,
}

export function commandCenterReducer(state: CommandState, action: CommandAction): CommandState {
  switch (action.type) {
    case "planning":
      return {
        ...state,
        status: "planning",
        command: action.command,
        plan: undefined,
        result: undefined,
        question: undefined,
        error: undefined,
        notice: undefined,
        canApply: false,
      }

    case "planned": {
      const { plan } = action
      // Two independent reasons a plan is not applyable, checked separately:
      // the agent said so, or it produced nothing to do. Either is enough.
      // `requiresConfirmation` means the UI must ask the user before apply;
      // it does not mean the plan is unresolved. A clarification is what
      // blocks review, while a plan with actions should render Apply.
      const applyable = plan.clarification === undefined && plan.actions.length > 0
      return {
        ...state,
        status: applyable ? "reviewing" : "needs_answer",
        plan,
        question: applyable ? undefined : (plan.clarification ?? plan.summary),
        canApply: applyable,
      }
    }

    case "applying":
      // Guard, not just a transition. Reaching apply without a reviewed plan
      // would mean the UI offering something the agent refuses.
      if (state.plan === undefined || !state.canApply) {
        return {
          ...state,
          status: "idle",
          error: "There is no reviewed plan to apply. Describe what you want first.",
        }
      }
      return { ...state, status: "applying", error: undefined, notice: undefined }

    case "applied": {
      const { outcome } = action
      return {
        ...state,
        status: "applied",
        result: outcome,
        lastActionId: outcome.action.actionId,
        canApply: false,
        // Undo stays available even when verification failed: the entities
        // exist either way, and refusing undo would strand the user with
        // content they cannot remove.
        canUndo: true,
        error: outcome.verification.ok
          ? undefined
          : `Applied, but verification failed: ${outcome.verification.failures.join("; ")}`,
      }
    }

    case "undone":
      return {
        ...initialCommandState,
        command: state.command,
        notice: action.summary,
      }

    case "failed":
      return { ...state, status: "idle", error: action.message, canApply: false }

    case "reset":
      return {
        ...initialCommandState,
        canUndo: state.canUndo,
        lastActionId: state.lastActionId,
      }
  }
}
