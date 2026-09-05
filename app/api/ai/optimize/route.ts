import { NextRequest, NextResponse } from "next/server"
import { buildAsuSystemPrompt } from "@/lib/asu-skills"
import { chat, AiNotConfiguredError } from "@/lib/ai-provider"

/**
 * POST /api/ai/optimize
 *
 * 使用内置 ASu-skills（great-resume 简历提升）对一段简历文本做"酥化"改写。
 * 一次性返回优化后的纯文本。
 */
export async function POST(req: NextRequest) {
  let text: string
  let moduleTitle: string | undefined

  try {
    const body = await req.json()
    text = String(body?.text ?? "").trim()
    moduleTitle = body?.moduleTitle ? String(body.moduleTitle).trim() : undefined
  } catch {
    return NextResponse.json({ error: "请求格式错误。" }, { status: 400 })
  }

  if (!text) {
    return NextResponse.json({ error: "请输入需要优化的文本。" }, { status: 400 })
  }

  const contextLine = moduleTitle
    ? `\n这段文本属于简历模块「${moduleTitle}」。请结合该模块的语境改写。\n`
    : ""

  const messages = [
    { role: "system" as const, content: buildAsuSystemPrompt() },
    {
      role: "user" as const,
      content: `${contextLine}\n需要优化的文本如下：\n${text}`,
    },
  ]

  try {
    const optimized = await chat(messages)
    return NextResponse.json({ text: optimized.trim() })
  } catch (err) {
    if (err instanceof AiNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 501 })
    }
    console.error("[ai/optimize] 调用失败:", err)
    return NextResponse.json(
      { error: "AI 优化服务暂时不可用，请稍后重试。" },
      { status: 502 }
    )
  }
}