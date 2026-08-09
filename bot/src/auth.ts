/**
 * Auth for the headless bot (issue #2).
 *
 * Two supported paths:
 *  - Personal Access Token (AUDIOTOOL_PAT) - quickest, full account access,
 *    create at https://developer.audiotool.com/personal-access-tokens
 *  - OAuth tokens exported from a browser login (AUDIOTOOL_ACCESS_TOKEN /
 *    AUDIOTOOL_REFRESH_TOKEN / AUDIOTOOL_CLIENT_ID), via createServerAuth.
 *
 * Note: the only scope NEXUS offers is `project:write` - there is no
 * read-only scope. Read-only is enforced by us (see readonly.ts), not by auth.
 */
import { createAudiotoolClient, createServerAuth, type AudiotoolClient } from "@audiotool/nexus"
import { createDiskWasmLoader, createNodeTransport } from "@audiotool/nexus/node"
import { normalizeProjectRef } from "./nexus/project-ref.js"

export async function createClientFromEnv(): Promise<AudiotoolClient> {
  const pat = process.env.AUDIOTOOL_PAT
  if (pat !== undefined && pat !== "") {
    return createAudiotoolClient({
      auth: pat,
      transport: createNodeTransport(),
      wasm: createDiskWasmLoader(),
    })
  }

  const accessToken = process.env.AUDIOTOOL_ACCESS_TOKEN
  const refreshToken = process.env.AUDIOTOOL_REFRESH_TOKEN
  const clientId = process.env.AUDIOTOOL_CLIENT_ID
  if (accessToken && refreshToken && clientId) {
    return createAudiotoolClient({
      auth: createServerAuth({
        accessToken,
        refreshToken,
        // Unix ms; 0 forces an immediate refresh, then the SDK manages expiry.
        expiresAt: 0,
        clientId,
      }),
      transport: createNodeTransport(),
      wasm: createDiskWasmLoader(),
    })
  }

  throw new Error(
    "No credentials: set AUDIOTOOL_PAT (developer.audiotool.com/personal-access-tokens) " +
      "or AUDIOTOOL_ACCESS_TOKEN + AUDIOTOOL_REFRESH_TOKEN + AUDIOTOOL_CLIENT_ID in bot/.env",
  )
}

/**
 * The project to operate on, as the canonical `projects/<uuid>` name.
 *
 * Accepts a studio URL from either host, a `projects/<uuid>` name, or a bare
 * uuid - see normalizeProjectRef, which owns the parsing and the error text.
 */
export function projectFromEnv(): string {
  return normalizeProjectRef(process.env.AUDIOTOOL_PROJECT_URL)
}
