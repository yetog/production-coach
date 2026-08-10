/**
 * Where the API lives, derived rather than hardcoded (issue #41).
 *
 * The deployment path used to be written out in three places - Vite's `base`,
 * the hardcoded '/production-coach/api' in useApi, and the dev proxy's '/api'
 * rule. They drifted, and the result was that `npm run dev` could not reach
 * the API at all: requests to /production-coach/api/health did not match the
 * '/api' proxy key, fell through to the SPA, and came back as HTML.
 *
 * Now `base` is the single source of truth. This module derives the API path
 * from it, and vite.config.ts builds its proxy rule from the same constant.
 */

/** The path segment the API is mounted under, relative to the app's base. */
export const API_PATH_SUFFIX = "api"

/**
 * @param baseUrl  Vite's `import.meta.env.BASE_URL` - always a path like
 *                 "/production-coach/", or "/" for a root deployment.
 * @param override `VITE_API_URL`, for pointing at an API on another origin.
 */
export function resolveApiBase(baseUrl: string | undefined, override?: string): string {
  const explicit = override?.trim()
  if (explicit !== undefined && explicit !== "") {
    return explicit.replace(/\/+$/, "")
  }

  // Collapse repeated slashes and guarantee exactly one before the suffix, so
  // a base of "/" does not produce "//api" - which some proxies treat as a
  // different route entirely.
  const normalized = `/${(baseUrl ?? "/").replace(/^\/+|\/+$/g, "")}`.replace(/\/{2,}/g, "/")
  return normalized === "/" ? `/${API_PATH_SUFFIX}` : `${normalized}/${API_PATH_SUFFIX}`
}
