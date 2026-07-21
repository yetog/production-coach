/**
 * Foundation spike, live half (issue #14). READ-ONLY.
 *
 * Joins a real project as a second participant and answers the questions the
 * offline spike cannot:
 *  - does the bot receive the producer's note-level edits in real time?
 *  - what is the observed end-to-end latency? (compare the printed arrival
 *    timestamps against the moment you make the edit in the studio)
 *  - does the producer see the bot join? (watch the studio UI while this runs)
 *
 * Setup: bot/.env with AUDIOTOOL_PAT and AUDIOTOOL_PROJECT_URL, then open the
 * same project in the studio in a browser and edit notes/devices while this
 * script runs.
 *
 * Run: npm run spike:live   (Ctrl+C or SPIKE_DURATION_S to stop)
 */
import { createClientFromEnv, projectFromEnv } from "./auth.js"
import { loadEnv } from "./env.js"
import { subscribeCoachEvents } from "./events.js"
import { analyzeSession } from "./query.js"
import { asReadonly } from "./readonly.js"
import type { CoachEvent } from "./types.js"

async function main(): Promise<void> {
  loadEnv()
  const client = await createClientFromEnv()
  const project = projectFromEnv()

  console.log(`[spike-live] opening ${project} ...`)
  const doc = asReadonly(await client.open(project))

  let live = false
  let replayed = 0
  const liveCounts: Record<string, number> = {}
  let firstLiveEventMs: number | undefined
  const startedAtMs = performance.now()

  subscribeCoachEvents(
    doc,
    (event: CoachEvent) => {
      if (!event.live) {
        replayed += 1
        return
      }
      liveCounts[event.kind] = (liveCounts[event.kind] ?? 0) + 1
      firstLiveEventMs ??= event.tMs
      const wallClock = new Date().toISOString().slice(11, 23)
      console.log(
        `[${wallClock}] ${event.kind} ${event.entityType} ` +
          `${JSON.stringify(event.data)}`,
      )
    },
    () => live,
  )

  const t0 = performance.now()
  await doc.start()
  live = true
  console.log(
    `[spike-live] joined + synced in ${Math.round(performance.now() - t0)}ms; ` +
      `${replayed} events replayed for existing entities`,
  )
  console.log("[spike-live] NOW: watch the studio - does the producer see a 2nd participant?")
  console.log("[spike-live] NOW: edit notes/devices in the studio; arrival timestamps print here.")

  doc.connected.subscribe((connected) =>
    console.log(`[spike-live] connected: ${connected}`),
  )

  console.log("[spike-live] snapshot on join:")
  console.log(JSON.stringify(analyzeSession(doc), null, 2))

  const summarize = (): void => {
    console.log("\n[spike-live] === summary ===")
    console.log(`replayed (pre-existing): ${replayed}`)
    console.log(`live events by kind: ${JSON.stringify(liveCounts)}`)
    console.log(
      firstLiveEventMs === undefined
        ? "no live events observed - did you edit the project while this ran?"
        : `first live event ${Math.round(firstLiveEventMs - startedAtMs)}ms after start`,
    )
  }

  const shutdown = (): void => {
    summarize()
    doc
      .stop()
      .catch((error: unknown) => console.error("[spike-live] stop failed:", error))
      .finally(() => process.exit(0))
  }
  process.on("SIGINT", shutdown)

  const durationS = Number(process.env.SPIKE_DURATION_S ?? 0)
  if (durationS > 0) setTimeout(shutdown, durationS * 1000)
}

main().catch((error: unknown) => {
  console.error("[spike-live] fatal:", error)
  process.exit(1)
})
