/**
 * Characterization test for the transaction-wedge footgun.
 *
 * This does not test our code - it pins SDK behaviour that the rest of the bot
 * is designed around, so that if a future @audiotool/nexus release fixes it we
 * find out here rather than by quietly deleting guards that turn out to still
 * be load bearing.
 *
 * The behaviour: a throw inside doc.modify() never releases the transaction
 * lock, so every later modify() on that document hangs forever - silently, with
 * no error. Hence: validate before the transaction, one document per operation,
 * and always time-box stop().
 */
import { createOfflineDocument } from "@audiotool/nexus/node"
import { describe, expect, it } from "vitest"
import { settlesWithin, stopQuietly } from "./test-support.js"

describe("doc.modify() wedge footgun", () => {
  it("wedges the document permanently once a transaction throws", async () => {
    const doc = await createOfflineDocument()

    await expect(
      doc.modify(() => {
        throw new Error("boom")
      }),
    ).rejects.toThrow("boom")

    // The document is now unusable: this modify never settles, either way.
    const outcome = await settlesWithin(
      1500,
      doc.modify((t) => t.create("heisenberg", {})),
    )
    expect(
      outcome,
      "SDK may have fixed the wedge - if so, revisit the one-document-per-operation rule",
    ).toBe("hung")
  }, 20_000)

  it("leaves a fresh document unaffected, which is why undo needs its own open()", async () => {
    const wedged = await createOfflineDocument()
    await expect(
      wedged.modify(() => {
        throw new Error("boom")
      }),
    ).rejects.toThrow("boom")

    const fresh = await createOfflineDocument()
    try {
      await expect(fresh.modify((t) => t.create("heisenberg", {}))).resolves.toBeDefined()
    } finally {
      await stopQuietly(fresh)
    }
  }, 20_000)
})
