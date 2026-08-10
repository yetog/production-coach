import { defineConfig } from "vitest/config"

/**
 * Pins vitest to the server package.
 *
 * Without `root`, vitest walks up from server/ and loads the frontend's root
 * vite.config.ts, which imports packages that are not installed here - the
 * suite then dies at startup before running anything. Same trap that took out
 * bot/ in #39.
 */
export default defineConfig({
  root: import.meta.dirname,
  test: { include: ["**/*.test.js"], environment: "node" },
})
