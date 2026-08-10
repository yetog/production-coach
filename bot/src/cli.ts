/**
 * Producer command runner (issue #18).
 *
 *   npm run producer -- analyze --project <url>
 *   npm run producer -- plan    --project <url> --command "add a dark 808 under the drop"
 *   npm run producer -- apply   --project <url> --command "..." --plan <plan-id>
 *   npm run producer -- undo    --project <url> [--action <action-id>]
 *
 * This file is argument parsing and human-readable output. Every safety rule -
 * read-only analyze/plan, the explicit plan id, the confirmation gate, a fresh
 * document per verb, the apply timeout - lives in agent/service.ts, which the
 * HTTP bridge (#23) also calls. Two front doors, one set of rules; that is the
 * point of the split.
 */
import { createAgentService, AgentError } from "./agent/service.js"
import type { SessionReport } from "./analyze/analyzer.js"
import { describeDryRun } from "./apply/safety.js"
import { createClientFromEnv } from "./auth.js"
import { loadEnv } from "./env.js"
import type { Plan } from "./plan/contract.js"

type Verb = "analyze" | "plan" | "apply" | "undo"

const VERBS: Verb[] = ["analyze", "plan", "apply", "undo"]

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
      `Usage: npm run producer -- <${VERBS.join("|")}> --project <url> [--command "..."] [--plan <id>] [--action <id>] [--json]`,
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
  // Falls back to AUDIOTOOL_PROJECT_URL inside the service, so the CLI and
  // the bridge resolve the default project identically.
  const project = args.project
  const agent = createAgentService({ client: await createClientFromEnv() })

  switch (args.verb) {
    case "analyze": {
      const report = await agent.analyze(project)
      print(args, report, () => renderAnalysis(report))
      return
    }

    case "plan": {
      const command = requireCommand(args)
      const plan = await agent.plan(project, command)
      print(args, plan, () => renderPlan(plan))
      return
    }

    case "apply": {
      const command = requireCommand(args)
      const outcome = await agent.apply(project, command, args.planId)
      print(args, outcome, () =>
        [
          outcome.summary,
          `action ${outcome.action.actionId} - ${outcome.action.createdEntityIds.length} entities created`,
          outcome.verification.ok
            ? `verified: ${outcome.verification.checked} checks passed`
            : `VERIFICATION FAILED:\n  ${outcome.verification.failures.join("\n  ")}`,
          `undo with: npm run producer -- undo --action ${outcome.action.actionId}`,
        ].join("\n"),
      )
      if (!outcome.verification.ok) process.exitCode = 1
      return
    }

    case "undo": {
      const outcome = await agent.undo(project, args.actionId)
      print(args, outcome, () => outcome.summary)
      return
    }
  }
}

function print(args: Args, data: unknown, human: () => string): void {
  console.log(args.json ? JSON.stringify(data, null, 2) : human())
}

function renderAnalysis(report: SessionReport): string {
  const lines = [
    `${report.tempoBpm} bpm, ${report.signature}, ${report.lengthBars} bars (${report.shape})`,
    `devices: ${
      Object.entries(report.inventory)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${n} ${k}`)
        .join(", ") || "none"
    }`,
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

function renderPlan(plan: Plan): string {
  const lines = [
    plan.interpretedIntent,
    "",
    plan.summary,
    "",
    "dry run - this is what apply would do:",
    ...describeDryRun(plan).map((line) => `  - ${line}`),
    "",
    plan.requiresConfirmation
      ? `NEEDS CONFIRMATION: ${plan.clarification ?? "answer the question above, then re-run plan"}`
      : `apply with: npm run producer -- apply --command "${plan.command}" --plan ${plan.planId}`,
  ]
  return lines.join("\n")
}

main().catch((error: unknown) => {
  // AgentError messages are already written for a human; anything else gets
  // its message printed rather than a stack.
  const message =
    error instanceof AgentError || error instanceof Error ? error.message : String(error)
  console.error(`\n${message}`)
  process.exit(1)
})
