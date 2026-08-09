import { useState } from 'react'
import { ChevronUp, Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChecklistItem } from '@/types'

interface MiniChecklistProps {
  items: ChecklistItem[]
  onToggle: (id: number) => void
  className?: string
}

export function MiniChecklist({ items, onToggle, className }: MiniChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const completedCount = items.filter((item) => item.completed).length
  const progress = Math.round((completedCount / items.length) * 100)

  // Show only first 3 items when collapsed
  const visibleItems = isExpanded ? items : items.slice(0, 3)

  return (
    <div className={cn('rounded-xl bg-card/50 border border-border/50', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Progress</span>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{items.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Progress bar */}
          <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <ChevronUp
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform',
              !isExpanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Checklist items */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          isExpanded ? 'max-h-[400px]' : 'max-h-[120px]'
        )}
      >
        <div className="px-3 pb-3 space-y-1">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onToggle(item.id)}
              className={cn(
                'w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all',
                'hover:bg-secondary/30',
                item.completed && 'opacity-60'
              )}
            >
              <div
                className={cn(
                  'w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors',
                  item.completed
                    ? 'bg-green-500 border-green-500'
                    : item.current
                    ? 'border-cyan-500 bg-cyan-500/20'
                    : 'border-muted-foreground/30'
                )}
              >
                {item.completed && <Check className="w-2.5 h-2.5 text-white" />}
                {!item.completed && item.current && (
                  <Circle className="w-2 h-2 text-cyan-400 fill-cyan-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-xs font-medium truncate',
                    item.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                  )}
                >
                  {item.label}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Show more indicator */}
      {!isExpanded && items.length > 3 && (
        <div className="px-3 pb-2">
          <p className="text-[10px] text-muted-foreground text-center">
            +{items.length - 3} more steps
          </p>
        </div>
      )}
    </div>
  )
}
