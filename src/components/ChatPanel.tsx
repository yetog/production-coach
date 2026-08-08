import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage, CoachAction } from '@/types'

interface ChatPanelProps {
  messages: ChatMessage[]
  onSendMessage: (content: string) => void
  onApplyAction?: (action: CoachAction) => void
  isLoading?: boolean
}

export function ChatPanel({ messages, onSendMessage, onApplyAction, isLoading }: ChatPanelProps) {
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
    <div className="flex flex-col h-full bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-medium text-foreground">Dr. Zay</h2>
        <p className="text-xs text-muted-foreground">Your production coach</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">Ask me anything about your production.</p>
            <p className="text-xs mt-1">I can see what's in your session.</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="space-y-2">
            <div className={cn('chat-message', message.role === 'user' ? 'user' : 'coach')}>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>

            {/* Action Button */}
            {message.action && !message.action.applied && (
              <button
                onClick={() => onApplyAction?.(message.action!)}
                className={cn(
                  'ml-0 px-3 py-2 text-sm rounded-md',
                  'bg-primary/10 text-primary border border-primary/30',
                  'hover:bg-primary/20 transition-colors'
                )}
              >
                {message.action.label}
              </button>
            )}

            {message.action?.applied && (
              <span className="text-xs text-muted-foreground ml-0">
                ✓ Applied
              </span>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="chat-message coach">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your production..."
            className={cn(
              'flex-1 px-3 py-2 text-sm rounded-md',
              'bg-input text-foreground placeholder:text-muted-foreground',
              'border border-border focus:border-primary focus:outline-none',
              'transition-colors'
            )}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              'px-3 py-2 rounded-md',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
