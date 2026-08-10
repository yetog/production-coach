import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { API_PATH_SUFFIX } from './src/lib/api-base.js'

// Single source of truth for where the app is served from. The API path and
// the dev proxy rule below are both derived from it, so they cannot drift
// apart the way they did in #41.
const BASE = '/production-coach/'
const API_SERVER = process.env.VITE_DEV_API_TARGET ?? 'http://localhost:3021'
// The agent bridge (bot/, issue #23). Separate process because it holds the
// Audiotool PAT and imports the Nexus SDK; it binds loopback only.
const AGENT_BRIDGE = process.env.VITE_DEV_AGENT_TARGET ?? 'http://127.0.0.1:3022'
const stripBase = (path: string) => path.replace(BASE.replace(/\/$/, ''), '')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // fileURLToPath, not .pathname: pathname percent-encodes, so any
      // checkout path containing a space resolves to a directory that does
      // not exist and every '@/...' import fails to build.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  base: BASE,
  server: {
    proxy: {
      // ORDER MATTERS. Vite matches proxy keys as a prefix of the request
      // path and takes the first match, so the agent's specific prefixes must
      // come before the catch-all `${BASE}api` rule below - otherwise every
      // agent call would be sent to Dr. Zay's chat server and 404.
      ...Object.fromEntries(
        ['projects', 'producer', 'actions', 'agent'].map((segment) => [
          `${BASE}${API_PATH_SUFFIX}/${segment}`,
          { target: AGENT_BRIDGE, changeOrigin: true, rewrite: stripBase },
        ]),
      ),

      // Everything else under the API base is Dr. Zay's server: chat, tts,
      // health. The browser requests `${BASE}api/...` because that is what
      // resolveApiBase() produces, and the key has to include the base - the
      // old '/api' rule never matched (#41). Both servers mount routes at
      // /api, hence the shared rewrite.
      [`${BASE}${API_PATH_SUFFIX}`]: {
        target: API_SERVER,
        changeOrigin: true,
        rewrite: stripBase,
      },
    },
  },
})
