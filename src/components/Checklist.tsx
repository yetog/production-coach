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
    <div className={cn('p-4 bg-card rounded-lg border border-border', className)}>
      <h3 className="text-sm font-medium text-foreground mb-3">Production Checklist</h3>

      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick?.(item)}
            className={cn(
              'w-full flex items-center gap-3 p-2 rounded-md text-left',
              'transition-colors',
              item.current && 'bg-primary/10 border border-primary/30',
              !item.current && !item.completed && 'hover:bg-secondary',
              item.completed && 'opacity-60'
            )}
          >
            {/* Icon */}
            <div className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
              item.completed && 'bg-primary text-primary-foreground',
              item.current && !item.completed && 'border-2 border-primary',
              !item.current && !item.completed && 'border border-muted-foreground'
            )}>
              {item.completed && <Check className="w-3 h-3" />}
              {item.current && !item.completed && <ArrowRight className="w-3 h-3 text-primary" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm truncate',
                item.completed && 'line-through text-muted-foreground',
                item.current && 'text-foreground font-medium',
                !item.current && !item.completed && 'text-muted-foreground'
              )}>
                {item.label}
              </p>
              {item.current && (
                <p className="text-xs text-muted-foreground">{item.description}</p>
              )}
            </div>

            {/* Step number */}
            <span className="text-xs text-muted-foreground font-mono">
              {item.id}/9
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
