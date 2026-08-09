/**
 * Helpers shared by the offline tests. Not part of the shipped bundle.
 *
 * Two SDK quirks are contained here so individual tests don't repeat them:
 *
 *  - `OfflineDocument`'s typings do not declare `stop()`, but the method does
 *    exist at runtime and must be called, so the cast below is deliberate.
 *  - `stop()` never settles on a document whose transaction threw, so it is
 *    always raced against a timeout rather than awaited directly.
 */
import type { createOfflineDocument } from "@audiotool/nexus/node"

export type OfflineDoc = Awaited<ReturnType<typeof createOfflineDocument>>

/** Fields of a created entity, keyed by socket/field name. */
export function fieldsOf(entity: unknown): Record<string, { location: unknown }> {
  return (entity as { fields: Record<string, { location: unknown }> }).fields
}

/**
 * Stop a document without ever hanging the suite. Safe to call on a wedged
 * document, where stop() would otherwise never return.
 */
export async function stopQuietly(doc: OfflineDoc, timeoutMs = 2000): Promise<void> {
  const stoppable = doc as unknown as { stop?: () => Promise<unknown> }
  if (typeof stoppable.stop !== "function") return
  await Promise.race([
    stoppable.stop(),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]).catch(() => undefined)
}

/**
 * Resolve to "settled" or "hung" instead of rejecting, so that a promise which
 * never settles becomes an assertable value rather than a suite timeout.
 */
export async function settlesWithin(
  ms: number,
  work: Promise<unknown>,
): Promise<"settled" | "hung"> {
  return await Promise.race([
    work.then(
      () => "settled" as const,
      () => "settled" as const,
    ),
    new Promise<"hung">((resolve) => setTimeout(() => resolve("hung"), ms)),
  ])
}
