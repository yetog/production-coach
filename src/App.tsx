import { useState, useEffect } from 'react'
import { ChatPanel } from '@/components/ChatPanel'
import { ControlsSidebar } from '@/components/ControlsSidebar'
import { useNexus } from '@/hooks/useNexus'
import { useCoach } from '@/hooks/useCoach'
import { useVoice } from '@/hooks/useVoice'
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

  // Voice features
  const {
    speak,
    isSpeaking,
    voiceEnabled,
    setVoiceEnabled,
    startListening,
    stopListening,
    isListening,
    isSupported: voiceSupported,
  } = useVoice({
    onTranscript: (text) => {
      // When user finishes speaking, send the message
      sendMessage(text)
    },
    onSpeakingChange: () => {
      // Could update coach state here if needed
    },
  })

  // Speak new coach messages when voice is enabled
  useEffect(() => {
    if (!voiceEnabled) return

    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'coach' && lastMessage.id !== 'intro') {
      speak(lastMessage.content)
    }
  }, [messages, voiceEnabled, speak])

  // Sync voice setting with settings state
  useEffect(() => {
    setSettings(prev => ({ ...prev, voiceEnabled }))
  }, [voiceEnabled])

  const handleToggleVoice = () => {
    setVoiceEnabled(!voiceEnabled)
  }

  const handleToggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  // Determine effective coach state (override with speaking if TTS active)
  const effectiveState = isSpeaking ? 'speaking' : (isListening ? 'listening' : state)

  return (
    <div className="min-h-screen bg-background">
      {/* Gradient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main layout */}
      <div className="relative z-10 h-screen flex p-2 md:p-4 gap-2 md:gap-4">
        {/* Sidebar */}
        <ControlsSidebar
          goal={goal}
          checklist={checklist}
          session={session}
          settings={settings}
          onSetGoal={setProductionGoal}
          onToggleItem={toggleChecklistItem}
          onSettingsChange={setSettings}
        />

        {/* Chat - Hero */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatPanel
            messages={messages}
            onSendMessage={sendMessage}
            onApplyAction={applyAction}
            isLoading={isLoading}
            state={effectiveState}
            voiceEnabled={voiceEnabled}
            onToggleVoice={voiceSupported ? handleToggleVoice : undefined}
            isListening={isListening}
            onToggleListening={voiceSupported ? handleToggleListening : undefined}
          />

          {/* Footer - Hidden on mobile */}
          <footer className="hidden md:block text-center text-xs text-muted-foreground py-3">
            <p>
              Production Coach for{' '}
              <a
                href="https://audiotool.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline"
              >
                Audiotool
              </a>{' '}
              | NEXUS Hackathon 2026
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default App
