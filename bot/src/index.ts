/**
 * Production Coach bot - joins the producer's live session read-only
 * (issues #12, #13, #3).
 *
 * Joins the project from AUDIOTOOL_PROJECT_URL as a normal second NEXUS
 * participant, prints a structured session snapshot, then streams normalized
 * events as JSON lines until Ctrl+C. Never writes.
 */
import { createClientFromEnv, projectFromEnv } from "./auth.js"
import { loadEnv } from "./env.js"
import { subscribeCoachEvents } from "./events.js"
import { analyzeSession } from "./query.js"
import { asReadonly } from "./readonly.js"

async function main(): Promise<void> {
  loadEnv()
  const client = await createClientFromEnv()
  const project = projectFromEnv()

  console.error(`[bot] opening ${project} ...`)
  const rawDoc = await client.open(project)
  const doc = asReadonly(rawDoc)

  let live = false
  let replayed = 0
  const pipeline = subscribeCoachEvents(
    doc,
    (event) => {
      if (!event.live) {
        replayed += 1
        return // initial sync replay - the snapshot below covers this state
      }
      console.log(JSON.stringify(event))
    },
    () => live,
  )

  console.error("[bot] starting sync (event listeners registered first) ...")
  const t0 = performance.now()
  await doc.start()
  live = true
  console.error(
    `[bot] in sync after ${Math.round(performance.now() - t0)}ms - ` +
      `${replayed} events replayed for existing entities`,
  )
  console.error(`[bot] studio URL: ${doc.dawUrl}`)

  doc.connected.subscribe((connected) => {
    console.error(`[bot] connected: ${connected}`)
  })

  console.error("[bot] session snapshot:")
  console.error(JSON.stringify(analyzeSession(doc), null, 2))
  console.error("[bot] streaming live events (Ctrl+C to stop) ...")

  process.on("SIGINT", () => {
    console.error("[bot] stopping ...")
    pipeline.terminate()
    doc
      .stop()
      .catch((error: unknown) => console.error("[bot] stop failed:", error))
      .finally(() => process.exit(0))
  })
}

main().catch((error: unknown) => {
  console.error("[bot] fatal:", error)
  process.exit(1)
})
