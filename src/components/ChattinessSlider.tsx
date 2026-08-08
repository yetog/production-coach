import { Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChattinessSliderProps {
  value: number
  onChange: (value: number) => void
  className?: string
}

const labels = ['Silent', 'Minimal', 'Balanced', 'Chatty', 'Very Chatty']

export function ChattinessSlider({ value, onChange, className }: ChattinessSliderProps) {
  const labelIndex = Math.min(Math.floor(value / 25), 4)

  return (
    <div className={cn('p-4 bg-card rounded-lg border border-border', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Coach Chattiness</h3>
        <span className="text-xs text-muted-foreground">{labels[labelIndex]}</span>
      </div>

      <div className="flex items-center gap-3">
        <VolumeX className="w-4 h-4 text-muted-foreground" />
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(
            'flex-1 h-2 rounded-full appearance-none cursor-pointer',
            'bg-secondary',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:w-4',
            '[&::-webkit-slider-thumb]:h-4',
            '[&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:bg-primary',
            '[&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-webkit-slider-thumb]:transition-transform',
            '[&::-webkit-slider-thumb]:hover:scale-110'
          )}
        />
        <Volume2 className="w-4 h-4 text-muted-foreground" />
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        {value === 0
          ? "Coach won't speak up on its own"
          : value < 50
          ? "Coach speaks up occasionally with key insights"
          : "Coach actively guides you through the process"}
      </p>
    </div>
  )
}
