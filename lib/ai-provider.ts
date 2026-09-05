import OpenAI from "openai"

/**
 * AI Provider 薄封装（仅服务端使用）。
 *
 * 目标：通过环境变量配置一个 OpenAI 兼容的 Chat Completions 端点
 * （默认指向 Oracle OCI Generative AI 的 OpenAI 兼容端点），
 * 上层只需要调用 chat() 即可，无需关心具体 provider。
 *
 * 后续若需支持 Agent / 工具调用 / 多步工作流，可在本模块内部扩展：
 * 例如使用 OCI Responses API 或 Vercel AI SDK 的多步 agent loop，
 * 对外保持 chat() 与现有 API 契约不变。
 */

export interface ChatMessage {
  role: "system" | "user"
  content: string
}

export interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
}

export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const baseURL = process.env.AI_API_BASE_URL
  const apiKey = process.env.AI_API_KEY

  if (!baseURL || !apiKey) {
    throw new AiNotConfiguredError(
      "AI 服务未配置，请在环境变量中设置 AI_API_BASE_URL 与 AI_API_KEY。"
    )
  }

  const client = new OpenAI({ baseURL, apiKey })

  const model =
    options.model ??
    process.env.AI_MODEL ??
    "cohere.command-a-03-2025"

  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2048,
  })

  const content = completion.choices?.[0]?.message?.content
  if (!content) {
    throw new Error("AI 服务返回为空。")
  }
  return content
}

export class AiNotConfiguredError extends Error {}