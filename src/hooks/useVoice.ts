import { useState, useCallback, useEffect, useRef } from 'react'

interface UseVoiceOptions {
  onTranscript?: (text: string) => void
  onSpeakingChange?: (isSpeaking: boolean) => void
}

interface UseVoiceReturn {
  // TTS
  speak: (text: string) => void
  stopSpeaking: () => void
  isSpeaking: boolean
  voiceEnabled: boolean
  setVoiceEnabled: (enabled: boolean) => void

  // STT
  startListening: () => void
  stopListening: () => void
  isListening: boolean
  transcript: string
  isSupported: boolean
}

// Type for SpeechRecognition (not in all browsers)
interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onstart: ((this: ISpeechRecognition, ev: Event) => void) | null
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onerror: ((this: ISpeechRecognition, ev: Event) => void) | null
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

export function useVoice({ onTranscript, onSpeakingChange }: UseVoiceOptions = {}): UseVoiceReturn {
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    try {
      return localStorage.getItem('production-coach:voice') === 'true'
    } catch {
      return false
    }
  })
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')

  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const accumulatedTranscriptRef = useRef<string>('')

  // Check browser support
  const isSupported = typeof window !== 'undefined' && (
    'speechSynthesis' in window ||
    'SpeechRecognition' in window ||
    'webkitSpeechRecognition' in window
  )

  // Persist voice setting
  useEffect(() => {
    try {
      localStorage.setItem('production-coach:voice', voiceEnabled.toString())
    } catch {
      // Ignore
    }
  }, [voiceEnabled])

  // Notify parent of speaking state changes
  useEffect(() => {
    onSpeakingChange?.(isSpeaking)
  }, [isSpeaking, onSpeakingChange])

  // TTS: Speak text
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utteranceRef.current = utterance

    // Configure voice - try to find a good one
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(v =>
      v.name.includes('Google') && v.lang.startsWith('en')
    ) || voices.find(v =>
      v.lang.startsWith('en-US')
    ) || voices[0]

    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    utterance.rate = 1.0
    utterance.pitch = 1.0

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [voiceEnabled])

  // TTS: Stop speaking
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [])

  // STT: Start listening
  const startListening = useCallback(() => {
    if (!isSupported || typeof window === 'undefined') return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionClass) return

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }

    const recognition = new SpeechRecognitionClass() as ISpeechRecognition
    recognitionRef.current = recognition

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    // Pause duration before considering speech complete (ms)
    const PAUSE_DURATION = 2000

    recognition.onstart = () => {
      setIsListening(true)
      setTranscript('')
      accumulatedTranscriptRef.current = ''
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Clear any existing pause timer
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current)
      }

      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      // Accumulate final transcripts
      if (finalTranscript) {
        accumulatedTranscriptRef.current += ' ' + finalTranscript
      }

      // Show current state to user
      const displayText = (accumulatedTranscriptRef.current + ' ' + interimTranscript).trim()
      setTranscript(displayText)

      // Set pause timer - if no new speech for PAUSE_DURATION, send the message
      pauseTimerRef.current = setTimeout(() => {
        const fullTranscript = accumulatedTranscriptRef.current.trim()
        if (fullTranscript) {
          onTranscript?.(fullTranscript)
          accumulatedTranscriptRef.current = ''
          setTranscript('')
          // Stop recognition after sending
          recognition.stop()
        }
      }, PAUSE_DURATION)
    }

    recognition.onerror = (event: Event) => {
      console.error('Speech recognition error:', event)
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current)
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current)
      }
      setIsListening(false)
    }

    recognition.start()
  }, [isSupported, onTranscript])

  // STT: Stop listening
  const stopListening = useCallback(() => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current)
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
    // Send any accumulated transcript when manually stopped
    const fullTranscript = accumulatedTranscriptRef.current.trim()
    if (fullTranscript) {
      onTranscript?.(fullTranscript)
      accumulatedTranscriptRef.current = ''
      setTranscript('')
    }
  }, [onTranscript])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current)
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  return {
    // TTS
    speak,
    stopSpeaking,
    isSpeaking,
    voiceEnabled,
    setVoiceEnabled,

    // STT
    startListening,
    stopListening,
    isListening,
    transcript,
    isSupported,
  }
}
