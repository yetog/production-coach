import { cn } from '@/lib/utils'

interface QuickPromptsProps {
  onSelect: (prompt: string) => void
  hasGoal: boolean
  className?: string
}

const STARTER_PROMPTS = [
  'How do I start?',
  'Add drums',
  'Add a synth',
  'Mix tips',
]

const PRODUCTION_PROMPTS = [
  'Add bass',
  'Arrangement help',
  'Sound design tips',
  'Fix muddy mix',
]

export function QuickPrompts({ onSelect, hasGoal, className }: QuickPromptsProps) {
  const prompts = hasGoal ? PRODUCTION_PROMPTS : STARTER_PROMPTS

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {prompts.map((prompt) => (
        <button
          key={prompt}
          onClick={() => onSelect(prompt)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium',
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
  )
}
