import { useState, useRef, useEffect } from 'react'
import { Send, Mic, MicOff, Volume2, VolumeX, Sparkles, RotateCcw, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HeroAvatar } from '@/components/HeroAvatar'
import { useNexus } from '@/hooks/useNexus'
import { useCoach } from '@/hooks/useCoach'
import { useVoice } from '@/hooks/useVoice'
import type { ChatMessage, CoachAction } from '@/types'

function App() {
  const { session, addDevice } = useNexus()
  const [voiceEnabled, setVoiceEnabled] = useState(false)

  const {
    messages,
    goal,
    state,
    isLoading,
    isSpeaking,
    setProductionGoal,
    sendMessage,
    applyAction,
    clearConversation,
  } = useCoach({ session, onAddDevice: addDevice, voiceEnabled })

  // STT with Web Speech API
  const {
    startListening,
    stopListening,
    isListening,
    isSupported: sttSupported,
  } = useVoice({
    onTranscript: (text) => sendMessage(text),
    onSpeakingChange: () => {},
  })

  const [input, setInput] = useState('')
  const [showScrollButton, setShowScrollButton] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Determine effective state
  const effectiveState = isSpeaking ? 'speaking' : isListening ? 'listening' : state

  // Scroll handling
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }

  const handleScroll = () => {
    if (!messagesContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100)
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      sendMessage(input.trim())
      setInput('')
      inputRef.current?.focus()
    }
  }

  const handleToggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  // Check if we should show goal input
  const showGoalInput = !goal && messages.length <= 1

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col max-w-2xl mx-auto w-full p-4 gap-4">
        {/* Header with controls */}
        <header className="flex items-center justify-between">
          <h1 className="text-sm font-medium text-muted-foreground">Production Coach</h1>
          <div className="flex items-center gap-2">
            {/* Voice toggle */}
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={cn(
                'p-2 rounded-lg transition-all',
                voiceEnabled
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
              )}
              title={voiceEnabled ? 'Voice enabled' : 'Voice disabled'}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Reset button */}
            <button
              onClick={clearConversation}
              className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground transition-all"
              title="Reset conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Hero Avatar - Always visible at top */}
        <div className="flex-shrink-0 py-4">
          <HeroAvatar state={effectiveState} />
        </div>

        {/* Goal input (shown initially) */}
        {showGoalInput && (
          <div className="flex-shrink-0 px-4 py-6 rounded-2xl bg-gradient-to-br from-card/80 to-card border border-border/50">
            <h2 className="text-lg font-semibold text-foreground mb-2">What's your production goal?</h2>
            <p className="text-sm text-muted-foreground mb-4">Tell me what you want to create today</p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const goalInput = form.elements.namedItem('goal') as HTMLInputElement
                if (goalInput.value.trim()) {
                  setProductionGoal(goalInput.value.trim())
                  goalInput.value = ''
                }
              }}
              className="flex gap-2"
            >
              <input
                name="goal"
                type="text"
                placeholder="e.g., Lo-fi beat with chill vibes"
                className="flex-1 px-4 py-3 text-base rounded-xl bg-secondary/50 text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-cyan-500/50 focus:outline-none"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 transition-all"
              >
                Start
              </button>
            </form>
          </div>
        )}

        {/* Chat messages */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto space-y-4 min-h-0 px-1"
        >
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              onApplyAction={applyAction}
              index={index}
            />
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">DZ</span>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-secondary/50 border border-border/50">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={() => scrollToBottom()}
            className="absolute bottom-24 right-6 w-10 h-10 rounded-full bg-card/90 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-secondary transition-all shadow-lg"
          >
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </button>
        )}

        {/* Input area */}
        <form onSubmit={handleSubmit} className="flex-shrink-0 safe-area-inset-bottom">
          <div className="flex gap-2 items-center p-2 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50">
            {/* Mic button */}
            {sttSupported && (
              <button
                type="button"
                onClick={handleToggleListening}
                className={cn(
                  'p-3 rounded-xl flex-shrink-0 transition-all',
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                )}
              >
                {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
            )}

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? 'Listening...' : 'Ask Dr. Zay...'}
              className={cn(
                'flex-1 px-4 py-3 text-base rounded-xl bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none',
                isListening && 'opacity-50'
              )}
              disabled={isLoading || isListening}
            />

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground py-2">
          Production Coach for{' '}
          <a href="https://audiotool.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
            Audiotool
          </a>{' '}
          | NEXUS Hackathon 2026
        </footer>
      </div>
    </div>
  )
}

// Message bubble component
function MessageBubble({
  message,
  onApplyAction,
  index,
}: {
  message: ChatMessage
  onApplyAction?: (action: CoachAction) => void
  index: number
}) {
  const isCoach = message.role === 'coach'

  return (
    <div
      className={cn(
        'flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
        !isCoach && 'flex-row-reverse'
      )}
      style={{ animationDelay: `${Math.min(index * 50, 200)}ms` }}
    >
      {/* Avatar */}
      {isCoach ? (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-white">DZ</span>
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-medium text-white">You</span>
        </div>
      )}

      {/* Content */}
      <div className={cn('flex-1 max-w-[85%] space-y-2', !isCoach && 'flex flex-col items-end')}>
        <div
          className={cn(
            'px-4 py-3 rounded-2xl',
            isCoach
              ? 'bg-secondary/50 border border-border/50'
              : 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30'
          )}
        >
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground/60 px-2">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>

        {/* Action button */}
        {message.action && !message.action.applied && (
          <button
            onClick={() => onApplyAction?.(message.action!)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 text-foreground hover:from-cyan-500/20 hover:to-purple-500/20 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            {message.action.label}
          </button>
        )}

        {message.action?.applied && (
          <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
            <span className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            </span>
            Applied
          </span>
        )}
      </div>
    </div>
  )
}

export default App
