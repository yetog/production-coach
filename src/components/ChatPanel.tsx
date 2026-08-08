import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DrZayAvatar } from './DrZayAvatar'
import type { ChatMessage, CoachAction, CoachState } from '@/types'

interface ChatPanelProps {
  messages: ChatMessage[]
  onSendMessage: (content: string) => void
  onApplyAction?: (action: CoachAction) => void
  isLoading?: boolean
  state: CoachState
}

const STARTER_PROMPTS = [
  'How do I start a beat?',
  'What synth should I use?',
  'Help me with my bassline',
  'My mix sounds muddy',
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
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [showScrollButton, setShowScrollButton] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  // Check if we should show starter prompts (only intro message, no user messages yet)
  const showStarterPrompts = messages.length <= 1 && !messages.some((m) => m.role === 'user')

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden bg-gradient-to-b from-card/80 to-card border border-border/50 backdrop-blur-sm">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-3 md:gap-4">
          <DrZayAvatar state={state} size="md" />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground text-lg">Dr. Zay</h2>
            <p className="text-sm text-muted-foreground truncate">
              {state === 'idle' && 'Ready to help you produce'}
              {state === 'listening' && 'Listening...'}
              {state === 'thinking' && 'Thinking about your production...'}
              {state === 'speaking' && 'Sharing some thoughts...'}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3" />
            <span>AI Coach</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 relative"
      >
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
              message.role === 'user' && 'flex-row-reverse'
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Avatar */}
            {message.role === 'coach' && <DrZayAvatar state="idle" size="sm" className="flex-shrink-0" />}
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-white">You</span>
              </div>
            )}

            {/* Message content */}
            <div className={cn('flex-1 max-w-[85%] md:max-w-[80%] space-y-2', message.role === 'user' && 'flex flex-col items-end')}>
              <div
                className={cn(
                  'px-4 py-3 rounded-2xl',
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30'
                    : 'bg-secondary/50 border border-border/50'
                )}
              >
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>
              </div>

              {/* Timestamp */}
              <span className="text-[10px] text-muted-foreground/60 px-2">
                {formatTime(message.timestamp)}
              </span>

              {/* Action Button */}
              {message.action && !message.action.applied && (
                <button
                  onClick={() => onApplyAction?.(message.action!)}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm',
                    'bg-gradient-to-r from-cyan-500/10 to-purple-500/10',
                    'border border-cyan-500/30',
                    'text-foreground',
                    'hover:from-cyan-500/20 hover:to-purple-500/20',
                    'transition-all duration-200'
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
                  Applied to session
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Starter prompts - show after intro message */}
        {showStarterPrompts && (
          <div className="flex flex-col items-center py-6 animate-in fade-in duration-500 delay-300">
            <p className="text-sm text-muted-foreground mb-4">Try asking:</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSendMessage(prompt)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm',
                    'bg-secondary/50 text-secondary-foreground',
                    'border border-border/50',
                    'hover:bg-secondary hover:border-cyan-500/30',
                    'transition-all duration-200'
                  )}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <DrZayAvatar state="thinking" size="sm" />
            <div className="px-4 py-3 rounded-2xl bg-secondary/50 border border-border/50">
              <div className="flex gap-1.5">
                <span
                  className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
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
            'absolute bottom-20 right-6 z-10',
            'w-10 h-10 rounded-full',
            'bg-card/90 backdrop-blur-sm border border-border',
            'flex items-center justify-center',
            'hover:bg-secondary transition-all duration-200',
            'shadow-lg',
            'animate-in fade-in zoom-in duration-200'
          )}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </button>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 md:p-4 border-t border-border/50 bg-card/30">
        <div className="flex gap-2 md:gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Dr. Zay about your production..."
            className={cn(
              'flex-1 px-4 md:px-5 py-3 text-sm rounded-xl',
              'bg-secondary/50 text-foreground placeholder:text-muted-foreground',
              'border border-border/50 focus:border-cyan-500/50 focus:outline-none',
              'transition-all duration-200'
            )}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              'px-4 md:px-5 py-3 rounded-xl',
              'bg-gradient-to-r from-cyan-500 to-purple-500',
              'text-white font-medium',
              'hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all duration-200',
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
