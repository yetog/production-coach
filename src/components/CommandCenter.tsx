import { useCallback, useEffect, useReducer, useState } from 'react'
import {
  commandCenterReducer,
  initialCommandState,
} from '@/lib/command-center'
import type { useNexus } from '@/hooks/useNexus'

/**
 * Producer command centre (issue #24).
 *
 * The demo contract from #17, made operable: type a command, read what the
 * agent intends to do, confirm, apply, see the verification result, undo.
 *
 * Two deliberate choices about how this is presented:
 *
 *  - **Nothing is applied without a preview.** The Apply button only exists
 *    once a plan has been rendered, mirroring the agent's own refusal to apply
 *    without a plan id. The interface cannot offer what the backend rejects.
 *  - **The agent's question is shown as a question**, not an error. When it is
 *    not confident where the drop is, that is the product working as designed -
 *    the coach acts on instruction rather than guessing.
 */

const EXAMPLES = [
  'add a dark 808 under the drop',
  'put the 808 at bar 33',
  'add a beatbox 9',
]

type Agent = ReturnType<typeof useNexus>

export function CommandCenter({ agent }: { agent: Agent }) {
  const [state, dispatch] = useReducer(commandCenterReducer, initialCommandState)
  const [input, setInput] = useState('')

  // Chat and Command Center use one useNexus instance. Reflect chat-created
  // plans and outcomes here so the two surfaces cannot show contradictory
  // producer state during migration.
  useEffect(() => {
    if (agent.sharedPlan !== undefined && state.plan?.planId !== agent.sharedPlan.planId) {
      dispatch({ type: 'planned', plan: agent.sharedPlan })
    }
  }, [agent.sharedPlan, state.plan?.planId])

  useEffect(() => {
    if (
      agent.sharedOutcome !== null &&
      state.result?.action.actionId !== agent.sharedOutcome.action.actionId
    ) {
      dispatch({ type: 'applied', outcome: agent.sharedOutcome })
    }
  }, [agent.sharedOutcome, state.result?.action.actionId])

  useEffect(() => {
    if (
      agent.sharedUndo !== null &&
      state.lastActionId === agent.sharedUndo.actionId &&
      state.canUndo
    ) {
      dispatch({ type: 'undone', summary: agent.sharedUndo.summary })
    }
  }, [agent.sharedUndo, state.canUndo, state.lastActionId])

  const onPlan = useCallback(
    async (command: string) => {
      if (command.trim() === '') return
      dispatch({ type: 'planning', command })
      const plan = await agent.planCommand(command)
      if (plan === null) {
        dispatch({ type: 'failed', message: agent.error ?? 'Could not plan that command.' })
        return
      }
      dispatch({ type: 'planned', plan })
    },
    [agent],
  )

  const onApply = useCallback(async () => {
    if (state.plan === undefined || !state.canApply) return
    dispatch({ type: 'applying' })
    const outcome = await agent.applyPlan(state.plan.command, state.plan.planId)
    if (outcome === null) {
      dispatch({ type: 'failed', message: agent.error ?? 'Could not apply that plan.' })
      return
    }
    dispatch({ type: 'applied', outcome })
  }, [agent, state.canApply, state.plan])

  const onUndo = useCallback(async () => {
    const outcome = await agent.undoLast()
    if (outcome === null) {
      dispatch({ type: 'failed', message: agent.error ?? 'Could not undo.' })
      return
    }
    dispatch({ type: 'undone', summary: outcome.summary })
  }, [agent])

  const busy = state.status === 'planning' || state.status === 'applying'

  return (
    <section className="command-center" aria-label="Producer commands">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void onPlan(input)
        }}
      >
        <label htmlFor="producer-command">Tell the coach what to do</label>
        <input
          id="producer-command"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="add a dark 808 under the drop"
          disabled={busy}
          autoComplete="off"
        />
        <button type="submit" disabled={busy || input.trim() === ''}>
          {state.status === 'planning' ? 'Thinking…' : 'Preview'}
        </button>
      </form>

      <div className="command-examples">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            disabled={busy}
            onClick={() => {
              setInput(example)
              void onPlan(example)
            }}
          >
            {example}
          </button>
        ))}
      </div>

      {/* The agent asking which bar it should use is the product working, not
          a failure, so it reads as a question rather than an error. */}
      {state.status === 'needs_answer' && state.question !== undefined && (
        <div className="command-question" role="status">
          <strong>The coach needs to know:</strong>
          <p>{state.question}</p>
        </div>
      )}

      {state.plan !== undefined && state.canApply && (
        <div className="command-plan">
          <h3>{state.plan.interpretedIntent}</h3>
          <p>{state.plan.summary}</p>
          <details>
            <summary>What it will create</summary>
            <ul>
              {state.plan.actions.map((action, index) => (
                <li key={index}>{String(action.type)}</li>
              ))}
            </ul>
          </details>
          <div className="command-actions">
            <button type="button" onClick={() => void onApply()} disabled={busy}>
              {state.status === 'applying' ? 'Applying…' : 'Apply'}
            </button>
            <button type="button" onClick={() => dispatch({ type: 'reset' })} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {state.result !== undefined && (
        <div className="command-result" role="status">
          <p>{state.result.summary}</p>
          <p className="command-verification">
            {state.result.verification.ok
              ? `Verified: ${state.result.verification.checked} checks passed.`
              : `Verification failed: ${state.result.verification.failures.join('; ')}`}
          </p>
        </div>
      )}

      {state.error !== undefined && (
        <p className="command-error" role="alert">
          {state.error}
        </p>
      )}
      {state.notice !== undefined && (
        <p className="command-notice" role="status">
          {state.notice}
        </p>
      )}

      {state.canUndo && (
        <button type="button" className="command-undo" onClick={() => void onUndo()} disabled={busy}>
          Undo last change
        </button>
      )}
    </section>
  )
}
