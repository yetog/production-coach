import { Music, Drum, Piano, Radio } from 'lucide-react'
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
      <div className={cn('p-4 bg-card rounded-lg border border-border', className)}>
        <div className="text-center text-muted-foreground">
          <Radio className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Not connected to Audiotool</p>
          <p className="text-xs mt-1">Open a project to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('p-4 bg-card rounded-lg border border-border space-y-4', className)}>
      <h3 className="text-sm font-medium text-foreground">Session</h3>

      {/* BPM & Key */}
      <div className="flex gap-4 text-sm">
        {session.bpm && (
          <div>
            <span className="text-muted-foreground">BPM: </span>
            <span className="text-foreground font-mono">{session.bpm}</span>
          </div>
        )}
        {session.key && (
          <div>
            <span className="text-muted-foreground">Key: </span>
            <span className="text-foreground font-mono">{session.key}</span>
          </div>
        )}
      </div>

      {/* Devices */}
      {session.devices.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">
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
        <p className="text-xs text-muted-foreground">
          No devices yet. Ask me what to add!
        </p>
      )}

      {/* Regions */}
      {session.regions.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground">
            {session.regions.length} region{session.regions.length !== 1 ? 's' : ''} in timeline
          </p>
        </div>
      )}
    </div>
  )
}
