/**
 * Which model provider answers as Dr. Zay, and how to ask it.
 *
 * OpenAI and IONOS both speak the chat-completions shape, but they are **not**
 * interchangeable. Verified against the live OpenAI API: sending the body this
 * server previously sent returns
 *
 *   400  Unsupported parameter: 'max_tokens' is not supported with this model.
 *        Use 'max_completion_tokens' instead.
 *
 * so the request body differs per provider. Keeping that difference in a table
 * here, rather than as a branch inside the route, is what makes adding a third
 * provider a data change instead of a code change.
 *
 * Nothing in this module logs or returns an API key.
 */

/** Per-provider differences. Everything else about the request is shared. */
const PROVIDERS = {
  openai: {
    keyVar: "OPENAI_API_KEY",
    modelVar: "OPENAI_CHAT_MODEL",
    baseUrlVar: "OPENAI_BASE_URL",
    defaultBaseUrl: "https://api.openai.com/v1",
    // Chosen by testing against the account: faster than nano AND better at
    // naming real Audiotool devices, which the action parser depends on.
    defaultModel: "gpt-5.4-mini",
    // gpt-5.x rejects max_tokens outright.
    tokenLimitField: "max_completion_tokens",
  },
  ionos: {
    keyVar: "IONOS_API_KEY",
    modelVar: "IONOS_CHAT_MODEL",
    baseUrlVar: "IONOS_BASE_URL",
    defaultBaseUrl: "https://openai.inference.de-txl.ionos.com/v1",
    defaultModel: "meta-llama/Meta-Llama-3.1-8B-Instruct",
    tokenLimitField: "max_tokens",
  },
}

/** Order used when several providers are configured and none is preferred. */
const PREFERENCE = ["openai", "ionos"]

function present(value) {
  return typeof value === "string" && value.trim() !== ""
}

/**
 * Decide which provider to use from the environment.
 *
 * @returns {{id: string, apiKey?: string, model?: string, baseUrl?: string,
 *   tokenLimitField?: string, reason?: string}}
 */
export function resolveProvider(env = process.env) {
  const configured = PREFERENCE.filter((id) => present(env[PROVIDERS[id].keyVar]))
  const requested = present(env.CHAT_PROVIDER) ? env.CHAT_PROVIDER.trim().toLowerCase() : undefined

  if (requested !== undefined) {
    const spec = PROVIDERS[requested]
    if (spec === undefined) {
      return {
        id: "none",
        reason: `CHAT_PROVIDER is "${requested}", which is not a known provider. Use ${Object.keys(PROVIDERS).join(" or ")}.`,
      }
    }
    if (!configured.includes(requested)) {
      // Silently falling back would leave someone reading answers from a model
      // they did not choose, with nothing in the logs to explain it.
      return {
        id: "none",
        reason: `CHAT_PROVIDER is "${requested}" but ${spec.keyVar} is not set.`,
      }
    }
    return build(requested, env)
  }

  const chosen = configured[0]
  if (chosen === undefined) {
    return {
      id: "none",
      reason:
        "No chat provider configured. Set OPENAI_API_KEY (recommended) or IONOS_API_KEY in .env.",
    }
  }
  return build(chosen, env)
}

function build(id, env) {
  const spec = PROVIDERS[id]
  return {
    id,
    apiKey: env[spec.keyVar].trim(),
    model: present(env[spec.modelVar]) ? env[spec.modelVar].trim() : spec.defaultModel,
    baseUrl: (present(env[spec.baseUrlVar]) ? env[spec.baseUrlVar].trim() : spec.defaultBaseUrl)
      // A trailing slash would produce //chat/completions, which some gateways
      // treat as a different route.
      .replace(/\/+$/, ""),
    tokenLimitField: spec.tokenLimitField,
  }
}

/**
 * Build the HTTP request for a chat completion.
 *
 * @returns {{url: string, headers: Record<string,string>, body: string}}
 */
export function buildChatRequest(provider, messages, maxTokens, options = {}) {
  if (provider.id === "none") {
    throw new Error(provider.reason ?? "Chat provider is not configured.")
  }

  const body = {
    model: provider.model,
    messages,
    temperature: options.temperature ?? 0.8,
  }
  // The one field that genuinely differs between providers.
  body[provider.tokenLimitField] = maxTokens

  return {
    url: `${provider.baseUrl}/chat/completions`,
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }
}

/**
 * Safe-to-expose summary for /api/health and boot logging. Never includes the
 * key - this is rendered in a browser.
 */
export function describeProviders(provider) {
  return {
    active: provider.id,
    configured: provider.id !== "none",
    model: provider.model,
    ...(provider.reason === undefined ? {} : { reason: provider.reason }),
  }
}
