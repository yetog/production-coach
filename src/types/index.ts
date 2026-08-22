// Coach States
export type CoachState = 'idle' | 'listening' | 'thinking' | 'speaking'

// Chat Message
export interface ChatMessage {
  id: string
  role: 'user' | 'coach'
  content: string
  timestamp: Date
  action?: CoachAction
  producerEvent?: ProducerEvent
}

/** Shared, serializable lifecycle state rendered by web and extension clients. */
export type ProducerEventKind =
  | 'request'
  | 'plan'
  | 'clarification'
  | 'apply_outcome'
  | 'verification'
  | 'undo'
  | 'failure'

export interface ProducerEvent {
  kind: ProducerEventKind
  command?: string
  planId?: string
  actionId?: string
  summary?: string
  target?: { section?: string; startBar: number; endBar: number; confidence: number }
  actions?: Array<Record<string, unknown>>
  status?: 'pending' | 'applied' | 'verified' | 'failed' | 'undone'
  verification?: { ok: boolean; checked: number; failures: string[] }
  error?: string
}

// Coach Actions (things the coach can do via NEXUS)
export interface CoachAction {
  type: 'add_device' | 'connect' | 'create_notes' | 'modify_param' | 'explain'
  label: string
  description: string
  params?: Record<string, unknown>
  applied?: boolean
}

// Session State (from NEXUS)
export interface SessionState {
  connected: boolean
  bpm: number | null
  key: string | null
  devices: DeviceInfo[]
  regions: RegionInfo[]
}

export interface DeviceInfo {
  id: string
  type: string
  displayName: string
}

export interface RegionInfo {
  id: string
  trackId: string
  startTick: number
  endTick: number
  type: 'note' | 'audio'
}

// Production Checklist
export interface ChecklistItem {
  id: number
  label: string
  description: string
  completed: boolean
  current: boolean
}

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: 1, label: 'Select a reference track', description: 'Find inspiration', completed: false, current: true },
  { id: 2, label: 'Establish BPM and key', description: 'Set the foundation', completed: false, current: false },
  { id: 3, label: 'Create chord progression', description: 'Harmonic foundation', completed: false, current: false },
  { id: 4, label: 'Choose drums and bass', description: 'Rhythm section', completed: false, current: false },
  { id: 5, label: 'Build an eight-bar loop', description: 'Core idea', completed: false, current: false },
  { id: 6, label: 'Expand into arrangement', description: 'Song structure', completed: false, current: false },
  { id: 7, label: 'Add transitions and movement', description: 'Energy flow', completed: false, current: false },
  { id: 8, label: 'Review the mix', description: 'Balance levels', completed: false, current: false },
  { id: 9, label: 'Prepare for mastering', description: 'Final polish', completed: false, current: false },
]

// Coach Settings
export interface CoachSettings {
  chattiness: number // 0-100, how often coach speaks up
  voiceEnabled: boolean
  persona: 'dr-zay' | 'default'
}
