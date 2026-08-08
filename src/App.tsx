import { useState } from 'react'
import { Settings } from 'lucide-react'
import { CoachDot } from '@/components/CoachDot'
import { ChatPanel } from '@/components/ChatPanel'
import { SessionStatus } from '@/components/SessionStatus'
import { Checklist } from '@/components/Checklist'
import { ChattinessSlider } from '@/components/ChattinessSlider'
import { GoalInput } from '@/components/GoalInput'
import { useNexus } from '@/hooks/useNexus'
import { useCoach } from '@/hooks/useCoach'
import { cn } from '@/lib/utils'
import type { CoachSettings } from '@/types'

function App() {
  const { session, addDevice } = useNexus()
  const {
    messages,
    checklist,
    goal,
    state,
    isLoading,
    setProductionGoal,
    sendMessage,
    applyAction,
    toggleChecklistItem,
  } = useCoach({ session, onAddDevice: addDevice })

  const [settings, setSettings] = useState<CoachSettings>({
    chattiness: 50,
    voiceEnabled: false,
    persona: 'dr-zay',
  })
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">
              Production Coach
            </h1>
            <CoachDot state={state} />
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              'p-2 rounded-md',
              'hover:bg-secondary transition-colors',
              showSettings && 'bg-secondary'
            )}
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </header>

        {/* Settings Panel (collapsible) */}
        {showSettings && (
          <ChattinessSlider
            value={settings.chattiness}
            onChange={(chattiness) => setSettings(prev => ({ ...prev, chattiness }))}
          />
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column: Goal + Checklist + Session */}
          <div className="space-y-4">
            <GoalInput
              onSubmit={setProductionGoal}
              initialGoal={goal || undefined}
            />

            {goal && (
              <Checklist
                items={checklist}
                onItemClick={(item) => toggleChecklistItem(item.id)}
              />
            )}

            <SessionStatus session={session} />
          </div>

          {/* Right Column: Chat (spans 2 columns on large screens) */}
          <div className="lg:col-span-2 h-[600px]">
            <ChatPanel
              messages={messages}
              onSendMessage={sendMessage}
              onApplyAction={applyAction}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground pt-4">
          <p>Production Coach for Audiotool | NEXUS Hackathon 2026</p>
        </footer>
      </div>
    </div>
  )
}

export default App
