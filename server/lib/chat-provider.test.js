/**
 * Chat provider selection and request shaping.
 *
 * OpenAI and IONOS both speak the chat-completions shape, but they are NOT
 * interchangeable: gpt-5.x rejects `max_tokens` and requires
 * `max_completion_tokens`. Verified against the live API - sending the body
 * this server used to send returns
 *
 *   400  Unsupported parameter: 'max_tokens' is not supported with this model.
 *
 * So the request body is per-provider, and that is the main thing these tests
 * pin. A future provider gets its own entry rather than an `if` in the route.
 */
import { describe, expect, it } from "vitest"
import { buildChatRequest, describeProviders, resolveProvider } from "./chat-provider.js"

describe("resolveProvider", () => {
  it("uses OpenAI when only an OpenAI key is present", () => {
    const provider = resolveProvider({ OPENAI_API_KEY: "sk-test" })

    expect(provider.id).toBe("openai")
    expect(provider.apiKey).toBe("sk-test")
  })

  it("uses IONOS when only an IONOS key is present", () => {
    const provider = resolveProvider({ IONOS_API_KEY: "ionos-test" })

    expect(provider.id).toBe("ionos")
  })

  it("prefers OpenAI when both keys are set and no preference is given", () => {
    const provider = resolveProvider({ OPENAI_API_KEY: "sk-test", IONOS_API_KEY: "i" })

    expect(provider.id).toBe("openai")
  })

  it("honours CHAT_PROVIDER when both keys are set", () => {
    expect(
      resolveProvider({ OPENAI_API_KEY: "sk", IONOS_API_KEY: "i", CHAT_PROVIDER: "ionos" }).id,
    ).toBe("ionos")
    expect(
      resolveProvider({ OPENAI_API_KEY: "sk", IONOS_API_KEY: "i", CHAT_PROVIDER: "openai" }).id,
    ).toBe("openai")
  })

  it("ignores CHAT_PROVIDER naming a provider with no key, rather than failing silently", () => {
    // Asking for openai without an OpenAI key should not quietly use IONOS and
    // leave someone wondering which model answered.
    const provider = resolveProvider({ IONOS_API_KEY: "i", CHAT_PROVIDER: "openai" })

    expect(provider.id).toBe("none")
    expect(provider.reason).toMatch(/OPENAI_API_KEY/)
  })

  it("reports 'none' with an actionable reason when nothing is configured", () => {
    const provider = resolveProvider({})

    expect(provider.id).toBe("none")
    expect(provider.reason).toMatch(/OPENAI_API_KEY|IONOS_API_KEY/)
  })

  it("treats blank and whitespace-only keys as absent", () => {
    expect(resolveProvider({ OPENAI_API_KEY: "" }).id).toBe("none")
    expect(resolveProvider({ OPENAI_API_KEY: "   " }).id).toBe("none")
  })

  it("defaults the model per provider but lets the environment override", () => {
    expect(resolveProvider({ OPENAI_API_KEY: "sk" }).model).toBe("gpt-5.4-mini")
    expect(resolveProvider({ OPENAI_API_KEY: "sk", OPENAI_CHAT_MODEL: "gpt-5.5" }).model).toBe(
      "gpt-5.5",
    )
    expect(resolveProvider({ IONOS_API_KEY: "i" }).model).toMatch(/Llama/i)
  })

  it("points each provider at its own endpoint", () => {
    expect(resolveProvider({ OPENAI_API_KEY: "sk" }).baseUrl).toMatch(/api\.openai\.com/)
    expect(resolveProvider({ IONOS_API_KEY: "i" }).baseUrl).toMatch(/ionos/)
  })

  it("never puts the key in a field meant for display", () => {
    const provider = resolveProvider({ OPENAI_API_KEY: "sk-super-secret" })

    expect(JSON.stringify(describeProviders(provider))).not.toContain("sk-super-secret")
  })
})

describe("buildChatRequest", () => {
  const messages = [{ role: "user", content: "hi" }]

  it("sends max_completion_tokens for OpenAI, because max_tokens is rejected", () => {
    const provider = resolveProvider({ OPENAI_API_KEY: "sk" })

    const body = JSON.parse(buildChatRequest(provider, messages, 300).body)

    expect(body.max_completion_tokens).toBe(300)
    expect(body.max_tokens).toBeUndefined()
  })

  it("sends max_tokens for IONOS, which expects the older field", () => {
    const provider = resolveProvider({ IONOS_API_KEY: "i" })

    const body = JSON.parse(buildChatRequest(provider, messages, 300).body)

    expect(body.max_tokens).toBe(300)
    expect(body.max_completion_tokens).toBeUndefined()
  })

  it("targets the provider's chat-completions endpoint", () => {
    expect(buildChatRequest(resolveProvider({ OPENAI_API_KEY: "sk" }), messages, 10).url).toBe(
      "https://api.openai.com/v1/chat/completions",
    )
    expect(buildChatRequest(resolveProvider({ IONOS_API_KEY: "i" }), messages, 10).url).toMatch(
      /\/chat\/completions$/,
    )
  })

  it("authorises with a bearer token and sends JSON", () => {
    const request = buildChatRequest(resolveProvider({ OPENAI_API_KEY: "sk-abc" }), messages, 10)

    expect(request.headers.Authorization).toBe("Bearer sk-abc")
    expect(request.headers["Content-Type"]).toBe("application/json")
  })

  it("passes the messages through untouched", () => {
    const provider = resolveProvider({ OPENAI_API_KEY: "sk" })
    const conversation = [
      { role: "system", content: "you are a coach" },
      { role: "user", content: "help" },
    ]

    expect(JSON.parse(buildChatRequest(provider, conversation, 10).body).messages).toEqual(
      conversation,
    )
  })

  it("carries the resolved model", () => {
    const provider = resolveProvider({ OPENAI_API_KEY: "sk", OPENAI_CHAT_MODEL: "gpt-5.4-nano" })

    expect(JSON.parse(buildChatRequest(provider, messages, 10).body).model).toBe("gpt-5.4-nano")
  })

  it("refuses to build a request when no provider is configured", () => {
    // The message has to name the variable to set, not just say "no".
    expect(() => buildChatRequest(resolveProvider({}), messages, 10)).toThrow(/OPENAI_API_KEY/)
  })
})

describe("describeProviders", () => {
  it("reports which provider is live and which models, for /api/health", () => {
    const summary = describeProviders(resolveProvider({ OPENAI_API_KEY: "sk" }))

    expect(summary.active).toBe("openai")
    expect(summary.model).toBe("gpt-5.4-mini")
    expect(summary.configured).toBe(true)
  })

  it("says plainly when nothing is configured", () => {
    const summary = describeProviders(resolveProvider({}))

    expect(summary.configured).toBe(false)
    expect(summary.active).toBe("none")
  })
})
