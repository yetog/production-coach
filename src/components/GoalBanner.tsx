import { Target, Music, Gauge, Piano } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SessionState } from '@/types'

interface GoalBannerProps {
  goal: string
  session: SessionState
  className?: string
}

export function GoalBanner({ goal, session, className }: GoalBannerProps) {
  return (
    <div
      className={cn(
        'p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 via-purple-500/5 to-pink-500/10',
        'border border-cyan-500/20',
        className
      )}
    >
      {/* Goal */}
      <div className="flex items-start gap-2 mb-2">
        <Target className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm font-medium text-foreground line-clamp-2">{goal}</p>
      </div>

      {/* Session Info */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {session.bpm && (
          <div className="flex items-center gap-1">
            <Gauge className="w-3 h-3" />
            <span>{session.bpm} BPM</span>
          </div>
        )}
        {session.key && (
          <div className="flex items-center gap-1">
            <Piano className="w-3 h-3" />
            <span>{session.key}</span>
          </div>
        )}
        {session.devices.length > 0 && (
          <div className="flex items-center gap-1">
            <Music className="w-3 h-3" />
            <span>{session.devices.length} device{session.devices.length !== 1 ? 's' : ''}</span>
          </div>
        )}
        {!session.bpm && !session.key && session.devices.length === 0 && (
          <span className="italic">No session data yet</span>
        )}
      </div>
    </div>
  )
}
