/**
 * Producer command runner (issue #18).
 *
 *   npm run producer -- analyze --project <url>
 *   npm run producer -- plan    --project <url> --command "add a dark 808 under the drop"
 *   npm run producer -- apply   --project <url> --command "..." --plan <plan-id>
 *   npm run producer -- undo    --project <url> [--action <action-id>]
 *
 * Three rules this file exists to enforce:
 *
 *  1. `analyze` and `plan` never mutate. They run against a read-only proxy, so
 *     a stray write throws instead of reaching the project.
 *  2. `apply` refuses without an explicit --plan id that matches the plan just
 *     computed. You cannot apply by accident.
 *  3. Every verb gets its OWN document, and every document is stopped. After a
 *     failed apply the document is wedged - undo and verify cannot run on it,
 *     they need a fresh open(). withProject() is what guarantees that.
 */
import { createClientFromEnv } from "./auth.js"
import { analyzeSessionReport } from "./analyze/analyzer.js"
import { ActionLog } from "./apply/action-log.js"
import { executePlan } from "./apply/executor.js"
import { describeDryRun, undoAction, verifyAction } from "./apply/safety.js"
import { loadEnv } from "./env.js"
import { withProject } from "./nexus/client.js"
import { normalizeProjectRef } from "./nexus/project-ref.js"
import { planCommand } from "./plan/planner.js"
import { asReadonly } from "./readonly.js"

type Verb = "analyze" | "plan" | "apply" | "undo"

const VERBS: Verb[] = ["analyze", "plan", "apply", "undo"]

/** An apply that hangs is indistinguishable from one that failed. */
const APPLY_TIMEOUT_MS = 60_000

interface Args {
  verb: Verb
  project?: string
  command?: string
  planId?: string
  actionId?: string
  json: boolean
}

function parseArgs(argv: string[]): Args {
  const verb = argv[0] as Verb | undefined
  if (verb === undefined || !VERBS.includes(verb)) {
    throw new Error(
      `Usage: npm run producer -- <${VERBS.join("|")}> --project <url> [--command "..."] [--plan <id>] [--action <id>]`,
    )
  }
  const args: Args = { verb, json: false }
  for (let i = 1; i < argv.length; i += 1) {
    const flag = argv[i]
    const value = argv[i + 1]
    switch (flag) {
      case "--project":
        args.project = value
        i += 1
        break
      case "--command":
        args.command = value
        i += 1
        break
      case "--plan":
        args.planId = value
        i += 1
        break
      case "--action":
        args.actionId = value
        i += 1
        break
      case "--json":
        args.json = true
        break
      default:
        throw new Error(`Unknown flag "${flag ?? ""}"`)
    }
  }
  return args
}

function requireCommand(args: Args): string {
  if (args.command === undefined || args.command.trim() === "") {
    throw new Error(`${args.verb} needs --command "what you want the agent to do"`)
  }
  return args.command
}

