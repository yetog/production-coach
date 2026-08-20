import { useState, useCallback, useEffect } from 'react'
import type { ChatMessage, CoachAction, ChecklistItem, CoachState, SessionState } from '@/types'
import { DEFAULT_CHECKLIST } from '@/types'
import { resolveActionRoute } from '@/lib/coach-action'
import { useApi } from './useApi'

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
  session: SessionState
  onAddDevice?: (type: string, displayName?: string) => Promise<unknown>
  /** Apply a producer command the coach proposed (issue #53) — 808 / musical moves. */
  onApplyCommand?: (command: string) => Promise<unknown>
  voiceEnabled?: boolean
}

export function useCoach({ session, onAddDevice, onApplyCommand, voiceEnabled = false }: UseCoachOptions) {
  const { sendChat, speak, isSpeaking, stopSpeaking, isLoading: apiLoading } = useApi()

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

  // Set production goal
  const setProductionGoal = useCallback(async (newGoal: string) => {
    setGoal(newGoal)
    setState('thinking')
    setIsLoading(true)

    try {
      // Get AI response about the goal
      const response = await sendChat(
        [{ role: 'user', content: `My production goal is: ${newGoal}` }],
        newGoal,
        {
          bpm: session.bpm ?? undefined,
          key: session.key ?? undefined,
          devices: session.devices,
        }
      )

      const coachMessage: ChatMessage = {
        id: `coach-${Date.now()}`,
        role: 'coach',
        content: response.content,
        timestamp: new Date(),
        action: response.action,
      }

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
  }, [sendChat, speak, session, voiceEnabled])

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

      const response = await sendChat(
        recentMessages,
        goal,
        {
          bpm: session.bpm ?? undefined,
          key: session.key ?? undefined,
          devices: session.devices,
        }
      )

      const coachMessage: ChatMessage = {
        id: `coach-${Date.now()}`,
        role: 'coach',
        content: response.content,
        timestamp: new Date(),
        action: response.action,
      }

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
  }, [messages, goal, session, sendChat, speak, voiceEnabled, isSpeaking])

  // Apply an action — either a device add (#40) or an 808/musical move (#53).
  const applyAction = useCallback(async (action: CoachAction) => {
    const route = resolveActionRoute(action)
    if (route.kind === 'none') return

    let what: string
    if (route.kind === 'command') {
      await onApplyCommand?.(route.command)
      what = 'that move'
    } else {
      await onAddDevice?.(route.deviceType, route.displayName)
      what = route.displayName || route.deviceType
    }

    // Mark action as applied
    setMessages(prev =>
      prev.map(msg =>
        msg.action?.label === action.label
          ? { ...msg, action: { ...msg.action!, applied: true } }
          : msg
      )
    )

    // Add confirmation
    const confirmation: ChatMessage = {
      id: `confirm-${Date.now()}`,
      role: 'coach',
      content: `Done! ${what} is now in your session. What's next?`,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, confirmation])

    if (voiceEnabled) {
      speak(confirmation.content)
    }
  }, [onAddDevice, onApplyCommand, voiceEnabled, speak])

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
    toggleChecklistItem,
    clearConversation,
    stopSpeaking,
  }
}
