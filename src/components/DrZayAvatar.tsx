import { cn } from '@/lib/utils'
import type { CoachState } from '@/types'

// Avatar image URLs - replace these with actual generated images
// For now, using placeholders that will fall back to initials
const AVATAR_IMAGES: Record<CoachState, string | null> = {
  idle: null,      // '/images/dr-zay-idle.png'
  listening: null, // '/images/dr-zay-listening.png'
  thinking: null,  // '/images/dr-zay-thinking.png'
  speaking: null,  // '/images/dr-zay-speaking.png'
}

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

  const innerSizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-11 h-11',
    lg: 'w-[76px] h-[76px]',
  }

  const glowClasses = {
    idle: '',
    listening: 'shadow-[0_0_20px_rgba(34,197,94,0.5)]',
    thinking: 'shadow-[0_0_20px_rgba(234,179,8,0.5)]',
    speaking: 'shadow-[0_0_25px_rgba(6,182,212,0.6)]',
  }

  const imageUrl = AVATAR_IMAGES[state] || AVATAR_IMAGES.idle

  return (
    <div
      className={cn(
        'relative rounded-full bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 p-[2px]',
        'transition-all duration-500',
        sizeClasses[size],
        glowClasses[state],
        className
      )}
    >
      <div
        className={cn(
          'rounded-full overflow-hidden flex items-center justify-center',
          'bg-gradient-to-br from-slate-900 to-slate-800',
          innerSizeClasses[size]
        )}
      >
        {imageUrl ? (
          // Custom image
          <img
            src={imageUrl}
            alt={`Dr. Zay - ${state}`}
            className="w-full h-full object-cover"
          />
        ) : (
          // Fallback: Stylized initials
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Afro silhouette background - fun placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={cn(
                  'rounded-full bg-gradient-to-b from-slate-700 to-slate-800',
                  size === 'sm' && 'w-6 h-5 -mt-1',
                  size === 'md' && 'w-9 h-7 -mt-1',
                  size === 'lg' && 'w-14 h-11 -mt-2'
                )}
              />
            </div>

            {/* Shades/visor effect */}
            <div
              className={cn(
                'absolute bg-gradient-to-r from-cyan-500/80 to-purple-500/80 rounded-sm',
                size === 'sm' && 'w-5 h-1.5 mt-0.5',
                size === 'md' && 'w-7 h-2 mt-1',
                size === 'lg' && 'w-12 h-3 mt-1'
              )}
            />

            {/* DZ Text below shades */}
            <span
              className={cn(
                'relative font-bold tracking-tight mt-2',
                size === 'sm' && 'text-[8px] mt-1.5',
                size === 'md' && 'text-[10px] mt-2',
                size === 'lg' && 'text-sm mt-3'
              )}
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #a855f7 50%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              DZ
            </span>
          </div>
        )}

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

      {/* Status indicator dot */}
      <div
        className={cn(
          'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-slate-900',
          size === 'sm' && 'w-2.5 h-2.5',
          size === 'md' && 'w-3 h-3',
          size === 'lg' && 'w-4 h-4',
          state === 'idle' && 'bg-slate-500',
          state === 'listening' && 'bg-green-500 animate-pulse',
          state === 'thinking' && 'bg-yellow-500 animate-pulse',
          state === 'speaking' && 'bg-cyan-500 animate-pulse'
        )}
      />
    </div>
  )
}

// Export function to update avatar URLs (can be called from settings)
export function setAvatarImages(images: Partial<Record<CoachState, string>>) {
  Object.assign(AVATAR_IMAGES, images)
}
