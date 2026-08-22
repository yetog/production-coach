export interface AgentStreamEvent {
  type: string
  [key: string]: unknown
}

/** Parse complete SSE records; incomplete trailing input stays with caller. */
export function parseAgentSse(text: string): AgentStreamEvent[] {
  return text
    .split(/\r?\n\r?\n/)
    .flatMap((record) => {
      const line = record.split(/\r?\n/).find((entry) => entry.startsWith('data:'))
      if (line === undefined) return []
      try {
        const event = JSON.parse(line.slice('data:'.length).trim()) as unknown
        return typeof event === 'object' && event !== null && typeof (event as AgentStreamEvent).type === 'string'
          ? [event as AgentStreamEvent]
          : []
      } catch {
        return []
      }
    })
}
