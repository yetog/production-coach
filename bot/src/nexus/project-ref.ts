/**
 * Normalize whatever a human pastes into the canonical `projects/<uuid>` name
 * the SDK's client.open() expects (issue #18).
 *
 * The studio address bar hands out `https://www.audiotool.com/studio?project=<uuid>`,
 * the docs show `beta.audiotool.com`, and scripts pass bare uuids. All three
 * reach us, so all three are accepted. Anything that isn't recognisable fails
 * here with a message naming the env var, rather than being handed to the SDK
 * to fail as an opaque backend error.
 */

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

/** Placeholders shipped in .env.example that mean "you didn't fill this in". */
const PLACEHOLDERS = ["<project_id>", "<uuid>", "<id>"]

export function normalizeProjectRef(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim().replace(/^["']|["']$/g, "").trim()

  if (trimmed === "") {
    throw new Error(
      "No project specified. Set AUDIOTOOL_PROJECT_URL in bot/.env, or pass --project - " +
        "a studio URL, a projects/<uuid> name, or a bare uuid all work.",
    )
  }

  const lowered = trimmed.toLowerCase()
  if (PLACEHOLDERS.some((placeholder) => lowered.includes(placeholder))) {
    throw new Error(
      `"${trimmed}" is still the placeholder from .env.example. Open your project in ` +
        "the Audiotool studio and copy the URL from the address bar.",
    )
  }

  const match = UUID_PATTERN.exec(trimmed)
  if (match === null) {
    throw new Error(
      `Could not find a project id in "${trimmed}". Expected a studio URL ` +
        "(https://www.audiotool.com/studio?project=<uuid>), a projects/<uuid> name, or a uuid.",
    )
  }

  return `projects/${match[0].toLowerCase()}`
}
