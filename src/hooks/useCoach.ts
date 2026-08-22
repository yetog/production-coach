import { useState, useCallback, useEffect, useRef } from 'react'
import type { ChatMessage, CoachAction, ChecklistItem, CoachState, SessionState } from '@/types'
import { DEFAULT_CHECKLIST } from '@/types'
import { resolveActionRoute } from '@/lib/coach-action'
import { type AgentPlanSummary, useApi } from './useApi'
import { applyEvent, isActionablePlan, planEvent, undoEvent } from '@/lib/agent-events'

// Storage keys
const STORAGE_KEYS = {
  messages: 'production-coach:messages',
  goal: 'production-coach:goal',
  checklist: 'production-coach:checklist',
}

// Dr. Zay intro
const DR_ZAY_INTRO = `Yo, what's good! I'm Dr. Zay, your production coach. I'm not here to make music FOR you - I'm here to help you level up YOUR skills. Tell me what vibe you're going for, and let's get to work. No shortcuts, just growth.`

// Helpers for localStorage
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return fallback
    const parsed = JSON.parse(stored)
    if (key === STORAGE_KEYS.messages && Array.isArray(parsed)) {
      return parsed.map((msg: ChatMessage) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })) as T
    }
    return parsed
  } catch {
    return fallback
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable
  }
}

interface UseCoachOptions {
  project?: string
  session: SessionState
  onAddDevice?: (type: string, displayName?: string) => Promise<unknown>
  /** Apply a producer command the coach proposed (issue #53) — 808 / musical moves. */
  onApplyCommand?: (command: string) => Promise<unknown>
  /** Apply a plan already previewed in the agent conversation. */
  onApplyPlan?: (command: string, planId: string) => Promise<unknown>
  /** Undo the last verified producer action through the same AgentService. */
  onUndo?: () => Promise<unknown>
  /** Publish a typed chat plan to other producer clients in the same session. */
  onPlan?: (plan: AgentPlanSummary) => void
  /** Re-plan a persisted pending request against current Audiotool state. */
  onRehydratePlan?: (command: string) => Promise<AgentPlanSummary | null>
  voiceEnabled?: boolean
}

