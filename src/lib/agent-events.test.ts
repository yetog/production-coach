import { describe, expect, it } from 'vitest'
import { applyEvent, isActionablePlan, planEvent, undoEvent } from './agent-events'

const plan = {
  planId: 'p1', command: 'put a dark 808 at bar 33', intent: 'add_808',
  interpretedIntent: 'Add a dark 808', target: { startBar: 33, endBar: 48, confidence: 1 },
  actions: [{ type: 'create_source' }], summary: 'Add an 808.', requiresConfirmation: true,
}

describe('producer lifecycle events', () => {
  it('turns a typed plan into a reviewable event', () => {
    expect(planEvent(plan)).toMatchObject({ kind: 'plan', planId: 'p1', target: plan.target })
    expect(isActionablePlan(plan)).toBe(true)
  })

  it('keeps clarification plans answer-only', () => {
    const clarification = { ...plan, clarification: 'Which bars?', actions: [] }
    expect(planEvent(clarification)).toMatchObject({ kind: 'clarification', status: 'pending' })
    expect(isActionablePlan(clarification)).toBe(false)
  })

  it('records verified apply and undo state from authoritative outcomes', () => {
    const applied = applyEvent({
      action: { actionId: 'a1' }, verification: { ok: true, checked: 3, failures: [] },
      plan, summary: 'Added an 808.',
    }, { planId: 'p1', summary: 'fallback' })
    expect(applied).toMatchObject({ kind: 'apply_outcome', actionId: 'a1', status: 'verified' })
    expect(undoEvent({ actionId: 'a1', summary: 'Removed it.' })).toMatchObject({ kind: 'undo', status: 'undone' })
  })

  it('marks failed verification as failed rather than applied', () => {
    expect(applyEvent({
      action: { actionId: 'a1' },
      verification: { ok: false, checked: 1, failures: ['missing device'] },
    }, { summary: 'Added an 808.' })).toMatchObject({
      status: 'failed',
      verification: { ok: false, failures: ['missing device'] },
    })
  })
})
