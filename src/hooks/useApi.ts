import { useState, useCallback, useRef } from 'react'
import { resolveApiBase } from '@/lib/api-base'
import { parseAgentSse } from '@/lib/agent-stream'

// Derived from Vite's `base` so it cannot drift from the dev proxy (#41).
const API_BASE = resolveApiBase(import.meta.env.BASE_URL, import.meta.env.VITE_API_URL)

interface ChatMessage {
  role: 'user' | 'coach' | 'assistant'
  content: string
}

import type { CoachAction } from '@/types'

export interface AgentPlanSummary {
  planId: string
  command: string
  intent: string
  interpretedIntent: string
  target: { section?: string; startBar: number; endBar: number; confidence: number }
  actions: Array<Record<string, unknown>>
  summary: string
  requiresConfirmation: boolean
  clarification?: string
}

export interface ChatResponse {
  content: string
  action?: CoachAction
  model?: string
  plan?: AgentPlanSummary
}

interface SessionInfo {
  bpm?: number
  key?: string
  devices?: Array<{ id: string; type: string }>
}

export function useApi() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)

  // Check API health
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/health`)
      const data = await res.json()
      return data
    } catch (err) {
      console.error('Health check failed:', err)
      return { status: 'error', services: { ionos: false, elevenlabs: false } }
    }
  }, [])

  // Send chat message to IONOS Model Hub
  const sendChat = useCallback(async (
    messages: ChatMessage[],
    goal?: string | null,
    sessionInfo?: SessionInfo
  ): Promise<ChatResponse> => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, goal, sessionInfo }),
      })

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }

      const data = await res.json()
      return data
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get response'
      setError(errorMsg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Agent chat uses typed producer tools and the shared plan/apply service.
  const sendAgentChat = useCallback(async (
    messages: ChatMessage[],
    goal?: string | null,
    sessionInfo?: SessionInfo,
    project?: string,
  ): Promise<ChatResponse> => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/dr-zay/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, goal, sessionInfo, project }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => undefined)
        throw new Error(data?.error ?? `Agent API error: ${res.status}`)
      }

      if (res.body === null) throw new Error('Agent response did not provide a stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let pending = ''
      let text = ''
      let terminal: ChatResponse | undefined
      const consume = (chunk: string) => {
        pending += chunk
        const records = pending.split(/\r?\n\r?\n/)
        pending = records.pop() ?? ''
        for (const event of parseAgentSse(records.join('\n\n'))) {
          if (event.type === 'text_delta' && typeof event.text === 'string') text += event.text
          if (event.type === 'done') terminal = event as unknown as ChatResponse
          if (event.type === 'error') throw new Error(String(event.error ?? 'Agent stream failed'))
        }
      }

      while (true) {
        const next = await reader.read()
        if (next.done) break
        consume(decoder.decode(next.value, { stream: true }))
      }
      for (const event of parseAgentSse(pending)) {
        if (event.type === 'text_delta' && typeof event.text === 'string') text += event.text
        if (event.type === 'done') terminal = event as unknown as ChatResponse
        if (event.type === 'error') throw new Error(String(event.error ?? 'Agent stream failed'))
      }
      return terminal ?? { content: text || 'Yo, I need a little more detail before I make a move.' }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get agent response'
      setError(errorMsg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Text-to-speech with ElevenLabs
  const speak = useCallback(async (text: string) => {
    try {
      // Stop any current audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      setIsSpeaking(true)

      const res = await fetch(`${API_BASE}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        throw new Error(`TTS error: ${res.status}`)
      }

      // Create audio from blob
      const blob = await res.blob()
      const audioUrl = URL.createObjectURL(blob)
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
        audioRef.current = null
      }

      audio.onerror = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
        audioRef.current = null
      }

      await audio.play()
    } catch (err) {
      console.error('TTS error:', err)
      setIsSpeaking(false)
    }
  }, [])

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsSpeaking(false)
  }, [])

  return {
    isLoading,
    error,
    isSpeaking,
    checkHealth,
    sendChat,
    sendAgentChat,
    speak,
    stopSpeaking,
  }
}
