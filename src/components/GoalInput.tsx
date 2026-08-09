import { useState } from 'react'
import { Sparkles, ArrowRight, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GoalInputProps {
  onSubmit: (goal: string) => void
  initialGoal?: string
  className?: string
}

const suggestions = [
  'Dark, soulful house',
  'Lo-fi hip hop',
  'Hard trap beats',
  'Ambient electronic',
]

export function GoalInput({ onSubmit, initialGoal, className }: GoalInputProps) {
  const [goal, setGoal] = useState(initialGoal || '')
  const [isExpanded, setIsExpanded] = useState(!initialGoal)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (goal.trim()) {
      onSubmit(goal.trim())
      setIsExpanded(false)
    }
  }

  if (!isExpanded && initialGoal) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          'w-full p-4 rounded-xl text-left group',
          'bg-gradient-to-r from-cyan-500/10 to-purple-500/10',
          'border border-cyan-500/20',
          'hover:border-cyan-500/40 transition-all duration-200',
          className
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs text-cyan-400">
            <Sparkles className="w-3 h-3" />
            <span>Your Vibe</span>
          </div>
          <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-sm text-foreground font-medium">{initialGoal}</p>
      </button>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-medium text-foreground">What's the vibe?</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Describe the sound you're going for..."
          rows={2}
          className={cn(
            'w-full px-4 py-3 text-sm rounded-xl resize-none',
            'bg-secondary/50 text-foreground placeholder:text-muted-foreground',
            'border border-border/50 focus:border-cyan-500/50 focus:outline-none',
            'transition-all duration-200'
          )}
        />

        {/* Quick suggestions */}
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setGoal(suggestion)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-lg',
                'bg-secondary/50 text-muted-foreground',
                'border border-border/50',
                'hover:border-cyan-500/30 hover:text-foreground',
                'transition-all duration-200'
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={!goal.trim()}
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'bg-gradient-to-r from-cyan-500 to-purple-500',
            'text-white font-medium text-sm',
            'hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all duration-200',
            'flex items-center justify-center gap-2',
            'shadow-lg shadow-cyan-500/20'
          )}
        >
          <span>Let's Go</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
