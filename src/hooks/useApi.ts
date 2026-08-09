import { useState, useCallback, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || '/production-coach/api'

interface ChatMessage {
  role: 'user' | 'coach' | 'assistant'
  content: string
}

import type { CoachAction } from '@/types'

interface ChatResponse {
  content: string
  action?: CoachAction
  model?: string
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
    speak,
    stopSpeaking,
  }
}
