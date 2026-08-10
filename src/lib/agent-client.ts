/**
 * Typed client for the local agent bridge (issue #23).
 *
 * The only thing in src/ that knows the bridge exists. The frontend never
 * imports @audiotool/nexus and never sees AUDIOTOOL_PAT - the bridge holds the
 * token and this talks to it over the same origin, via the Vite dev proxy.
 *
 * Errors matter more than the happy path here. The bridge returns structured
 * {error:{code,message}} bodies written for a human, so this preserves both
 * rather than collapsing everything into "request failed".
 */

/** Mirrors bot/src/analyze/analyzer.ts - kept structural, not imported. */
export interface AgentSessionReport {
  tempoBpm: number
  signature: string
  lengthBars: number
  shape: "empty" | "loop" | "arranged"
  inventory: Record<string, number>
  sections: Array<{
    label: string
    startBar: number
    endBar: number
    confidence: number
    density: number
  }>
  drop?: { label: string; startBar: number; endBar: number; confidence: number }
  risks: string[]
  clarification?: string
}

/** Mirrors bot/src/plan/contract.ts. */
export interface AgentPlan {
  planId: string
  command: string
  intent: string
  interpretedIntent: string
  target: { section?: string; startBar: number; endBar: number; confidence: number }
  actions: Array<Record<string, unknown>>
  summary: string
  safety: string
  requiresConfirmation: boolean
  clarification?: string
}

export interface AgentApplyOutcome {
  action: { actionId: string; createdEntityIds: string[]; timestamp: string }
  verification: { ok: boolean; checked: number; failures: string[] }
  plan: AgentPlan
  summary: string
}

export interface AgentUndoOutcome {
  actionId: string
  removedEntityIds: string[]
  missingEntityIds: string[]
  summary: string
}

/** An error the UI can render directly: `message` is already human-readable. */
export class AgentApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "AgentApiError"
  }
}

export interface AgentClient {
  health: () => Promise<{ ok: boolean }>
  analyze: (project?: string) => Promise<AgentSessionReport>
  plan: (project: string | undefined, command: string) => Promise<AgentPlan>
  apply: (
    project: string | undefined,
    command: string,
    planId: string,
  ) => Promise<AgentApplyOutcome>
  undo: (project?: string, actionId?: string) => Promise<AgentUndoOutcome>
}

export function createAgentClient(apiBase: string): AgentClient {
  async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    let response: Response
    try {
      response = await fetch(`${apiBase}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    } catch {
      // A network-level failure here almost always means the bridge process
      // is not running, so say that rather than "Failed to fetch".
      throw new AgentApiError(
        "unreachable",
        "The agent is not running. Start it with `npm run bridge` in bot/.",
        0,
      )
    }

    const payload: unknown = await response.json().catch(() => undefined)

    if (!response.ok) {
      const structured = (payload as { error?: { code?: string; message?: string } } | undefined)
        ?.error
      throw new AgentApiError(
        structured?.code ?? "http_error",
        structured?.message ?? `The agent returned ${response.status}.`,
        response.status,
      )
    }
    return payload as T
  }

  /** Drops undefined fields so the bridge sees an absent key, not `null`. */
  const compact = (body: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined))

  return {
    async health() {
      try {
        const response = await fetch(`${apiBase}/agent/health`)
        return { ok: response.ok }
      } catch {
        return { ok: false }
      }
    },

    async analyze(project) {
      return await post<AgentSessionReport>("/projects/analyze", compact({ project }))
    },

    async plan(project, command) {
      return await post<AgentPlan>("/producer/plan", compact({ project, command }))
    },

    async apply(project, command, planId) {
      return await post<AgentApplyOutcome>(
        "/producer/apply",
        compact({ project, command, planId }),
      )
    },

    async undo(project, actionId) {
      return await post<AgentUndoOutcome>("/producer/undo", compact({ project, actionId }))
    },
  }
}
