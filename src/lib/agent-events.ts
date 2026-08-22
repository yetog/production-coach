import type { AgentPlanSummary } from '@/hooks/useApi'
import type { ProducerEvent } from '@/types'

export function planEvent(plan: AgentPlanSummary): ProducerEvent {
  return {
    kind: plan.clarification ? 'clarification' : 'plan',
    command: plan.command,
    planId: plan.planId,
    summary: plan.summary,
    target: plan.target,
    actions: plan.actions,
    status: plan.clarification ? 'pending' : 'pending',
  }
}

export function applyEvent(outcome: unknown, fallback: { planId?: string; summary: string }): ProducerEvent {
  const value = outcome as {
    action?: { actionId?: string }
    verification?: { ok?: boolean; checked?: number; failures?: string[] }
    summary?: string
    plan?: { planId?: string; command?: string }
  } | null
  const verification = value?.verification
  const verified = verification?.ok === true
  return {
    kind: 'apply_outcome',
    planId: value?.plan?.planId ?? fallback.planId,
    actionId: value?.action?.actionId,
    command: value?.plan?.command,
    summary: value?.summary ?? fallback.summary,
    status: verified ? 'verified' : 'applied',
    verification: verification
      ? {
          ok: verification.ok === true,
          checked: verification.checked ?? 0,
          failures: verification.failures ?? [],
        }
      : undefined,
  }
}

export function undoEvent(outcome: unknown): ProducerEvent {
  const value = outcome as { actionId?: string; summary?: string } | null
  return {
    kind: 'undo',
    actionId: value?.actionId,
    summary: value?.summary ?? 'The last producer change was undone.',
    status: 'undone',
  }
}

/** A plan with actions can be reviewed; a clarification remains answer-only. */
export function isActionablePlan(plan: AgentPlanSummary | undefined): plan is AgentPlanSummary {
  return plan !== undefined && !plan.clarification && plan.actions.length > 0
}
