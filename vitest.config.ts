import { mergeConfig, defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'bot/**/*.test.ts', 'extension/**/*.test.js', 'docker/**/*.test.js'],
    environment: 'node',
    // Nexus document fixtures can exceed Vitest's 5s default on a busy
    // runner. Keep them bounded without turning scheduler contention into a
    // false negative.
    testTimeout: 15000,
    hookTimeout: 15000,
  },
}))
