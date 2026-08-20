import { defineConfig } from "vitest/config"

/** Frontend and bot unit tests. `root` pinned so vitest resolves this package only. */
export default defineConfig({
  root: import.meta.dirname,
  test: { include: ["src/**/*.test.ts", "bot/**/*.test.ts"], environment: "node" },
})
