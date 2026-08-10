/**
 * Request guards for the API server (issue #42).
 *
 * Small, boring, and the reason a bad demo becomes a recoverable one.
 */

/**
 * Character cap on text sent to ElevenLabs.
 *
 * ElevenLabs bills per character. The coach's system prompt asks for two or
 * three sentences, so a long real reply is a few hundred characters - this cap
 * sits far above anything legitimate and only catches a runaway loop or
 * someone pointing a script at the deployed URL. It is a credit guard, not a
 * content policy.
 */
export const MAX_TTS_CHARS = 5000

/** Upstream deadlines. Chat is generous; speech should feel immediate. */
export const CHAT_TIMEOUT_MS = 30_000
export const TTS_TIMEOUT_MS = 20_000

/**
 * Run an upstream call with a deadline.
 *
 * `run` receives an AbortSignal and should hand it to fetch, so a timeout
 * actually releases the socket rather than leaving it dangling while we stop
 * waiting for it.
 *
 * @param {(signal: AbortSignal) => Promise<T>} run
 * @param {number} timeoutMs
 * @returns {Promise<T>}
 * @template T
 */
export async function fetchWithTimeout(run, timeoutMs) {
  const controller = new AbortController()
  let timer

  // The deadline is enforced by racing, not by trusting `run` to honour the
  // signal. Aborting alone is not enough: if the callee ignores its signal -
  // or a transport swallows the abort - awaiting it would still hang forever,
  // which is the exact failure this function exists to prevent. We abort too,
  // so the underlying socket is released rather than merely ignored.
  const deadline = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new Error(`Upstream request timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([run(controller.signal), deadline])
  } finally {
    clearTimeout(timer)
  }
}

/**
 * @returns {{ok: true, text: string} | {ok: false, status: number, error: string}}
 */
export function validateTtsText(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return { ok: false, status: 400, error: "Field `text` must be a non-empty string." }
  }
  const text = value.trim()
  if (text.length > MAX_TTS_CHARS) {
    return {
      ok: false,
      status: 400,
      error: `Field \`text\` is ${text.length} characters; the limit is ${MAX_TTS_CHARS}.`,
    }
  }
  return { ok: true, text }
}

/**
 * Validate the conversation and normalize roles for the OpenAI-shaped API.
 * Previously this was `.map`ped unchecked, so a malformed body became an
 * opaque 500 instead of a 400 that says what is wrong.
 *
 * @returns {{ok: true, messages: Array<{role: string, content: string}>}
 *   | {ok: false, status: number, error: string}}
 */
export function validateChatMessages(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, status: 400, error: "Field `messages` must be a non-empty array." }
  }
  const messages = []
  for (const message of value) {
    if (
      message === null ||
      typeof message !== "object" ||
      typeof message.role !== "string" ||
      typeof message.content !== "string"
    ) {
      return {
        ok: false,
        status: 400,
        error: "Each message needs a string `role` and a string `content`.",
      }
    }
    messages.push({
      role: message.role === "coach" ? "assistant" : message.role,
      content: message.content,
    })
  }
  return { ok: true, messages }
}
