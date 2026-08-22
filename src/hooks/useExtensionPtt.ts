import { useEffect, useRef } from 'react'
import { PTT_EVENT, isExtensionMessage, togglePtt } from '@/lib/ptt-bridge'

interface UseExtensionPttOptions {
  /** Current mic state, so a toggle knows which way to flip. */
  isListening: boolean
  start: () => void
  stop: () => void
  /** Stop Dr. Zay talking when the user starts, mirroring the hold-Y hook. */
  onStopSpeaking?: () => void
  enabled?: boolean
}

/**
 * Listen for the push-to-talk extension's window event and toggle the mic
 * (issue #55). The companion extension fires this on Ctrl+Shift+Y even while
 * the DAW has focus; when the extension is not installed, nothing dispatches
 * the event and this hook is inert.
 *
 * A ref holds the latest callbacks so the listener is attached once and never
 * goes stale, and toggle direction is read at fire time from live state.
 */
export function useExtensionPtt({
  isListening,
  start,
  stop,
  onStopSpeaking,
  enabled = true,
}: UseExtensionPttOptions) {
  const latest = useRef({ isListening, start, stop, onStopSpeaking })
  latest.current = { isListening, start, stop, onStopSpeaking }

  useEffect(() => {
    if (!enabled) return

    const handler = () => {
      const current = latest.current
      if (togglePtt(current.isListening) === 'start') {
        current.onStopSpeaking?.()
        current.start()
      } else {
        current.stop()
      }
    }

    window.addEventListener(PTT_EVENT, handler)
    const messageHandler = (event: MessageEvent) => {
      if (isExtensionMessage(event.data)) handler()
    }
    window.addEventListener('message', messageHandler)
    return () => {
      window.removeEventListener(PTT_EVENT, handler)
      window.removeEventListener('message', messageHandler)
    }
  }, [enabled])
}
