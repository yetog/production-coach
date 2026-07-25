/**
 * Minimal .env loader - no dependency, loads bot/.env if present.
 * Existing process.env values win.
 */
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

export function loadEnv(): void {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".env")
  let raw: string
  try {
    raw = readFileSync(envPath, "utf8")
  } catch {
    return
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    if (trimmed === "" || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "")
    if (process.env[key] === undefined) process.env[key] = value
  }
}
