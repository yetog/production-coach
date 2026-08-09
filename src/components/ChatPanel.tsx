import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, ChevronDown, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DrZayAvatar } from './DrZayAvatar'
import type { ChatMessage, CoachAction, CoachState } from '@/types'

interface ChatPanelProps {
  messages: ChatMessage[]
  onSendMessage: (content: string) => void
  onApplyAction?: (action: CoachAction) => void
  isLoading?: boolean
  state: CoachState
  voiceEnabled?: boolean
  onToggleVoice?: () => void
  isListening?: boolean
  onToggleListening?: () => void
}

const STARTER_PROMPTS = [
  'How do I start?',
  'Add drums',
  'Help with bass',
  'Mix sounds muddy',
]

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function ChatPanel({
  messages,
  onSendMessage,
  onApplyAction,
  isLoading,
  state,
  voiceEnabled = false,
  onToggleVoice,
  isListening = false,
  onToggleListening,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    })
  }

  // Check if scrolled away from bottom
  const handleScroll = () => {
    if (!messagesContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollButton(!isNearBottom)
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle mobile keyboard - scroll to bottom when input focused
  useEffect(() => {
    if (isInputFocused) {
      // Small delay to let keyboard open
      const timer = setTimeout(() => scrollToBottom(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isInputFocused])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim())
      setInput('')
      // Keep focus on mobile for quick follow-up
      inputRef.current?.focus()
    }
  }

  // Check if we should show starter prompts (only intro message, no user messages yet)
  const showStarterPrompts = messages.length <= 1 && !messages.some((m) => m.role === 'user')

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden bg-gradient-to-b from-card/80 to-card border border-border/50 backdrop-blur-sm">
      {/* Header - Compact on mobile */}
      <div className="px-3 md:px-6 py-3 md:py-4 border-b border-border/50 bg-card/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <DrZayAvatar state={state} size="sm" className="md:hidden" />
          <DrZayAvatar state={state} size="md" className="hidden md:block" />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground text-base md:text-lg">Dr. Zay</h2>
            <p className="text-xs md:text-sm text-muted-foreground truncate">
              {state === 'idle' && 'Ready to coach'}
              {state === 'listening' && 'Listening...'}
              {state === 'thinking' && 'Thinking...'}
              {state === 'speaking' && 'Speaking...'}
            </p>
          </div>

          {/* Voice toggle */}
          {onToggleVoice && (
            <button
              onClick={onToggleVoice}
              className={cn(
                'p-2 rounded-lg transition-colors',
                voiceEnabled
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
              )}
              title={voiceEnabled ? 'Voice on' : 'Voice off'}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Messages - Flexible height */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-6 min-h-0"
      >
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-2 md:gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
              message.role === 'user' && 'flex-row-reverse'
            )}
            style={{ animationDelay: `${Math.min(index * 50, 200)}ms` }}
          >
            {/* Avatar - Hidden on mobile for user messages to save space */}
            {message.role === 'coach' && (
              <DrZayAvatar state="idle" size="sm" className="flex-shrink-0" />
            )}
            {message.role === 'user' && (
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] md:text-xs font-medium text-white">You</span>
              </div>
            )}

            {/* Message content */}
            <div className={cn(
              'flex-1 max-w-[88%] md:max-w-[80%] space-y-1 md:space-y-2',
              message.role === 'user' && 'flex flex-col items-end'
            )}>
              <div
                className={cn(
                  'px-3 md:px-4 py-2 md:py-3 rounded-2xl',
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30'
                    : 'bg-secondary/50 border border-border/50'
                )}
              >
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>
              </div>

              {/* Timestamp - Smaller on mobile */}
              <span className="text-[9px] md:text-[10px] text-muted-foreground/60 px-1 md:px-2">
                {formatTime(message.timestamp)}
              </span>

              {/* Action Button */}
              {message.action && !message.action.applied && (
                <button
                  onClick={() => onApplyAction?.(message.action!)}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-sm',
                    'bg-gradient-to-r from-cyan-500/10 to-purple-500/10',
                    'border border-cyan-500/30',
                    'text-foreground',
                    'hover:from-cyan-500/20 hover:to-purple-500/20',
                    'active:scale-95 transition-all duration-200'
                  )}
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
        ))}

        {/* Starter prompts - Compact on mobile */}
        {showStarterPrompts && (
          <div className="flex flex-col items-center py-4 md:py-6 animate-in fade-in duration-500 delay-300">
            <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">Try asking:</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm md:max-w-md">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSendMessage(prompt)}
                  className={cn(
                    'px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm',
                    'bg-secondary/50 text-secondary-foreground',
                    'border border-border/50',
                    'hover:bg-secondary hover:border-cyan-500/30',
                    'active:scale-95 transition-all duration-200'
                  )}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex gap-2 md:gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <DrZayAvatar state="thinking" size="sm" />
            <div className="px-3 md:px-4 py-2 md:py-3 rounded-2xl bg-secondary/50 border border-border/50">
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
          className={cn(
            'absolute bottom-24 md:bottom-20 right-4 md:right-6 z-10',
            'w-9 h-9 md:w-10 md:h-10 rounded-full',
            'bg-card/90 backdrop-blur-sm border border-border',
            'flex items-center justify-center',
            'hover:bg-secondary active:scale-95 transition-all duration-200',
            'shadow-lg'
          )}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </button>
      )}

      {/* Input - Sticky bottom with better mobile UX */}
      <form
        onSubmit={handleSubmit}
        className={cn(
          'p-2 md:p-4 border-t border-border/50 bg-card/80 backdrop-blur-sm flex-shrink-0',
          'safe-area-inset-bottom' // For iOS notch
        )}
      >
        <div className="flex gap-2 items-center">
          {/* Mic button for STT */}
          {onToggleListening && (
            <button
              type="button"
              onClick={onToggleListening}
              className={cn(
                'p-3 rounded-xl flex-shrink-0 transition-all duration-200',
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary'
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
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            placeholder={isListening ? "Listening..." : "Ask Dr. Zay..."}
            className={cn(
              'flex-1 px-4 py-3 text-base md:text-sm rounded-xl', // text-base prevents iOS zoom
              'bg-secondary/50 text-foreground placeholder:text-muted-foreground',
              'border border-border/50 focus:border-cyan-500/50 focus:outline-none',
              'transition-all duration-200',
              isListening && 'border-red-500/50'
            )}
            disabled={isLoading || isListening}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              'p-3 rounded-xl flex-shrink-0',
              'bg-gradient-to-r from-cyan-500 to-purple-500',
              'text-white font-medium',
              'hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
              'active:scale-95 transition-all duration-200',
              'shadow-lg shadow-cyan-500/20'
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
