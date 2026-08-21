/**
 * Local HTTP bridge to the producer agent (issue #23).
 *
 * A thin transport layer over the agent service: routing, JSON, status codes.
 * Every safety rule lives in service.ts, so the bridge cannot relax one by
 * accident - it has no path to the executor that does not go through there.
 *
 * Three deliberate choices:
 *
 *  - **Loopback only.** This process holds AUDIOTOOL_PAT, which grants full
 *    account access with no read-only scope. It binds 127.0.0.1 so it is not
 *    reachable off the machine, and it never echoes credentials.
 *  - **No CORS headers.** The UI reaches this through the Vite dev proxy, so
 *    requests are same-origin. Adding permissive CORS would make a
 *    full-access token reachable from any page the browser happens to load.
 *  - **node:http, no framework.** One file, no new dependencies in the bot
 *    package, and nothing between the route table and the service.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { appendFileSync, existsSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import type { AgentService } from "./service.js"
import { AgentError } from "./service.js"

// Logging for eval/fine-tuning
const __dirname = dirname(fileURLToPath(import.meta.url))
const LOGS_DIR = join(__dirname, "..", "..", "logs")
if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR, { recursive: true })

function logNexus(entry: Record<string, unknown>): void {
  const date = new Date().toISOString().split("T")[0]
  const logFile = join(LOGS_DIR, `nexus-${date}.jsonl`)
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() }) + "\n"
  try {
    appendFileSync(logFile, line)
  } catch (e) {
    console.error("[bridge] log write failed:", e)
  }
}

/** Requests are small JSON documents; anything larger is a mistake or an attack. */
const MAX_BODY_BYTES = 1_000_000

const LOOPBACK = "127.0.0.1"

export interface Bridge {
  listen: (port: number) => Promise<{ port: number }>
  close: () => Promise<void>
  readonly address: string
}

