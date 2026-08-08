import { useState, useCallback, useEffect } from 'react'
import type { ChatMessage, CoachAction, ChecklistItem, CoachState, SessionState } from '@/types'
import { DEFAULT_CHECKLIST } from '@/types'

// Storage keys
const STORAGE_KEYS = {
  messages: 'production-coach:messages',
  goal: 'production-coach:goal',
  checklist: 'production-coach:checklist',
}

// Dr. Zay personality
const DR_ZAY_INTRO = `Yo, what's good! I'm Dr. Zay, your production coach. I'm not here to make music FOR you - I'm here to help you level up YOUR skills. Tell me what vibe you're going for, and let's get to work. No shortcuts, just growth.`

const DR_ZAY_REFUSE = `Nah, I'm not gonna do that for you. That's YOUR job. But let me show you HOW to do it - that's where the real learning happens. What do you want to understand?`

// Helpers for localStorage
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return fallback
    const parsed = JSON.parse(stored)
    // Convert timestamp strings back to Date objects for messages
    if (key === STORAGE_KEYS.messages && Array.isArray(parsed)) {
      return parsed.map((msg: any) => ({
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
}

export function useCoach({ session, onAddDevice }: UseCoachOptions) {
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
  const setProductionGoal = useCallback((newGoal: string) => {
    setGoal(newGoal)

    // Generate checklist response
    const response: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'coach',
      content: `Alright, "${newGoal}" - I like it! Let me set up your production roadmap. We're gonna take this step by step. First up: find a reference track that captures that vibe. What songs inspire this vision?`,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, response])
  }, [])

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

    // Process
    setIsLoading(true)
    setState('thinking')

    // Simulate processing (will be replaced with actual LLM call)
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Detect if user is asking for generation
    const isGenerationRequest = /make|create|generate|produce.*for me|do it/i.test(content)

    let response: ChatMessage

    if (isGenerationRequest) {
      response = {
        id: `coach-${Date.now()}`,
        role: 'coach',
        content: DR_ZAY_REFUSE,
        timestamp: new Date(),
      }
    } else if (/add.*drum|need.*drum|want.*drum/i.test(content)) {
      response = {
        id: `coach-${Date.now()}`,
        role: 'coach',
        content: `Good call! Every track needs a solid rhythm foundation. I'd suggest starting with Beatbox 8 - it's versatile and beginner-friendly. Want me to add it to your session?`,
        timestamp: new Date(),
        action: {
          type: 'add_device',
          label: 'Add Beatbox 8',
          description: 'Add a drum machine to your session',
          params: { deviceType: 'beatbox8', displayName: 'Drums' },
        },
      }
    } else if (/add.*synth|add.*melody|need.*synth/i.test(content)) {
      response = {
        id: `coach-${Date.now()}`,
        role: 'coach',
        content: `For that vibe, Heisenberg would be perfect - it's got those warm, rich tones. Let's add it and I'll help you dial in the right sound.`,
        timestamp: new Date(),
        action: {
          type: 'add_device',
          label: 'Add Heisenberg',
          description: 'Add a synth for melodies',
          params: { deviceType: 'heisenberg', displayName: 'Lead Synth' },
        },
      }
    } else if (/start|begin|first|how do i/i.test(content)) {
      response = {
        id: `coach-${Date.now()}`,
        role: 'coach',
        content: `Great question! Here's my approach: start with the drums - they're the heartbeat. Pick a tempo that matches your vibe (${goal ? `for "${goal}", I'd say 90-100 BPM` : '90-120 BPM is a good range'}). Once you've got a basic loop going, we'll layer in the other elements. Want me to help you add a drum machine?`,
        timestamp: new Date(),
        action: {
          type: 'add_device',
          label: 'Add Beatbox 8',
          description: 'Add a drum machine to start',
          params: { deviceType: 'beatbox8', displayName: 'Drums' },
        },
      }
    } else if (/muddy|unclear|mix/i.test(content)) {
      response = {
        id: `coach-${Date.now()}`,
        role: 'coach',
        content: `Muddy mix? Classic problem. Here's what usually causes it:\n\n1. **Too much low-end** - Cut frequencies below 80Hz on everything except kick and bass\n2. **Competing frequencies** - If kick and bass are fighting, sidechain the bass to duck when the kick hits\n3. **No space** - Pan elements, use different octaves, give each sound its own lane\n\nWhich of these do you want to tackle first?`,
        timestamp: new Date(),
      }
    } else {
      // Generic helpful response
      response = {
        id: `coach-${Date.now()}`,
        role: 'coach',
        content: `I hear you. Looking at your session, ${session.devices.length === 0 ? "we're starting fresh - that's exciting! What element do you want to lay down first? Drums usually give you a solid foundation to build on." : `you've got ${session.devices.length} device${session.devices.length !== 1 ? 's' : ''} going. What's the next piece of the puzzle?`}`,
        timestamp: new Date(),
      }
    }

    setMessages(prev => [...prev, response])
    setIsLoading(false)
    setState('idle')
  }, [session.devices.length, goal])

  // Apply an action
  const applyAction = useCallback(async (action: CoachAction) => {
    if (action.type === 'add_device' && action.params) {
      const { deviceType, displayName } = action.params as { deviceType: string; displayName?: string }
      await onAddDevice?.(deviceType, displayName)

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
        content: `Done! ${displayName || deviceType} is now in your session. What's next?`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, confirmation])
    }
  }, [onAddDevice])

  // Update checklist item
  const toggleChecklistItem = useCallback((itemId: number) => {
    setChecklist(prev => {
      const updated = prev.map(item => {
        if (item.id === itemId) {
          return { ...item, completed: !item.completed, current: false }
        }
        return item
      })

      // Set next incomplete item as current
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

  // Clear conversation (for reset functionality)
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

  return {
    messages,
    checklist,
    goal,
    state,
    isLoading,
    setProductionGoal,
    sendMessage,
    applyAction,
    toggleChecklistItem,
    clearConversation,
  }
}
