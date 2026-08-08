import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles } from 'lucide-react'
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

export function ChatPanel({
  messages,
  onSendMessage,
  onApplyAction,
  isLoading,
  state,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden bg-gradient-to-b from-card/80 to-card border border-border/50 backdrop-blur-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-4">
          <DrZayAvatar state={state} size="md" />
          <div className="flex-1">
            <h2 className="font-semibold text-foreground text-lg">Dr. Zay</h2>
            <p className="text-sm text-muted-foreground">
              {state === 'idle' && 'Ready to help you produce'}
              {state === 'listening' && 'Listening...'}
              {state === 'thinking' && 'Thinking about your production...'}
              {state === 'speaking' && 'Sharing some thoughts...'}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3" />
            <span>AI Coach</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <DrZayAvatar state="idle" size="lg" className="mb-6" />
            <h3 className="text-xl font-medium text-foreground mb-2">
              What are we making today?
            </h3>
            <p className="text-muted-foreground max-w-sm">
              Tell me about the vibe you're going for, and I'll guide you through the
              production process step by step.
            </p>

            {/* Starter prompts */}
            <div className="flex flex-wrap gap-2 mt-6 justify-center max-w-md">
              {[
                'How do I start a beat?',
                'What synth should I use?',
                'Help me with my bassline',
                'My mix sounds muddy',
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSendMessage(prompt)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm',
                    'bg-secondary/50 text-secondary-foreground',
                    'border border-border/50',
                    'hover:bg-secondary hover:border-primary/30',
                    'transition-all duration-200'
                  )}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn('flex gap-3', message.role === 'user' && 'flex-row-reverse')}
          >
            {/* Avatar */}
            {message.role === 'coach' && <DrZayAvatar state="idle" size="sm" />}
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-xs font-medium text-white">You</span>
              </div>
            )}

            {/* Message content */}
            <div className="flex-1 max-w-[80%] space-y-2">
              <div
                className={cn(
                  'px-4 py-3 rounded-2xl',
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 ml-auto'
                    : 'bg-secondary/50 border border-border/50'
                )}
              >
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>
              </div>

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

        {isLoading && (
          <div className="flex gap-3">
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

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border/50 bg-card/30">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Dr. Zay about your production..."
            className={cn(
              'flex-1 px-5 py-3 text-sm rounded-xl',
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
              'px-5 py-3 rounded-xl',
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
