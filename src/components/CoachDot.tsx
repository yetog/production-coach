import { cn } from '@/lib/utils'
import type { CoachState } from '@/types'

interface CoachDotProps {
  state: CoachState
  onClick?: () => void
  className?: string
}

const stateLabels: Record<CoachState, string> = {
  idle: 'Coach is ready',
  listening: 'Listening...',
  thinking: 'Thinking...',
  speaking: 'Speaking...',
}

export function CoachDot({ state, onClick, className }: CoachDotProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-full',
        'bg-card border border-border hover:border-primary/50',
        'transition-all duration-300',
        className
      )}
      title={stateLabels[state]}
    >
      <div className={cn('coach-dot', state)} />
      <span className="text-sm text-muted-foreground">
        {stateLabels[state]}
      </span>
    </button>
  )
}