async function main(): Promise<void> {
  loadEnv()
  const args = parseArgs(process.argv.slice(2))
  const project = args.project ?? process.env.AUDIOTOOL_PROJECT_URL
  const client = await createClientFromEnv()
  const log = new ActionLog()

  switch (args.verb) {
    case "analyze": {
      // Read-only proxy: modify() throws rather than reaching the project.
      const report = await withProject(client, project, async (doc) =>
        analyzeSessionReport(asReadonly(doc as never)),
      )
      print(args, report, () => renderAnalysis(report))
      return
    }

    case "plan": {
      const command = requireCommand(args)
      const { report, plan } = await withProject(client, project, async (doc) => {
        const report = analyzeSessionReport(asReadonly(doc as never))
        return { report, plan: planCommand(command, report) }
      })
      print(args, plan, () => renderPlan(plan, report.risks))
      return
    }

    case "apply": {
      const command = requireCommand(args)

      // Plan and apply in separate documents. Re-planning here also means the
      // --plan id is checked against a CURRENT read of the project, not a
      // stale one from minutes ago.
      const plan = await withProject(client, project, async (doc) =>
        planCommand(command, analyzeSessionReport(asReadonly(doc as never))),
      )

      if (args.planId === undefined) {
        throw new Error(
          `apply requires --plan ${plan.planId}. Run \`plan\` first and read it before applying.`,
        )
      }
      if (args.planId !== plan.planId) {
        throw new Error(
          `Plan id mismatch: you passed "${args.planId}" but this command now plans as ` +
            `"${plan.planId}". The project changed - re-run \`plan\` and read it again.`,
        )
      }
      if (plan.requiresConfirmation) {
        throw new Error(
          `This plan needs confirmation before it can be applied.\n${plan.clarification ?? plan.summary}`,
        )
      }

      const result = await withTimeout(
        withProject(client, project, async (doc) => executePlan(doc as never, plan)),
        APPLY_TIMEOUT_MS,
        "apply timed out - the document may have been wedged by a failed transaction",
      )

      const record = await log.record({
        project: normalizeProjectRef(project),
        command,
        planId: plan.planId,
        createdEntityIds: result.createdEntityIds,
        updatedFields: [],
      })

      // Fresh document for verification: if the apply above had failed, the one
      // it used would be wedged and unusable.
      const verified = await withProject(client, project, async (doc) =>
        verifyAction(doc as never, record, plan),
      )

      print(args, { record, verified, summary: result.summary }, () =>
        [
          result.summary,
          `action ${record.actionId} - ${record.createdEntityIds.length} entities created`,
          verified.ok
            ? `verified: ${verified.checked} checks passed`
            : `VERIFICATION FAILED:\n  ${verified.failures.join("\n  ")}`,
          `undo with: npm run producer -- undo --action ${record.actionId}`,
        ].join("\n"),
      )
      if (!verified.ok) process.exitCode = 1
      return
    }

    case "undo": {
      const record =
        args.actionId === undefined ? await log.latest() : await log.get(args.actionId)
      if (record === undefined) {
        throw new Error(
          args.actionId === undefined
            ? "No actions recorded yet - nothing to undo."
            : `No action "${args.actionId}" in the log.`,
        )
      }
      if (record.undoneAt !== undefined) {
        throw new Error(`Action ${record.actionId} was already undone at ${record.undoneAt}.`)
      }

      const result = await withProject(client, project, async (doc) =>
        undoAction(doc as never, record),
      )
      await log.markUndone(record.actionId)

      print(args, result, () =>
        [
          `undid ${record.actionId}: removed ${result.removedEntityIds.length} entities`,
          result.missingEntityIds.length === 0
            ? ""
            : `${result.missingEntityIds.length} were already gone`,
        ]
          .filter(Boolean)
          .join("\n"),
      )
      return
    }
  }
}

function print(args: Args, data: unknown, human: () => string): void {
  console.log(args.json ? JSON.stringify(data, null, 2) : human())
}

function renderAnalysis(report: ReturnType<typeof analyzeSessionReport>): string {
  const lines = [
    `${report.tempoBpm} bpm, ${report.signature}, ${report.lengthBars} bars (${report.shape})`,
    `devices: ${Object.entries(report.inventory)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${n} ${k}`)
      .join(", ")}`,
  ]
  for (const section of report.sections) {
    lines.push(
      `  bars ${section.startBar}-${section.endBar}  ${section.label.padEnd(10)} ` +
        `density ${section.density}  confidence ${section.confidence.toFixed(2)}`,
    )
  }
  for (const risk of report.risks) lines.push(`  risk: ${risk}`)
  if (report.clarification !== undefined) lines.push(`\n${report.clarification}`)
  return lines.join("\n")
}

function renderPlan(plan: ReturnType<typeof planCommand>, risks: string[]): string {
  const lines = [
    plan.interpretedIntent,
    "",
    plan.summary,
    "",
    "dry run - this is what apply would do:",
    ...describeDryRun(plan).map((line) => `  - ${line}`),
  ]
  for (const risk of risks) lines.push(`  risk: ${risk}`)
  lines.push(
    "",
    plan.requiresConfirmation
      ? `NEEDS CONFIRMATION: ${plan.clarification ?? "answer the question above, then re-run plan"}`
      : `apply with: npm run producer -- apply --command "${plan.command}" --plan ${plan.planId}`,
  )
  return lines.join("\n")
}

async function withTimeout<T>(work: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms)
      }),
    ])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

main().catch((error: unknown) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