export function createBridge(deps: { service: AgentService }): Bridge {
  const { service } = deps

  const server = createServer((req, res) => {
    handle(req, res, service).catch((error: unknown) => {
      // Last resort: the handler is supposed to convert everything itself.
      send(res, 500, { error: { code: "internal", message: "Unexpected server error." } })
      console.error("[bridge] unhandled:", error)
    })
  })

  return {
    address: LOOPBACK,
    listen: async (port) =>
      await new Promise((resolve, reject) => {
        // Without this, a port already in use leaves the promise pending and
        // `npm run bridge` hangs with no output instead of saying why.
        const onError = (error: NodeJS.ErrnoException): void => {
          reject(
            error.code === "EADDRINUSE"
              ? new Error(
                  `Port ${port} is already in use - is another bridge running? Set AGENT_BRIDGE_PORT to use a different one.`,
                )
              : error,
          )
        }
        server.once("error", onError)
        server.listen(port, LOOPBACK, () => {
          server.removeListener("error", onError)
          const info = server.address()
          resolve({ port: typeof info === "object" && info !== null ? info.port : port })
        })
      }),
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    },
  }
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  service: AgentService,
): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${LOOPBACK}`)
  const path = url.pathname.replace(/\/+$/, "") || "/"
  const method = req.method ?? "GET"

  try {
    if (path === "/api/agent/health") {
      if (method !== "GET") return send(res, 405, methodError("GET"))
      return send(res, 200, { status: "ok", service: "production-coach-agent" })
    }

    const actionMatch = /^\/api\/actions\/([^/]+)$/.exec(path)
    if (actionMatch !== null) {
      if (method !== "GET") return send(res, 405, methodError("GET"))
      const record = await service.getAction(decodeURIComponent(actionMatch[1]!))
      return record === undefined
        ? send(res, 404, errorBody("action_not_found", "No such action."))
        : send(res, 200, record)
    }

    const post = POST_ROUTES[path]
    if (post !== undefined) {
      if (method !== "POST") return send(res, 405, methodError("POST"))
      const body = await readJson(req)
      return send(res, 200, await post(service, body))
    }

    return send(res, 404, errorBody("not_found", `No route for ${method} ${path}.`))
  } catch (error) {
    if (error instanceof AgentError) return send(res, error.status, error.toJSON())
    if (error instanceof HttpError) return send(res, error.status, errorBody(error.code, error.message))

    // Never surface the raw message: it can carry file paths, upstream detail,
    // or - in the worst case - a token echoed back from a failed auth call.
    console.error("[bridge] error:", error)
    return send(res, 500, errorBody("internal", "The agent failed to complete that request."))
  }
}

type Handler = (service: AgentService, body: Record<string, unknown>) => Promise<unknown>

const POST_ROUTES: Record<string, Handler> = {
  "/api/projects/analyze": async (service, body) => {
    const result = await service.analyze(optionalString(body, "project"))
    logNexus({ type: "analyze", project: optionalString(body, "project"), result })
    return result
  },

  "/api/producer/plan": async (service, body) => {
    const command = requiredString(body, "command")
    const project = optionalString(body, "project")
    const result = await service.plan(project, command)
    logNexus({ type: "plan", project, command, result })
    return result
  },

  "/api/producer/apply": async (service, body) => {
    const command = requiredString(body, "command")
    const project = optionalString(body, "project")
    const planId = optionalString(body, "planId")
    const result = await service.apply(project, command, planId)
    logNexus({ type: "apply", project, command, planId, result })
    return result
  },

  "/api/producer/undo": async (service, body) => {
    const project = optionalString(body, "project")
    const actionId = optionalString(body, "actionId")
    const result = await service.undo(project, actionId)
    logNexus({ type: "undo", project, actionId, result })
    return result
  },
}

/** A transport-level failure with a status the client should see. */
class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "HttpError"
  }
}

class BadRequest extends HttpError {
  constructor(message: string) {
    super(400, "bad_request", message)
  }
}

class PayloadTooLarge extends HttpError {
  constructor() {
    super(413, "payload_too_large", `Request body exceeds ${MAX_BODY_BYTES} bytes.`)
  }
}

function requiredString(body: Record<string, unknown>, field: string): string {
  const value = body[field]
  if (typeof value !== "string" || value.trim() === "") {
    throw new BadRequest(`Field \`${field}\` is required and must be a non-empty string.`)
  }
  return value
}

function optionalString(body: Record<string, unknown>, field: string): string | undefined {
  const value = body[field]
  if (value === undefined || value === null || value === "") return undefined
  if (typeof value !== "string") {
    throw new BadRequest(`Field \`${field}\` must be a string if provided.`)
  }
  return value
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  // Reject on the declared length before reading a byte. Destroying the socket
  // mid-upload instead would leave the client with a broken pipe and no status
  // to render, which is exactly the "errors the UI can render" requirement.
  const declared = Number(req.headers["content-length"] ?? 0)
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    req.resume() // drain, so the response can still be written
    throw new PayloadTooLarge()
  }

  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of req) {
    const buffer = chunk as Buffer
    size += buffer.length
    // Backstop for chunked uploads, which declare no length. Drain rather than
    // destroy, for the same reason as above.
    if (size > MAX_BODY_BYTES) {
      req.resume()
      throw new PayloadTooLarge()
    }
    chunks.push(buffer)
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim()
  if (raw === "") return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new BadRequest("Request body must be a JSON object.")
    }
    return parsed as Record<string, unknown>
  } catch (error) {
    if (error instanceof BadRequest) throw error
    throw new BadRequest("Request body is not valid JSON.")
  }
}

function methodError(expected: string): ReturnType<typeof errorBody> {
  return errorBody("method_not_allowed", `Use ${expected} for this endpoint.`)
}

function errorBody(code: string, message: string): { error: { code: string; message: string } } {
  return { error: { code, message } }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body ?? null)
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    // This is a local tool holding a full-access token; nothing here should be
    // cached, framed, or sniffed.
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  })
  res.end(payload)
}