export function useCoach({ project, session, onAddDevice, onApplyCommand, onApplyPlan, onUndo, onPlan, onRehydratePlan, voiceEnabled = false }: UseCoachOptions) {
  const { sendAgentChat, speak, isSpeaking, stopSpeaking, isLoading: apiLoading } = useApi()
  const rehydrateCallback = useRef(onRehydratePlan)
  const rehydratedMessages = useRef(new Set<string>())
  rehydrateCallback.current = onRehydratePlan

  const actionFromPlan = (plan: AgentPlanSummary | undefined): CoachAction | undefined => {
    if (!isActionablePlan(plan)) return undefined
    const deviceAction = plan.actions.find((action) => action.type === 'create_source')
    if (plan.intent === 'add_device' && typeof deviceAction?.deviceType === 'string') {
      return {
        type: 'add_device',
        label: `Review ${String(deviceAction.displayName ?? deviceAction.deviceType)}`,
        description: plan.summary,
        params: { deviceType: deviceAction.deviceType, displayName: deviceAction.displayName, command: plan.command, planId: plan.planId },
      }
    }
    return {
      type: 'create_notes',
      label: 'Review producer plan',
      description: plan.summary,
      params: { command: plan.command, planId: plan.planId },
    }
  }

  // Initialize state from localStorage
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const stored = loadFromStorage<ChatMessage[]>(STORAGE_KEYS.messages, [])
    if (stored.length === 0) {
      return [
        {
          id: 'intro',
          role: 'coach',
          content: DR_ZAY_INTRO,
          timestamp: new Date(),
        },
      ]
    }
    return stored
  })

  const [checklist, setChecklist] = useState<ChecklistItem[]>(() =>
    loadFromStorage(STORAGE_KEYS.checklist, DEFAULT_CHECKLIST)
  )

  const [goal, setGoal] = useState<string | null>(() =>
    loadFromStorage(STORAGE_KEYS.goal, null)
  )

  const [state, setState] = useState<CoachState>('idle')
  const [isLoading, setIsLoading] = useState(false)

  // Persist state changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.messages, messages)
  }, [messages])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.checklist, checklist)
  }, [checklist])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.goal, goal)
  }, [goal])

  // A plan id is a snapshot of current project state. Re-plan persisted
  // pending requests after reconnect so Apply can only use a fresh id.
  useEffect(() => {
    if (!project || rehydrateCallback.current === undefined) return
    for (const message of messages) {
      const event = message.producerEvent
      if (
        event === undefined ||
        (event.kind !== 'plan' && event.kind !== 'clarification') ||
        typeof event.command !== 'string'
      ) continue
      const key = `${project}:${message.id}`
      if (rehydratedMessages.current.has(key)) continue
      rehydratedMessages.current.add(key)
      void rehydrateCallback.current(event.command).then((plan) => {
        if (plan === null) return
        const refreshedEvent = planEvent(plan)
        setMessages((previous) => previous.map((candidate) => {
          if (candidate.id !== message.id) return candidate
          const refreshedAction = actionFromPlan(plan)
          return {
            ...candidate,
            producerEvent: refreshedEvent,
            action: candidate.action?.applied
              ? { ...candidate.action, params: { ...candidate.action.params, command: plan.command, planId: plan.planId } }
              : refreshedAction,
          }
        }))
      }).catch(() => {
        // Keep the persisted preview visible; Apply will surface the bridge
        // error rather than silently claiming the old plan is current.
      })
    }
  }, [messages, project])

  // Set production goal
  const setProductionGoal = useCallback(async (newGoal: string) => {
    setGoal(newGoal)
    setState('thinking')
    setIsLoading(true)

    try {
      // Get AI response about the goal
      const response = await sendAgentChat(
        [{ role: 'user', content: `My production goal is: ${newGoal}` }],
        newGoal,
        {
          bpm: session.bpm ?? undefined,
          key: session.key ?? undefined,
          devices: session.devices,
        },
        project,
      )

      const coachMessage: ChatMessage = {
        id: `coach-${Date.now()}`,
        role: 'coach',
        content: response.content,
        timestamp: new Date(),
        action: response.action ?? actionFromPlan(response.plan),
        producerEvent: response.plan ? planEvent(response.plan) : undefined,
      }

      if (response.plan !== undefined) onPlan?.(response.plan)

      setMessages(prev => [...prev, coachMessage])

      // Speak the response if voice is enabled
      if (voiceEnabled) {
        setState('speaking')
        await speak(response.content)
      }
    } catch (error) {
      console.error('Failed to process goal:', error)
      // Fallback response
      const fallbackMessage: ChatMessage = {
        id: `coach-${Date.now()}`,
        role: 'coach',
        content: `Alright, "${newGoal}" - I like it! Let me set up your production roadmap. What aspect do you want to tackle first?`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, fallbackMessage])
    } finally {
      setIsLoading(false)
      if (!voiceEnabled) setState('idle')
    }
  }, [onPlan, project, sendAgentChat, speak, session, voiceEnabled])

  // Send message to coach
  const sendMessage = useCallback(async (content: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])

    // Process with AI
    setIsLoading(true)
    setState('thinking')

    try {
      // Build message history for context (last 10 messages)
      const recentMessages = [...messages.slice(-9), userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }))

      const response = await sendAgentChat(
        recentMessages,
        goal,
        {
          bpm: session.bpm ?? undefined,
          key: session.key ?? undefined,
          devices: session.devices,
        },
        project,
      )

      const coachMessage: ChatMessage = {
        id: `coach-${Date.now()}`,
        role: 'coach',
        content: response.content,
        timestamp: new Date(),
        action: response.action ?? actionFromPlan(response.plan),
        producerEvent: response.plan ? planEvent(response.plan) : undefined,
      }

      if (response.plan !== undefined) onPlan?.(response.plan)

      setMessages(prev => [...prev, coachMessage])

      // Speak the response if voice is enabled
      if (voiceEnabled) {
        setState('speaking')
        await speak(response.content)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // Fallback response
      const fallbackMessage: ChatMessage = {
        id: `coach-${Date.now()}`,
        role: 'coach',
        content: "Yo, hit a snag there. Let's try that again - what were you asking?",
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, fallbackMessage])
    } finally {
      setIsLoading(false)
      if (!voiceEnabled || !isSpeaking) setState('idle')
    }
  }, [messages, goal, onPlan, project, session, sendAgentChat, speak, voiceEnabled, isSpeaking])

  // Apply an action — either a device add (#40) or an 808/musical move (#53).
  const applyAction = useCallback(async (action: CoachAction) => {
    const route = resolveActionRoute(action)
    if (route.kind === 'none') return

    let what: string
    let outcome: unknown
    const planId = action.params?.planId
    if (route.kind === 'command') {
      outcome = typeof planId === 'string' && onApplyPlan !== undefined
        ? await onApplyPlan(route.command, planId)
        : await onApplyCommand?.(route.command)
      what = 'that move'
    } else {
      outcome = typeof planId === 'string' && onApplyPlan !== undefined
        ? await onApplyPlan(String(action.params?.command ?? `add ${route.displayName ?? route.deviceType}`), planId)
        : await onAddDevice?.(route.deviceType, route.displayName)
      what = route.displayName || route.deviceType
    }

    if (outcome === null || outcome === false) return

    const event = applyEvent(outcome, {
      planId: typeof planId === 'string' ? planId : undefined,
      summary: `Added ${what}.`,
    })

    // Mark action as applied
    setMessages(prev =>
      prev.map(msg =>
        msg.action?.label === action.label
          ? {
              ...msg,
              action: { ...msg.action!, applied: true, params: { ...msg.action?.params, actionId: event.actionId } },
              producerEvent: event,
            }
          : msg
      )
    )

    // Add confirmation
    const confirmation: ChatMessage = {
      id: `confirm-${Date.now()}`,
      role: 'coach',
      content: `Done! ${what} is now in your session. What's next?`,
      timestamp: new Date(),
      producerEvent: {
        ...event,
        kind: 'verification',
      },
    }
    setMessages(prev => [...prev, confirmation])

    if (voiceEnabled) {
      speak(confirmation.content)
    }
  }, [onAddDevice, onApplyCommand, onApplyPlan, voiceEnabled, speak])

  const undoLastAction = useCallback(async (messageId?: string) => {
    if (onUndo === undefined) return
    const outcome = await onUndo()
    if (outcome === null || outcome === false) return
    const event = undoEvent(outcome)
    setMessages(prev => prev.map(message => {
      if (messageId !== undefined && message.id !== messageId) return message
      if (message.producerEvent?.actionId !== event.actionId) return message
      const existingEvent = message.producerEvent
      return { ...message, producerEvent: { ...existingEvent, status: 'undone' as const } as typeof existingEvent }
    }))
    setMessages(prev => [...prev, {
      id: `undo-${Date.now()}`,
      role: 'coach',
      content: event.summary ?? 'The last producer change was undone.',
      timestamp: new Date(),
      producerEvent: event,
    }])
  }, [onUndo])

  // Update checklist item
  const toggleChecklistItem = useCallback((itemId: number) => {
    setChecklist(prev => {
      const updated = prev.map(item => {
        if (item.id === itemId) {
          return { ...item, completed: !item.completed, current: false }
        }
        return item
      })

      const nextIncomplete = updated.find(item => !item.completed)
      if (nextIncomplete) {
        return updated.map(item => ({
          ...item,
          current: item.id === nextIncomplete.id,
        }))
      }

      return updated
    })
  }, [])

  // Clear conversation
  const clearConversation = useCallback(() => {
    setMessages([
      {
        id: 'intro',
        role: 'coach',
        content: DR_ZAY_INTRO,
        timestamp: new Date(),
      },
    ])
    setGoal(null)
    setChecklist(DEFAULT_CHECKLIST)
    localStorage.removeItem(STORAGE_KEYS.messages)
    localStorage.removeItem(STORAGE_KEYS.goal)
    localStorage.removeItem(STORAGE_KEYS.checklist)
  }, [])

  // Update state based on speaking
  useEffect(() => {
    if (isSpeaking) {
      setState('speaking')
    } else if (!isLoading && !apiLoading) {
      setState('idle')
    }
  }, [isSpeaking, isLoading, apiLoading])

  return {
    messages,
    checklist,
    goal,
    state,
    isLoading: isLoading || apiLoading,
    isSpeaking,
    setProductionGoal,
    sendMessage,
    applyAction,
    undoLastAction,
    toggleChecklistItem,
    clearConversation,
    stopSpeaking,
  }
}
