import { Music, Drum, Piano, Radio, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SessionState, DeviceInfo } from '@/types'

interface SessionStatusProps {
  session: SessionState
  className?: string
}

const deviceIcons: Record<string, typeof Music> = {
  beatbox8: Drum,
  beatbox9: Drum,
  machiniste: Drum,
  heisenberg: Piano,
  pulverisateur: Piano,
  bassline: Piano,
  default: Radio,
}

function getDeviceIcon(type: string) {
  return deviceIcons[type] || deviceIcons.default
}

function DeviceChip({ device }: { device: DeviceInfo }) {
  const Icon = getDeviceIcon(device.type)
  return (
    <div className="device-chip flex items-center gap-1.5">
      <Icon className="w-3 h-3" />
      <span>{device.displayName || device.type}</span>
    </div>
  )
}

export function SessionStatus({ session, className }: SessionStatusProps) {
  if (!session.connected) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2 text-sm">
          <WifiOff className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Not connected</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Open a project in Audiotool to connect
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Connection status */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Wifi className="w-4 h-4 text-green-400" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        </div>
        <span className="text-sm text-foreground">Connected</span>
      </div>

      {/* BPM & Key */}
      <div className="flex gap-4">
        {session.bpm && (
          <div className="px-3 py-2 rounded-lg bg-secondary/50 border border-border/50">
            <span className="text-xs text-muted-foreground">BPM</span>
            <p className="text-lg font-mono text-foreground">{session.bpm}</p>
          </div>
        )}
        {session.key && (
          <div className="px-3 py-2 rounded-lg bg-secondary/50 border border-border/50">
            <span className="text-xs text-muted-foreground">Key</span>
            <p className="text-lg font-mono text-foreground">{session.key}</p>
          </div>
        )}
      </div>

      {/* Devices */}
      {session.devices.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Devices ({session.devices.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {session.devices.map((device) => (
              <DeviceChip key={device.id} device={device} />
            ))}
          </div>
        </div>
      )}

      {session.devices.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No devices yet - let's add some!
        </p>
      )}

      {/* Regions */}
      {session.regions.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {session.regions.length} region{session.regions.length !== 1 ? 's' : ''} on
          timeline
        </p>
      )}
    </div>
  )
}
