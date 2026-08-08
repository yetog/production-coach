import { useState } from 'react'
import { Sparkles, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GoalInputProps {
  onSubmit: (goal: string) => void
  initialGoal?: string
  className?: string
}

const suggestions = [
  'Dark, soulful house that feels cinematic',
  'Lo-fi hip hop with jazzy chords',
  'Hard-hitting trap with melodic elements',
  'Ambient electronic with evolving textures',
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
          'w-full p-4 bg-card rounded-lg border border-border',
          'text-left hover:border-primary/50 transition-colors',
          className
        )}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Sparkles className="w-3 h-3" />
          <span>Your Goal</span>
        </div>
        <p className="text-sm text-foreground">{initialGoal}</p>
      </button>
    )
  }

  return (
    <div className={cn('p-4 bg-card rounded-lg border border-border', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">What do you want to create?</h3>
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Describe the vibe, genre, or mood..."
          rows={2}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-md resize-none',
            'bg-input text-foreground placeholder:text-muted-foreground',
            'border border-border focus:border-primary focus:outline-none',
            'transition-colors'
          )}
        />

        {/* Suggestions */}
        <div className="flex flex-wrap gap-2 mt-3">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setGoal(suggestion)}
              className={cn(
                'px-2 py-1 text-xs rounded-md',
                'bg-secondary text-secondary-foreground',
                'hover:bg-secondary/80 transition-colors'
              )}
            >
              {suggestion.slice(0, 25)}...
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={!goal.trim()}
          className={cn(
            'w-full mt-3 px-4 py-2 rounded-md',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors flex items-center justify-center gap-2'
          )}
        >
          <span>Start Coaching</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
