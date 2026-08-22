import { useState, useRef, useEffect } from 'react'
import { Send, Mic, MicOff, Menu, Sparkles, ChevronDown, Zap, Link } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HeroAvatar } from '@/components/HeroAvatar'
import { Sidebar } from '@/components/Sidebar'
import { GoalBanner } from '@/components/GoalBanner'
import { QuickPrompts } from '@/components/QuickPrompts'
import { MiniChecklist } from '@/components/MiniChecklist'
import { CommandCenter } from '@/components/CommandCenter'
import { useNexus } from '@/hooks/useNexus'
import { useCoach } from '@/hooks/useCoach'
import { useVoice } from '@/hooks/useVoice'
import { usePushToTalk } from '@/hooks/usePushToTalk'
import { useExtensionPtt } from '@/hooks/useExtensionPtt'
import type { ChatMessage, CoachAction, CoachSettings } from '@/types'

// Dr. Zay avatar for chat bubbles
const DR_ZAY_AVATAR = 'https://s3.us-central-1.ionoscloud.com/audiotools/A9A7709C-5201-44A5-9BFA-B8AD30BD6544.png'

function App() {
  // The whole agent surface, not just session/addDevice: CommandCenter needs
  // plan/apply/undo to drive real DAW edits (#24).
  const agent = useNexus()
  const { session, addDevice, applyCommand, projectUrl, setProjectUrl, refreshDevices, error: agentError } = agent
  const [projectInput, setProjectInput] = useState(projectUrl)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settings, setSettings] = useState<CoachSettings>({
    chattiness: 50,
    voiceEnabled: false,
    persona: 'dr-zay',
  })

  const {
    messages,
    checklist,
    goal,
    state,
    isLoading,
    isSpeaking,
    setProductionGoal,
    sendMessage,
    applyAction,
    undoLastAction,
    toggleChecklistItem,
    clearConversation,
    stopSpeaking,
  } = useCoach({
    project: projectUrl,
    session,
    onAddDevice: addDevice,
    onApplyCommand: applyCommand,
    onApplyPlan: (command, planId) => agent.applyPlan(command, planId),
    onUndo: agent.undoLast,
    onPlan: agent.recordPlan,
    onRehydratePlan: agent.planCommand,
    voiceEnabled: settings.voiceEnabled,
  })

  // STT with Web Speech API
  const {
    startListening,
    stopListening,
    isListening,
    isSupported: sttSupported,
  } = useVoice({
    onTranscript: (text) => sendMessage(text),
    onSpeakingChange: () => {},
  })

  // Push-to-talk: Hold Y to record while the window is focused (issue #54).
  usePushToTalk({
    key: 'y',
    onStart: startListening,
    onStop: stopListening,
    onStopSpeaking: stopSpeaking,
    enabled: sttSupported && settings.voiceEnabled,
  })

  // Global push-to-talk via the companion extension: Ctrl+Shift+Y toggles the
  // mic even while the DAW has focus (issue #55). Inert without the extension.
  useExtensionPtt({
    isListening,
    start: startListening,
    stop: stopListening,
    onStopSpeaking: stopSpeaking,
    enabled: sttSupported && settings.voiceEnabled,
  })

  const [input, setInput] = useState('')
  const [showScrollButton, setShowScrollButton] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Determine effective state
  const effectiveState = isSpeaking ? 'speaking' : isListening ? 'listening' : state

  // Scroll handling
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }

  const handleScroll = () => {
    if (!messagesContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100)
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      sendMessage(input.trim())
      setInput('')
      inputRef.current?.focus()
    }
  }

  const handleToggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      // Stop Dr. Zay from speaking when user wants to talk
      if (isSpeaking) {
        stopSpeaking()
      }
      startListening()
    }
  }

  const handleClearGoal = () => {
    clearConversation()
  }

  // Check if we should show goal input
  const showGoalInput = !goal && messages.length <= 1

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
        goal={goal}
        onClearGoal={handleClearGoal}
        onClearConversation={clearConversation}
        nexusConnected={session.connected}
      />

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col max-w-2xl mx-auto w-full overflow-hidden">
        {/* Fixed Header with Avatar */}
        <header className="flex-shrink-0 bg-background/80 backdrop-blur-sm border-b border-border/30">
          {/* Top bar */}
          <div className="flex items-center justify-between p-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>

            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-foreground">Production Coach</h1>
            </div>

            {/* Connection indicator */}
            <div
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
                session.connected
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              )}
            >
              <Zap className="w-3 h-3" />
              <span className="hidden sm:inline">{session.connected ? 'Live' : 'Demo'}</span>
            </div>
          </div>

          {/* Avatar section - always visible */}
          <div className="px-4 pb-3">
            <HeroAvatar state={effectiveState} />
          </div>

          {/* Project URL input - show when not connected */}
          {!session.connected && (
            <div className="px-4 pb-3">
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <label className="text-xs text-yellow-400 block mb-2">
                  Connect to your Audiotool project:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={projectInput}
                    onChange={(e) => setProjectInput(e.target.value)}
                    placeholder="Paste your Audiotool studio URL..."
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-yellow-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setProjectUrl(projectInput)
                      setTimeout(() => refreshDevices(), 100)
                    }}
                    disabled={!projectInput.trim()}
                    className="px-4 py-2 text-sm rounded-lg bg-yellow-500 text-black font-medium hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Link className="w-4 h-4" />
                    Connect
                  </button>
                </div>
                {agentError && (
                  <p className="text-xs text-red-400 mt-2">{agentError}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Open your project in Audiotool, then copy the URL from your browser
                </p>
              </div>
            </div>
          )}

          {/* Goal Banner (shown after goal is set) */}
          {goal && !showGoalInput && (
            <div className="px-4 pb-3">
              <GoalBanner goal={goal} session={session} />
            </div>
          )}
        </header>

        {/* Producer command centre (#24): plan -> review -> apply -> undo
            against the real project, via the local agent bridge. */}
        <div className="flex-shrink-0 px-4 pb-3">
          <CommandCenter agent={agent} />
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Goal input (shown initially) */}
          {showGoalInput && (
            <div className="flex-shrink-0 px-4 py-4">
              <div className="px-4 py-6 rounded-2xl bg-gradient-to-br from-card/80 to-card border border-border/50">
                <h2 className="text-lg font-semibold text-foreground mb-2">What's your production goal?</h2>
                <p className="text-sm text-muted-foreground mb-4">Tell me what you want to create today</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const form = e.target as HTMLFormElement
                    const goalInput = form.elements.namedItem('goal') as HTMLInputElement
                    if (goalInput.value.trim()) {
                      setProductionGoal(goalInput.value.trim())
                      goalInput.value = ''
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    name="goal"
                    type="text"
                    placeholder="e.g., Lo-fi beat with chill vibes"
                    className="flex-1 px-4 py-3 text-base rounded-xl bg-secondary/50 text-foreground placeholder:text-muted-foreground border border-border/50 focus:border-cyan-500/50 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 transition-all"
                  >
                    Start
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Chat messages - scrollable */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-2 space-y-4"
          >
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                onApplyAction={applyAction}
                onUndo={() => undoLastAction(message.id)}
                index={index}
              />
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <img
                  src={DR_ZAY_AVATAR}
                  alt="Dr. Zay"
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 border-2 border-cyan-500/30"
                />
                <div className="px-4 py-3 rounded-2xl bg-secondary/50 border border-border/50">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button
              onClick={() => scrollToBottom()}
              className="absolute bottom-48 right-6 w-10 h-10 rounded-full bg-card/90 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-secondary transition-all shadow-lg z-20"
            >
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Fixed bottom section */}
        <div className="flex-shrink-0 px-4 pb-4 pt-2 space-y-3 bg-background/80 backdrop-blur-sm border-t border-border/30">
          {/* Mini Checklist */}
          {goal && (
            <MiniChecklist
              items={checklist}
              onToggle={toggleChecklistItem}
            />
          )}

          {/* Quick Prompts */}
          <QuickPrompts
            onSelect={sendMessage}
            hasGoal={!!goal}
          />

          {/* Input area */}
          <form onSubmit={handleSubmit} className="safe-area-inset-bottom">
            <div className="flex gap-2 items-center p-2 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50">
              {/* Mic button with push-to-talk hint */}
              {sttSupported && (
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleListening}
                    className={cn(
                      'p-3 rounded-xl transition-all',
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                    )}
                    title={settings.voiceEnabled ? 'Hold Y to talk' : 'Enable voice in settings'}
                  >
                    {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </button>
                  {/* Push-to-talk key hint */}
                  {settings.voiceEnabled && !isListening && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold bg-cyan-500 text-white rounded flex items-center justify-center">
                      Y
                    </span>
                  )}
                  {/* Recording indicator */}
                  {isListening && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping" />
                  )}
                </div>
              )}

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? 'Listening...' : 'Ask Dr. Zay...'}
                className={cn(
                  'flex-1 px-4 py-3 text-base rounded-xl bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none',
                  isListening && 'opacity-50'
                )}
                disabled={isLoading || isListening}
              />

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Message bubble component
function MessageBubble({
  message,
  onApplyAction,
  onUndo,
  index,
}: {
  message: ChatMessage
  onApplyAction?: (action: CoachAction) => void
  onUndo?: () => void
  index: number
}) {
  const isCoach = message.role === 'coach'

  return (
    <div
      className={cn(
        'flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
        !isCoach && 'flex-row-reverse'
      )}
      style={{ animationDelay: `${Math.min(index * 50, 200)}ms` }}
    >
      {/* Avatar */}
      {isCoach ? (
        <img
          src={DR_ZAY_AVATAR}
          alt="Dr. Zay"
          className="w-8 h-8 rounded-full object-cover flex-shrink-0 border-2 border-cyan-500/30"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-medium text-white">You</span>
        </div>
      )}

      {/* Content */}
      <div className={cn('flex-1 max-w-[85%] space-y-2', !isCoach && 'flex flex-col items-end')}>
        <div
          className={cn(
            'px-4 py-3 rounded-2xl',
            isCoach
              ? 'bg-secondary/50 border border-border/50'
              : 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30'
          )}
        >
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground/60 px-2">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>

        {/* Action button */}
        {message.action && !message.action.applied && (
          <button
            onClick={() => onApplyAction?.(message.action!)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 text-foreground hover:from-cyan-500/20 hover:to-purple-500/20 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            {message.action.label}
          </button>
        )}

        {message.action?.applied && (
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn(
              'inline-flex items-center gap-1.5 text-xs',
              message.producerEvent?.status === 'undone' ? 'text-muted-foreground' : 'text-green-400',
            )}>
              <span className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              </span>
              {message.producerEvent?.status === 'undone' ? 'Undone' : 'Applied and verified'}
            </span>
            {message.producerEvent?.status !== 'undone' && message.producerEvent?.actionId && (
              <button
                type="button"
                onClick={onUndo}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
              >
                Undo
              </button>
            )}
          </div>
        )}

        {message.producerEvent && (message.producerEvent.kind === 'plan' || message.producerEvent.kind === 'clarification') && (
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs text-muted-foreground">
            <div className="font-medium text-cyan-300">
              {message.producerEvent.kind === 'clarification' ? 'Needs your answer' : 'Producer plan preview'}
            </div>
            {message.producerEvent.target && (
              <div>Bars {message.producerEvent.target.startBar}–{message.producerEvent.target.endBar}
                {message.producerEvent.target.section ? ` · ${message.producerEvent.target.section}` : ''}</div>
            )}
            {message.producerEvent.actions && message.producerEvent.actions.length > 0 && (
              <div>{message.producerEvent.actions.length} planned action{message.producerEvent.actions.length === 1 ? '' : 's'} · Plan {message.producerEvent.planId}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
