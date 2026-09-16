import { readFileSync } from "node:fs"
import { join } from "node:path"

/**
 * ASu-skills 内置技能加载器（仅服务端使用）。
 *
 * 读取内置的 ASu-skills 中用于"简历提升/经历酥化"的 great-resume 技能，
 * 将 SKILL.md 及其引用的 references 拼装成 AI 优化请求的 system prompt。
 * 该文件不依赖任何运行时网络，构建期内置，保证后端离线可用。
 */

const SKILL_ROOT = join(
  process.cwd(),
  "agent",
  "skills",
  "asu-skills",
  "skills",
  "great-resume"
)

const REFERENCE_FILES = ["claim-evidence-ledger.md", "business-analysis-evidence.md"]

let cachedPrompt: string | null = null

function readSkillFile(relPath: string): string {
  return readFileSync(join(SKILL_ROOT, relPath), "utf-8")
}

/**
 * 组装 great-resume 技能的完整 system prompt。
 * 结果在首次调用后缓存，避免每次请求重复读盘。
 */
export function buildAsuSystemPrompt(): string {
  if (cachedPrompt) return cachedPrompt

  const skill = readSkillFile("SKILL.md")
  const references = REFERENCE_FILES.map((file) => {
    const body = readSkillFile(join("references", file))
    const header = `\n\n===== 参考：${file} =====\n`
    return header + "```\n" + body + "\n```"
  }).join("\n")

  // 附加本场景的输出契约：针对输入框单段文本做"酥化改写"
  const contract = `\n\n===== 当前任务契约 =====
用户会提交简历中某一处的一句话/一段经历文本，请用上面的\"简历提升\"方法改写它。
硬性要求：
1. 只输出改写后的文本本身，不要任何解释、标题、Markdown 符号或多余前缀。
2. 保留换行结构，多要点时每行一条。
3. 遵循表达边界：不虚构职位、公司、时间、技术栈、数字或成果。
`

  cachedPrompt = skill + references + contract
  return cachedPrompt
}