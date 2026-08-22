export class AgentBridgeError extends Error {
  constructor(code, message, status) {
    super(message)
    this.name = "AgentBridgeError"
    this.code = code
    this.status = status
  }
}

/** Server-side counterpart to src/lib/agent-client.ts. */
export function createAgentBridgeClient({
  baseUrl = process.env.AGENT_BRIDGE_URL ?? "http://127.0.0.1:3022/api",
  fetch: fetchImpl = globalThis.fetch,
} = {}) {
  const root = baseUrl.replace(/\/+$/, "")

  async function post(path, body) {
    let response
    try {
      response = await fetchImpl(`${root}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(
          Object.entries(body).filter(([, value]) => value !== undefined),
        )),
      })
    } catch {
      throw new AgentBridgeError(
        "unreachable",
        "The Audiotool agent bridge is not running.",
        503,
      )
    }

    const payload = await response.json().catch(() => undefined)
    if (!response.ok) {
      const error = payload?.error
      throw new AgentBridgeError(
        error?.code ?? "bridge_error",
        error?.message ?? `The agent bridge returned ${response.status}.`,
        response.status,
      )
    }
    return payload
  }

  return {
    analyze: async (project) => await post("/projects/analyze", { project }),
    plan: async (project, command) => await post("/producer/plan", { project, command }),
    apply: async (project, command, planId) => await post("/producer/apply", { project, command, planId }),
    undo: async (project, actionId) => await post("/producer/undo", { project, actionId }),
  }
}
