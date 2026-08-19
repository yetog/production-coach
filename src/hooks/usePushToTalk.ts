import { useEffect, useRef, useCallback } from 'react'

interface UsePushToTalkOptions {
  /** Key to hold for push-to-talk (default: 'y') */
  key?: string
  /** Callback when key is pressed - start recording */
  onStart: () => void
  /** Callback when key is released - stop recording */
  onStop: () => void
  /** Whether to stop any ongoing TTS when starting */
  onStopSpeaking?: () => void
  /** Whether push-to-talk is enabled */
  enabled?: boolean
}

/**
 * Push-to-talk hook for voice input.
 *
 * Hold the configured key (default: Y) to record voice.
 * Release to send the transcript.
 *
 * Works globally via document-level event listeners, so it functions
 * even when the window is minimized or unfocused (issue #55).
 */
export function usePushToTalk({
  key = 'y',
  onStart,
  onStop,
  onStopSpeaking,
  enabled = true,
}: UsePushToTalkOptions) {
  // Track if key is currently held (prevents auto-repeat)
  const isHeldRef = useRef(false)

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Check if it's our trigger key (case-insensitive)
      if (event.key.toLowerCase() !== key.toLowerCase()) return

      // Ignore if typing in an input/textarea
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // Prevent auto-repeat from holding the key
      if (event.repeat || isHeldRef.current) return

      isHeldRef.current = true

      // Stop any ongoing TTS first
      onStopSpeaking?.()

      // Start recording
      onStart()
    },
    [enabled, key, onStart, onStopSpeaking]
  )

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Check if it's our trigger key
      if (event.key.toLowerCase() !== key.toLowerCase()) return

      // Only stop if we were holding
      if (!isHeldRef.current) return

      isHeldRef.current = false

      // Stop recording (triggers transcript send)
      onStop()
    },
    [enabled, key, onStop]
  )

  // Handle window blur (user switched away while holding key)
  const handleBlur = useCallback(() => {
    if (isHeldRef.current) {
      isHeldRef.current = false
      onStop()
    }
  }, [onStop])

  useEffect(() => {
    if (!enabled) return

    // Use document level for global capture
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [enabled, handleKeyDown, handleKeyUp, handleBlur])

  return {
    isHeld: isHeldRef.current,
  }
}
