/**
 * Document lifecycle (issue #18).
 *
 * Two lifecycles, deliberately separate, because the bot has two jobs with
 * different shapes:
 *
 *  - `withProject()` - one-shot commands (analyze / plan / apply / undo). One
 *    document per operation, always stopped. This is the safe default, and the
 *    only one that should ever write.
 *  - `openSession()` - the long-lived read side (Channel A ambient coaching,
 *    #13, and the latency spike in #14), where a document is held open and
 *    synced for minutes.
 *
 * Both time-box stop(). A document whose transaction threw is wedged, and its
 * stop() never returns; awaiting it unbounded turns a failed apply into a hung
 * process, which is exactly the failure/hang ambiguity #22 has to avoid.
 */
import { normalizeProjectRef } from "./project-ref.js"

/** The slice of AudiotoolClient these helpers need - keeps them testable. */
export interface DocumentOpener {
  open: (project: string) => Promise<unknown>
}

/** The document surface we rely on. Narrow on purpose: fakes stay cheap. */
interface StartableDocument {
  start: () => Promise<void>
  stop: () => Promise<void>
}

export interface LifecycleOptions {
  /** How long to wait for stop() before abandoning it. Default 5000ms. */
  stopTimeoutMs?: number
}

const DEFAULT_STOP_TIMEOUT_MS = 5000

/**
 * Await stop() but never longer than `timeoutMs`, and never throw. A failure
 * to stop must not mask why we were stopping.
 */
async function stopSafely(doc: StartableDocument, timeoutMs: number): Promise<void> {
  try {
    await Promise.race([
      doc.stop(),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ])
  } catch {
    // Deliberately swallowed: see doc comment.
  }
}

/**
 * Open a project, run `fn` against it, and always stop the document.
 *
 * The project reference is validated *before* open() is called, so a typo
 * costs nothing and never reaches the backend.
 */
export async function withProject<T>(
  client: DocumentOpener,
  project: string | undefined,
  fn: (doc: never) => Promise<T>,
  options: LifecycleOptions = {},
): Promise<T> {
  const name = normalizeProjectRef(project)
  const stopTimeoutMs = options.stopTimeoutMs ?? DEFAULT_STOP_TIMEOUT_MS

  const doc = (await client.open(name)) as StartableDocument
  try {
    await doc.start()
    return await fn(doc as never)
  } finally {
    await stopSafely(doc, stopTimeoutMs)
  }
}

export interface LiveSession<TDoc = unknown> {
  /** The synced document. Wrap with asReadonly() for the ambient channel. */
  readonly doc: TDoc
  /** The canonical projects/<uuid> name that was opened. */
  readonly project: string
  /** Idempotent and time-boxed: safe to call from a SIGINT handler and a timer. */
  stop: () => Promise<void>
}

/**
 * Open a project and leave it running. The caller owns stop() - and must call
 * it, or the process will not exit.
 */
export async function openSession<TDoc = unknown>(
  client: DocumentOpener,
  project: string | undefined,
  options: LifecycleOptions = {},
): Promise<LiveSession<TDoc>> {
  const name = normalizeProjectRef(project)
  const stopTimeoutMs = options.stopTimeoutMs ?? DEFAULT_STOP_TIMEOUT_MS

  const doc = (await client.open(name)) as StartableDocument
  try {
    await doc.start()
  } catch (error) {
    // A half-opened document still syncs and still holds the process open.
    await stopSafely(doc, stopTimeoutMs)
    throw error
  }

  let stopping: Promise<void> | undefined
  return {
    doc: doc as TDoc,
    project: name,
    stop: async () => {
      stopping ??= stopSafely(doc, stopTimeoutMs)
      await stopping
    },
  }
}
