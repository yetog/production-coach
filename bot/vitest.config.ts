import { defineConfig } from "vitest/config"

/**
 * Pins vitest to the bot package.
 *
 * Without this, vitest walks UP from bot/ looking for a vite config, finds the
 * frontend's root vite.config.ts, and tries to load it - which imports `vite`
 * and `@vitejs/plugin-react`, neither of which is installed in bot/. The whole
 * suite then dies at startup with ERR_MODULE_NOT_FOUND before a single test
 * runs.
 *
 * `root` stops the upward search. The two packages are separate installs by
 * design, so they need separate configs.
 */
export default defineConfig({
  root: import.meta.dirname,
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
})
