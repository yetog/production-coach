import { cn } from '@/lib/utils'
import type { CoachState } from '@/types'

interface DrZayAvatarProps {
  state: CoachState
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function DrZayAvatar({ state, size = 'md', className }: DrZayAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
  }

  const glowClasses = {
    idle: '',
    listening: 'shadow-[0_0_20px_rgba(34,197,94,0.5)]',
    thinking: 'shadow-[0_0_20px_rgba(234,179,8,0.5)]',
    speaking: 'shadow-[0_0_25px_rgba(6,182,212,0.6)]',
  }

  return (
    <div
      className={cn(
        'relative rounded-full bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 p-[2px]',
        'transition-all duration-500',
        glowClasses[state],
        className
      )}
    >
      <div
        className={cn(
          'rounded-full bg-card flex items-center justify-center overflow-hidden',
          sizeClasses[size]
        )}
      >
        {/* Stylized "DZ" initials */}
        <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
          <span
            className={cn(
              'font-bold tracking-tight',
              size === 'sm' && 'text-xs',
              size === 'md' && 'text-lg',
              size === 'lg' && 'text-2xl'
            )}
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #a855f7 50%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            DZ
          </span>

          {/* Animated ring for active states */}
          {state !== 'idle' && (
            <div
              className={cn(
                'absolute inset-0 rounded-full border-2 animate-ping opacity-30',
                state === 'listening' && 'border-green-500',
                state === 'thinking' && 'border-yellow-500',
                state === 'speaking' && 'border-cyan-500'
              )}
            />
          )}
        </div>
      </div>

      {/* Status indicator dot */}
      <div
        className={cn(
          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card',
          state === 'idle' && 'bg-slate-500',
          state === 'listening' && 'bg-green-500 animate-pulse',
          state === 'thinking' && 'bg-yellow-500 animate-pulse',
          state === 'speaking' && 'bg-cyan-500 animate-pulse'
        )}
      />
    </div>
  )
}
