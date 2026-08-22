import { describe, expect, it, vi } from "vitest"
import { createProviderModel, runDrZayTurn } from "./agent-loop.js"

describe("Dr. Zay tool loop", () => {
  it("uses the provider's compatible endpoint and preserves OpenAI's token field", () => {
    const model = createProviderModel({
      id: "openai",
      apiKey: "secret",
      model: "gpt-5.4-mini",
      baseUrl: "https://api.openai.com/v1",
    })

    expect(model.modelId).toBe("gpt-5.4-mini")
    const transformed = model.__drZayConfig.transformRequestBody({ max_tokens: 300, model: "x" })
    expect(transformed).toEqual({ max_completion_tokens: 300, model: "x" })
  })

  it("keeps IONOS on max_tokens", () => {
    const model = createProviderModel({
      id: "ionos",
      apiKey: "secret",
      model: "llama",
      baseUrl: "https://ionos.example/v1",
    })

    expect(model.__drZayConfig.transformRequestBody({ max_tokens: 300 })).toEqual({ max_tokens: 300 })
  })

  it("passes typed tools into a multi-step model call and returns tool results", async () => {
    const generate = vi.fn().mockResolvedValue({
      text: "I found the drop in bars 33-48.",
      steps: [{ toolCalls: [{ toolName: "analyze_session" }], toolResults: [{ output: { tempoBpm: 128 } }] }],
    })
    const tools = { analyze_session: { description: "analyze", inputSchema: {} } }

    const result = await runDrZayTurn({
      model: { modelId: "test" },
      messages: [{ role: "user", content: "where is the drop?" }],
      tools,
      generate,
    })

    expect(result.text).toContain("bars 33-48")
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({
      model: { modelId: "test" },
      messages: [{ role: "user", content: "where is the drop?" }],
      tools,
    }))
  })
})
