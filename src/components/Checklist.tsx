import { Check, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChecklistItem } from '@/types'

interface ChecklistProps {
  items: ChecklistItem[]
  onItemClick?: (item: ChecklistItem) => void
  className?: string
}

export function Checklist({ items, onItemClick, className }: ChecklistProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item, index) => (
        <button
          key={item.id}
          onClick={() => onItemClick?.(item)}
          className={cn(
            'w-full flex items-center gap-3 p-3 rounded-xl text-left',
            'transition-all duration-200 checklist-item',
            item.current && 'bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30',
            !item.current && !item.completed && 'hover:bg-secondary/50',
            item.completed && 'opacity-50'
          )}
        >
          {/* Step indicator */}
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
              'text-xs font-medium transition-all duration-200',
              item.completed && 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white',
              item.current && !item.completed && 'border-2 border-cyan-500 text-cyan-400',
              !item.current && !item.completed && 'border border-muted-foreground/50 text-muted-foreground'
            )}
          >
            {item.completed ? (
              <Check className="w-3.5 h-3.5" />
            ) : item.current ? (
              <ArrowRight className="w-3 h-3" />
            ) : (
              <span>{index + 1}</span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                'text-sm truncate',
                item.completed && 'line-through text-muted-foreground',
                item.current && 'text-foreground font-medium',
                !item.current && !item.completed && 'text-muted-foreground'
              )}
            >
              {item.label}
            </p>
            {item.current && item.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {item.description}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
