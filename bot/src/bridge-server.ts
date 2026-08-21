/**
 * Entry point for the local agent bridge (issue #23).
 *
 *   npm run bridge          # listens on 127.0.0.1:3022
 *
 * Holds AUDIOTOOL_PAT so the frontend never has to. The browser reaches this
 * through the Vite dev proxy, which is why it binds loopback and sends no CORS
 * headers - see bridge.ts.
 */

// Polyfill for Promise.withResolvers (requires Node 22+, we're on Node 20)
if (typeof Promise.withResolvers !== "function") {
  Promise.withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}

import { createBridge } from "./agent/bridge.js"
import { createAgentService } from "./agent/service.js"
import { createClientFromEnv } from "./auth.js"
import { loadEnv } from "./env.js"

const DEFAULT_PORT = 3022

async function main(): Promise<void> {
  loadEnv()

  // Fail here rather than on the first request: a bridge that starts without
  // credentials looks healthy and then 500s the moment anyone uses it.
  const client = await createClientFromEnv()
  const service = createAgentService({ client })
  const bridge = createBridge({ service })

  const port = Number(process.env.AGENT_BRIDGE_PORT ?? DEFAULT_PORT)
  const { port: bound } = await bridge.listen(port)

  console.log(`Production Coach agent bridge on http://127.0.0.1:${bound}`)
  console.log(
    `  default project: ${
      process.env.AUDIOTOOL_PROJECT_URL ?? "(none set - send a `project` field per request)"
    }`,
  )

  const shutdown = (): void => {
    void bridge.close().finally(() => process.exit(0))
  }
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

main().catch((error: unknown) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
