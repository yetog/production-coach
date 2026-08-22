import { useState } from 'react'
import { Music, Drum, Piano, Radio, Wifi, WifiOff, Link } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SessionState, DeviceInfo } from '@/types'

interface SessionStatusProps {
  session: SessionState
  className?: string
  projectUrl?: string
  onProjectUrlChange?: (url: string) => void
  onRefresh?: () => void
  error?: string | null
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

export function SessionStatus({
  session,
  className,
  projectUrl = '',
  onProjectUrlChange,
  onRefresh,
  error,
}: SessionStatusProps) {
  const [inputValue, setInputValue] = useState(projectUrl)

  const handleConnect = () => {
    onProjectUrlChange?.(inputValue)
    // Trigger refresh after a short delay to allow state update
    setTimeout(() => onRefresh?.(), 100)
  }

  if (!session.connected) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2 text-sm">
          <WifiOff className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Not connected</span>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground block">
            Paste your Audiotool project URL:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="https://audiotool.com/studio?project=..."
              className="flex-1 px-2 py-1.5 text-xs rounded bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleConnect}
              disabled={!inputValue.trim()}
              className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Link className="w-3 h-3" />
              Connect
            </button>
          </div>
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Open a project in Audiotool, copy the URL from your browser
          </p>
        </div>
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
