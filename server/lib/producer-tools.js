import { tool } from "ai"
import { z } from "zod"

/**
 * Error returned when the model requests a mutating tool without an approval
 * recorded by the application. The model cannot satisfy this by inventing an
 * `approved` argument; approval is supplied by the server-side callback.
 */
export class ProducerToolError extends Error {
  constructor(code, message) {
    super(message)
    this.name = "ProducerToolError"
    this.code = code
  }
}

const commandSchema = z.object({
  command: z.string().trim().min(1).max(500),
})

const applySchema = z.object({
  command: z.string().trim().min(1).max(500),
  planId: z.string().trim().min(1).max(200),
})

const undoSchema = z.object({
  actionId: z.string().trim().min(1).max(200).optional(),
})

/**
 * Create the typed producer tools exposed to the model loop.
 *
 * `agent` is deliberately an AgentService-shaped dependency rather than a
 * Nexus client. This keeps the tool harness provider-facing while leaving all
 * Audiotool safety and mutation rules in bot/src/agent/service.ts.
 */
export function createProducerTools({ agent, project, approveApply = () => false }) {
  return {
    analyze_session: tool({
      description: "Read the current Audiotool session, arrangement, devices, risks, and drop confidence.",
      inputSchema: z.object({}),
      execute: async () => await agent.analyze(project),
    }),

    plan_change: tool({
      description: "Create a read-only, reviewable plan for a supported Audiotool producer command. Never applies changes.",
      inputSchema: commandSchema,
      execute: async ({ command }) => await agent.plan(project, command),
    }),

    apply_plan: tool({
      description: "Apply a previously previewed Audiotool plan after the user has explicitly approved it.",
      inputSchema: applySchema,
      needsApproval: true,
      execute: async ({ command, planId }) => {
        if (!(await approveApply({ command, planId }))) {
          throw new ProducerToolError(
            "approval_required",
            "The user must review and approve this plan before it can be applied.",
          )
        }
        return await agent.apply(project, command, planId)
      },
    }),

    undo_last_change: tool({
      description: "Undo an Audiotool action created by the producer agent.",
      inputSchema: undoSchema,
      execute: async ({ actionId }) => await agent.undo(project, actionId),
    }),
  }
}

/** A stable list used by API tests and documentation generators. */
export const toolDefinitions = createProducerTools({
  agent: {
    analyze: async () => undefined,
    plan: async () => undefined,
    apply: async () => undefined,
    undo: async () => undefined,
  },
  project: undefined,
})
