import { cn } from '@/lib/utils'
import type { CoachState } from '@/types'

// Avatar image URLs hosted on IONOS S3
const S3_BASE = 'https://s3.us-central-1.ionoscloud.com/audiotools'

const AVATAR_IMAGES: Record<CoachState, string> = {
  idle: `${S3_BASE}/A9A7709C-5201-44A5-9BFA-B8AD30BD6544.png`,
  listening: `${S3_BASE}/3737FA40-A8A5-446A-ABF0-E91071E78B0C.png`,
  thinking: `${S3_BASE}/E0C16600-82CF-48FB-A967-47E01284BFF1.png`,
  speaking: `${S3_BASE}/AF32901C-542D-4A36-8948-7ECC2075F605.png`,
}

const STATE_LABELS: Record<CoachState, string> = {
  idle: 'Ready to coach',
  listening: 'Listening...',
  thinking: 'Thinking...',
  speaking: 'Speaking...',
}

const STATE_COLORS: Record<CoachState, string> = {
  idle: 'from-cyan-500 to-purple-500',
  listening: 'from-green-400 to-emerald-500',
  thinking: 'from-yellow-400 to-amber-500',
  speaking: 'from-cyan-400 to-blue-500',
}

interface HeroAvatarProps {
  state: CoachState
  className?: string
}

export function HeroAvatar({ state, className }: HeroAvatarProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {/* Avatar container with animated ring */}
      <div className="relative">
        {/* Outer glow */}
        <div
          className={cn(
            'absolute inset-0 rounded-full blur-xl opacity-50 transition-all duration-500',
            state === 'idle' && 'bg-gradient-to-br from-cyan-500/30 to-purple-500/30',
            state === 'listening' && 'bg-green-500/40 animate-pulse',
            state === 'thinking' && 'bg-yellow-500/40 animate-pulse',
            state === 'speaking' && 'bg-cyan-500/50 animate-pulse'
          )}
          style={{ transform: 'scale(1.2)' }}
        />

        {/* Animated ring */}
        <div
          className={cn(
            'absolute inset-0 rounded-full transition-all duration-500',
            'bg-gradient-to-br p-[3px]',
            STATE_COLORS[state],
            state !== 'idle' && 'animate-spin-slow'
          )}
          style={{ animationDuration: '8s' }}
        >
          <div className="w-full h-full rounded-full bg-slate-900" />
        </div>

        {/* Avatar image */}
        <div
          className={cn(
            'relative w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48',
            'rounded-full overflow-hidden',
            'bg-gradient-to-br from-slate-800 to-slate-900',
            'border-4 border-slate-800',
            'transition-transform duration-300',
            state !== 'idle' && 'scale-105'
          )}
        >
          <img
            src={AVATAR_IMAGES[state]}
            alt={`Dr. Zay - ${state}`}
            className="w-full h-full object-cover"
            loading="eager"
          />

          {/* Overlay for active states */}
          {state !== 'idle' && (
            <div
              className={cn(
                'absolute inset-0 mix-blend-overlay opacity-20',
                state === 'listening' && 'bg-green-500',
                state === 'thinking' && 'bg-yellow-500',
                state === 'speaking' && 'bg-cyan-500'
              )}
            />
          )}
        </div>

        {/* Ping animation for active states */}
        {state !== 'idle' && (
          <div
            className={cn(
              'absolute inset-0 rounded-full animate-ping opacity-30',
              state === 'listening' && 'bg-green-500',
              state === 'thinking' && 'bg-yellow-500',
              state === 'speaking' && 'bg-cyan-500'
            )}
            style={{ animationDuration: '2s' }}
          />
        )}
      </div>

      {/* Name and status */}
      <div className="text-center">
        <h1
          className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
        >
          Dr. Zay
        </h1>
        <p
          className={cn(
            'text-sm md:text-base font-medium transition-colors duration-300',
            state === 'idle' && 'text-muted-foreground',
            state === 'listening' && 'text-green-400',
            state === 'thinking' && 'text-yellow-400',
            state === 'speaking' && 'text-cyan-400'
          )}
        >
          {STATE_LABELS[state]}
        </p>
      </div>

      {/* Audio visualizer bars for speaking state */}
      {state === 'speaking' && (
        <div className="flex items-end gap-1 h-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-gradient-to-t from-cyan-500 to-purple-500 rounded-full animate-pulse"
              style={{
                height: `${Math.random() * 16 + 8}px`,
                animationDelay: `${i * 100}ms`,
                animationDuration: '0.5s',
              }}
            />
          ))}
        </div>
      )}

      {/* Microphone icon for listening state */}
      {state === 'listening' && (
        <div className="flex items-center gap-2 text-green-400">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium uppercase tracking-wider">Recording</span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      )}
    </div>
  )
}
