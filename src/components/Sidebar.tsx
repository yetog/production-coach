import { useState } from 'react'
import {
  X,
  Volume2,
  VolumeX,
  Sliders,
  Trash2,
  Info,
  Zap,
  Music,
  Target,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CoachSettings } from '@/types'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  settings: CoachSettings
  onSettingsChange: (settings: CoachSettings) => void
  goal: string | null
  onClearGoal: () => void
  onClearConversation: () => void
  nexusConnected: boolean
}

export function Sidebar({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  goal,
  onClearGoal,
  onClearConversation,
  nexusConnected,
}: SidebarProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-card border-r border-border z-50',
          'transform transition-transform duration-300 ease-out',
          'flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Production Coach</h2>
              <p className="text-xs text-muted-foreground">by Dr. Zay</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Connection Status */}
          <div className="p-3 rounded-xl bg-secondary/50 border border-border">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-3 h-3 rounded-full',
                  nexusConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                )}
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {nexusConnected ? 'NEXUS Connected' : 'Demo Mode'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {nexusConnected ? 'Live session active' : 'No Audiotool session'}
                </p>
              </div>
              <Zap className={cn('w-4 h-4', nexusConnected ? 'text-green-400' : 'text-yellow-400')} />
            </div>
          </div>

          {/* Current Goal */}
          {goal && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Current Goal
                </span>
                <button
                  onClick={onClearGoal}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Change
                </button>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
                <div className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-foreground">{goal}</p>
                </div>
              </div>
            </div>
          )}

          {/* Voice Settings */}
          <div className="space-y-3">
            <button
              onClick={() => setActiveSection(activeSection === 'voice' ? null : 'voice')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium text-foreground">Voice Settings</span>
              </div>
              <ChevronRight
                className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform',
                  activeSection === 'voice' && 'rotate-90'
                )}
              />
            </button>

            {activeSection === 'voice' && (
              <div className="pl-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                {/* Voice Enable Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2">
                    {settings.voiceEnabled ? (
                      <Volume2 className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm text-foreground">Dr. Zay Voice</span>
                  </div>
                  <button
                    onClick={() =>
                      onSettingsChange({ ...settings, voiceEnabled: !settings.voiceEnabled })
                    }
                    className={cn(
                      'w-12 h-6 rounded-full transition-colors relative',
                      settings.voiceEnabled ? 'bg-cyan-500' : 'bg-secondary'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                        settings.voiceEnabled ? 'translate-x-7' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>

                {/* Chattiness Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Chattiness</span>
                    <span className="text-xs text-muted-foreground">{settings.chattiness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.chattiness}
                    onChange={(e) =>
                      onSettingsChange({ ...settings, chattiness: parseInt(e.target.value) })
                    }
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Concise</span>
                    <span>Detailed</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Coach Settings */}
          <div className="space-y-3">
            <button
              onClick={() => setActiveSection(activeSection === 'coach' ? null : 'coach')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Sliders className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium text-foreground">Coach Preferences</span>
              </div>
              <ChevronRight
                className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform',
                  activeSection === 'coach' && 'rotate-90'
                )}
              />
            </button>

            {activeSection === 'coach' && (
              <div className="pl-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                <p className="text-xs text-muted-foreground">
                  Choose how Dr. Zay coaches you
                </p>
                {[
                  { id: 'dr-zay', name: 'Dr. Zay', desc: 'Motivating, no-nonsense coach' },
                  { id: 'default', name: 'Classic', desc: 'Straightforward assistant' },
                ].map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() =>
                      onSettingsChange({ ...settings, persona: persona.id as 'dr-zay' | 'default' })
                    }
                    className={cn(
                      'w-full p-3 rounded-lg text-left transition-all',
                      settings.persona === persona.id
                        ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30'
                        : 'bg-secondary/30 border border-transparent hover:border-border'
                    )}
                  >
                    <p className="text-sm font-medium text-foreground">{persona.name}</p>
                    <p className="text-xs text-muted-foreground">{persona.desc}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-border">
            <button
              onClick={onClearConversation}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="w-5 h-5" />
              <span>Clear Conversation</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-4 h-4" />
            <span>NEXUS Hackathon 2026</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/60">Powered by</span>
            <span className="text-[10px] font-medium text-cyan-400">IONOS AI</span>
            <span className="text-[10px] text-muted-foreground/60">•</span>
            <span className="text-[10px] font-medium text-purple-400">ElevenLabs</span>
          </div>
        </div>
      </div>
    </>
  )
}
