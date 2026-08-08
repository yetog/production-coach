import { useState } from 'react'
import { ChevronLeft, ChevronRight, Target, Settings, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Checklist } from './Checklist'
import { GoalInput } from './GoalInput'
import { ChattinessSlider } from './ChattinessSlider'
import { SessionStatus } from './SessionStatus'
import type { ChecklistItem, CoachSettings, SessionState } from '@/types'

interface ControlsSidebarProps {
  goal: string | null
  checklist: ChecklistItem[]
  session: SessionState
  settings: CoachSettings
  onSetGoal: (goal: string) => void
  onToggleItem: (id: number) => void
  onSettingsChange: (settings: CoachSettings) => void
}

type Tab = 'goal' | 'settings'

export function ControlsSidebar({
  goal,
  checklist,
  session,
  settings,
  onSetGoal,
  onToggleItem,
  onSettingsChange,
}: ControlsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('goal')

  const completedCount = checklist.filter((item) => item.completed).length

  return (
    <div
      className={cn(
        'relative flex flex-col h-full transition-all duration-300 ease-out',
        isCollapsed ? 'w-14' : 'w-80'
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          'absolute -right-3 top-6 z-10',
          'w-6 h-6 rounded-full',
          'bg-card border border-border',
          'flex items-center justify-center',
          'hover:bg-secondary transition-colors',
          'shadow-lg'
        )}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Sidebar content */}
      <div
        className={cn(
          'flex-1 h-full rounded-xl overflow-hidden',
          'bg-card/50 backdrop-blur-sm border border-border/50'
        )}
      >
        {isCollapsed ? (
          // Collapsed view - just icons
          <div className="flex flex-col items-center gap-4 py-4">
            <button
              onClick={() => {
                setActiveTab('goal')
                setIsCollapsed(false)
              }}
              className={cn(
                'p-2 rounded-lg transition-colors',
                'hover:bg-secondary'
              )}
              title="Goal & Progress"
            >
              <Target className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Progress indicator */}
            {goal && (
              <div className="relative w-8 h-8">
                <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="3"
                  />
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    strokeDasharray={`${(completedCount / 9) * 88} 88`}
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-mono text-muted-foreground">
                  {completedCount}
                </span>
              </div>
            )}

            <button
              onClick={() => {
                setActiveTab('settings')
                setIsCollapsed(false)
              }}
              className={cn(
                'p-2 rounded-lg transition-colors',
                'hover:bg-secondary'
              )}
              title="Settings"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        ) : (
          // Expanded view
          <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-border/50">
              <button
                onClick={() => setActiveTab('goal')}
                className={cn(
                  'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                  'flex items-center justify-center gap-2',
                  activeTab === 'goal'
                    ? 'text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <ListChecks className="w-4 h-4" />
                Progress
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={cn(
                  'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                  'flex items-center justify-center gap-2',
                  activeTab === 'settings'
                    ? 'text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeTab === 'goal' && (
                <>
                  <GoalInput onSubmit={onSetGoal} initialGoal={goal || undefined} />

                  {goal && (
                    <>
                      {/* Progress bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="text-foreground font-mono">
                            {completedCount}/9
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
                            style={{ width: `${(completedCount / 9) * 100}%` }}
                          />
                        </div>
                      </div>

                      <Checklist
                        items={checklist}
                        onItemClick={(item) => onToggleItem(item.id)}
                        className="bg-transparent border-0 p-0"
                      />
                    </>
                  )}

                  <SessionStatus session={session} className="bg-transparent border-0 p-0" />
                </>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <ChattinessSlider
                    value={settings.chattiness}
                    onChange={(chattiness) =>
                      onSettingsChange({ ...settings, chattiness })
                    }
                  />

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Persona</label>
                    <div className="flex gap-2">
                      {['dr-zay', 'mentor', 'critic'].map((persona) => (
                        <button
                          key={persona}
                          onClick={() =>
                            onSettingsChange({ ...settings, persona: persona as any })
                          }
                          className={cn(
                            'px-3 py-2 rounded-lg text-sm capitalize',
                            'border transition-all',
                            settings.persona === persona
                              ? 'border-primary bg-primary/10 text-foreground'
                              : 'border-border text-muted-foreground hover:border-primary/50'
                          )}
                        >
                          {persona.replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
