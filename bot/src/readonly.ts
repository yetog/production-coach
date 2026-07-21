/**
 * Read-only discipline, enforced at runtime.
 *
 * NEXUS has no read-only scope or mode — every participant is technically a
 * writer. v1 of Production Coach must never write, so the live document is
 * wrapped in a guard that turns every mutation entry point into a hard error.
 * Reading (queryEntities, events, connected, dawUrl) passes through untouched.
 */
import type { SyncedDocument } from "@audiotool/nexus"

const FORBIDDEN = new Set(["modify", "createTransaction"])

/** A SyncedDocument with every mutation entry point removed from the type. */
export type ReadonlyDocument = Omit<SyncedDocument, "modify" | "createTransaction">

/** The subset of the document both pipelines need; satisfied by online and offline documents. */
export type ReadableDocument = Pick<SyncedDocument, "queryEntities" | "events">

export function asReadonly(doc: SyncedDocument): ReadonlyDocument {
  return new Proxy(doc, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && FORBIDDEN.has(prop)) {
        return () => {
          throw new Error(
            `Production Coach is read-only: SyncedDocument.${prop}() is disabled in v1`,
          )
        }
      }
      const value = Reflect.get(target, prop, receiver)
      return typeof value === "function" ? value.bind(target) : value
    },
  }) as ReadonlyDocument
}
