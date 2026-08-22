import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AgentApiError,
  createAgentClient,
  type AgentPlan,
  type AgentSessionReport,
} from '@/lib/agent-client'
import { resolveApiBase } from '@/lib/api-base'
import { projectFromLocation } from '@/lib/project-context'
import type { DeviceInfo, SessionState } from '@/types'

/**
 * Live session state, backed by the agent bridge (issue #23).
 *
 * This used to be a mock: a setTimeout that reported "connected, 120bpm, Am",
 * an addDevice that pushed `mock-${Date.now()}` into local state, and a
 * connectDevices that only logged. Nothing reached the DAW, which meant the
 * session info handed to Dr. Zay was fabricated.
 *
 * It now calls the local bridge, which owns the Audiotool PAT and runs the
 * same analyze/plan/apply/undo path as the producer CLI. Nothing in the
 * browser imports the Nexus SDK or sees a credential.
 *
 * The hook's shape is unchanged so App.tsx did not have to move.
 */

const STORAGE_KEY = 'production-coach-project'

const initialSession: SessionState = {
  connected: false,
  bpm: null,
  key: null,
  devices: [],
  regions: [],
}

const agent = createAgentClient(
  resolveApiBase(import.meta.env.BASE_URL, import.meta.env.VITE_API_URL),
)

/** Extract project ID from various URL formats */
function parseProjectUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  // Full URL: https://www.audiotool.com/studio?project=xxx
  const match = trimmed.match(/[?&]project=([^&]+)/)
  if (match) return match[1]
  // projects/xxx format
  if (trimmed.startsWith('projects/')) return trimmed
  // Bare UUID
  return trimmed
}

/** The analyzer reports an inventory by category; the UI wants a device list. */
function inventoryToDevices(inventory: Record<string, number>): DeviceInfo[] {
  return Object.entries(inventory)
    .filter(([, count]) => count > 0)
    .flatMap(([category, count]) =>
      Array.from({ length: count }, (_unused, index) => ({
        id: `${category}-${index}`,
        type: category,
        displayName: category,
      })),
    )
}

export function useNexus() {
  const [session, setSession] = useState<SessionState>(initialSession)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /** Detected arrangement sections. Not RegionInfo - see the note in refresh. */
  const [sections, setSections] = useState<AgentSessionReport['sections']>([])
  /** Guards against a refresh landing after the component has gone. */
  const alive = useRef(true)

  /** The project URL/ID set by the user */
  const [projectUrl, setProjectUrlState] = useState<string>(() => {
    try {
      const extensionProject = typeof window === 'undefined'
        ? undefined
        : projectFromLocation(window.location.search)
      return extensionProject ?? localStorage.getItem(STORAGE_KEY) ?? ''
    } catch {
      return ''
    }
  })

  /** Parsed project ID from the URL */
  const projectId = parseProjectUrl(projectUrl)

  /** Set and persist the project URL */
  const setProjectUrl = useCallback((url: string) => {
    setProjectUrlState(url)
    try {
      localStorage.setItem(STORAGE_KEY, url)
    } catch {
      // localStorage unavailable
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!projectId) {
      setSession((prev) => ({ ...prev, connected: false }))
      setError('Enter your Audiotool project URL to connect')
      return
    }
    try {
      const report = await agent.analyze(projectId)
      if (!alive.current) return
      setSession({
        connected: true,
        bpm: report.tempoBpm > 0 ? report.tempoBpm : null,
        // The analyzer reports a time signature; musical key is not in the
        // NEXUS schema, so this stays null rather than inventing "Am".
        key: null,
        devices: inventoryToDevices(report.inventory),
        // Left empty deliberately. The analyzer reports *sections* - derived
        // spans with a label and a confidence - not the raw regions RegionInfo
        // describes (trackId, startTick, type). Coercing one into the other
        // would put invented trackIds in front of the user, which is the same
        // fabrication this hook was rewritten to remove. Exposing real regions
        // is a bridge change, not a cast.
        regions: [],
      })
      setSections(report.sections)
      setError(null)
    } catch (caught) {
      if (!alive.current) return
      setSession((previous) => ({ ...previous, connected: false }))
      setError(caught instanceof AgentApiError ? caught.message : 'Could not reach the agent.')
    }
  }, [projectId])

  useEffect(() => {
    alive.current = true
    void refresh()
    return () => {
      alive.current = false
    }
  }, [refresh])

  /**
   * Preview a producer command. Never mutates - this is what the UI should
   * render before offering an Apply button.
   */
  const planCommand = useCallback(async (command: string): Promise<AgentPlan | null> => {
    setBusy(true)
    setError(null)
    try {
      return await agent.plan(projectId || undefined, command)
    } catch (caught) {
      setError(caught instanceof AgentApiError ? caught.message : 'Could not plan that command.')
      return null
    } finally {
      setBusy(false)
    }
  }, [projectId])

  /**
   * Apply a plan the user has seen. Requires the plan id on purpose: the agent
   * refuses to apply anything that was not previewed first.
   */
  const applyPlan = useCallback(
    async (command: string, planId: string) => {
      setBusy(true)
      setError(null)
      try {
        const outcome = await agent.apply(projectId || undefined, command, planId)
        await refresh()
        return outcome
      } catch (caught) {
        setError(caught instanceof AgentApiError ? caught.message : 'Could not apply that plan.')
        return null
      } finally {
        setBusy(false)
      }
    },
    [projectId, refresh],
  )

  /** Undo the agent's last action. Removes only what the agent created. */
  const undoLast = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const outcome = await agent.undo(projectId || undefined)
      await refresh()
      return outcome
    } catch (caught) {
      setError(caught instanceof AgentApiError ? caught.message : 'Could not undo.')
      return null
    } finally {
      setBusy(false)
    }
  }, [projectId, refresh])

  /**
   * Add a device by name, as suggested by the coach.
   *
   * Routed through plan -> apply so it inherits the whole safety envelope:
   * the plan is computed from a live read, apply refuses anything needing
   * confirmation, and the result is recorded in the action log for undo.
   */
  const addDevice = useCallback(
    async (type: string, displayName?: string) => {
      const command = `add ${displayName ?? type}`
      const plan = await planCommand(command)
      if (plan === null) return null
      if (plan.requiresConfirmation) {
        setError(plan.clarification ?? plan.summary)
        return null
      }
      const outcome = await applyPlan(command, plan.planId)
      return outcome === null ? null : { plan, outcome }
    },
    [applyPlan, planCommand],
  )

  /**
   * Apply a producer command the coach proposed (issue #53).
   *
   * Same safety envelope as addDevice: plan from a live read, refuse anything
   * still needing confirmation, then apply. Used for 808 / musical moves whose
   * command the chat already built.
   */
  const applyCommand = useCallback(
    async (command: string) => {
      const plan = await planCommand(command)
      if (plan === null) return null
      if (plan.requiresConfirmation) {
        setError(plan.clarification ?? plan.summary)
        return null
      }
      const outcome = await applyPlan(command, plan.planId)
      return outcome === null ? null : { plan, outcome }
    },
    [applyPlan, planCommand],
  )

  return {
    session,
    sections,
    error,
    busy,
    projectUrl,
    setProjectUrl,
    refreshDevices: refresh,
    planCommand,
    applyPlan,
    undoLast,
    addDevice,
    applyCommand,
  }
}
