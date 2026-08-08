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
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Coach Activity</h3>
        <span className="text-xs px-2 py-1 rounded-md bg-secondary/50 text-cyan-400">
          {labels[labelIndex]}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <VolumeX className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 relative">
            {/* Track background */}
            <div className="h-2 rounded-full bg-secondary/50" />
            {/* Filled track */}
            <div
              className="absolute top-0 left-0 h-2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
              style={{ width: `${value}%` }}
            />
            {/* Input */}
            <input
              type="range"
              min="0"
              max="100"
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              className={cn(
                'absolute inset-0 w-full h-2 appearance-none cursor-pointer bg-transparent',
                '[&::-webkit-slider-thumb]:appearance-none',
                '[&::-webkit-slider-thumb]:w-4',
                '[&::-webkit-slider-thumb]:h-4',
                '[&::-webkit-slider-thumb]:rounded-full',
                '[&::-webkit-slider-thumb]:bg-white',
                '[&::-webkit-slider-thumb]:shadow-lg',
                '[&::-webkit-slider-thumb]:shadow-cyan-500/30',
                '[&::-webkit-slider-thumb]:cursor-pointer',
                '[&::-webkit-slider-thumb]:transition-transform',
                '[&::-webkit-slider-thumb]:hover:scale-110',
                '[&::-webkit-slider-thumb]:border-2',
                '[&::-webkit-slider-thumb]:border-cyan-500'
              )}
            />
          </div>
          <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {value === 0
            ? "Dr. Zay stays quiet until you ask"
            : value < 50
              ? "Occasional tips when you might be stuck"
              : "Active guidance throughout your session"}
        </p>
      </div>
    </div>
  )
}
