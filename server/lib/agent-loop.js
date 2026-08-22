import { generateText, stepCountIs, streamText } from "ai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

/**
 * Build a Vercel AI SDK model for either configured OpenAI-shaped provider.
 * OpenAI's current reasoning models reject max_tokens; IONOS still expects it.
 */
export function createProviderModel(provider) {
  const transformRequestBody = (body) => {
    if (provider.id !== "openai" || body.max_tokens === undefined) return body
    const { max_tokens: maxTokens, ...rest } = body
    return { ...rest, max_completion_tokens: maxTokens }
  }

  const compatible = createOpenAICompatible({
    name: `dr-zay.${provider.id}`,
    apiKey: provider.apiKey,
    baseURL: provider.baseUrl,
    includeUsage: true,
    transformRequestBody,
  })
  const model = compatible.chatModel(provider.model)

  // Expose non-secret diagnostics for tests/health; never attach the key.
  Object.defineProperty(model, "__drZayConfig", {
    value: { transformRequestBody },
    enumerable: false,
  })
  return model
}

/**
 * Run one bounded Dr. Zay turn. The SDK owns the model → tool → result loop;
 * the caller owns persistence, user approval, and transport streaming.
 */
export async function runDrZayTurn({
  model,
  messages,
  tools,
  system,
  maxSteps = 5,
  maxOutputTokens = 800,
  generate = generateText,
}) {
  return await generate({
    model,
    system,
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps),
    maxOutputTokens,
  })
}

/** Streaming counterpart used by web and extension clients. */
export function streamDrZayTurn({
  model,
  messages,
  tools,
  system,
  maxSteps = 5,
  maxOutputTokens = 800,
}) {
  return streamText({
    model,
    system,
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps),
    maxOutputTokens,
  })
}
