/**
 * 云同步 API：列出/验证密钥
 * GET /api/sync?key=<密钥>
 *
 * 数据存储在 EdgeOne Blob（store: resume-sync，strong consistency）
 * Blob key 布局：resumes/<scope>/<id>，scope = sha256hex(key + SYNC_SALT)
 * Blob value 为客户端 JSON.stringify(resumeData) 的原样字符串（MD5 一致性关键：原样透传）
 */
import { getStore } from "@edgeone/pages-blob"
import { createHash } from "node:crypto"

const STORE_NAME = "resume-sync"
const KEY_PREFIX = "resumes"
/** Cloud Function 请求体上限 6MB，留安全余量 */
const MAX_PAYLOAD = 5 * 1024 * 1024

function md5hex(s) {
  return createHash("md5").update(s).digest("hex")
}

function sha256hex(s) {
  return createHash("sha256").update(s).digest("hex")
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  })
}

function getStore_() {
  // IRON RULE：strong consistency，写后立即可读
  return getStore({ name: STORE_NAME, consistency: "strong" })
}

function scopeOf(key, env) {
  return sha256hex(key + (env.SYNC_SALT || ""))
}

/** 站点口令守卫：SITE_PASSWORD 配置时要求 site_auth Cookie（与 Next middleware 同算法） */
function checkSiteAuth(request, env) {
  const pwd = (env.SITE_PASSWORD || "").trim()
  if (!pwd) return true
  const cookie = request.headers.get("cookie") || ""
  const m = /(?:^|;\s*)site_auth=([a-f0-9]{64})/.exec(cookie)
  return !!m && m[1] === sha256hex(pwd)
}

/** 密钥校验：空 → 400；SYNC_PASSWORD 配置且不匹配 → 401；未配置 → 任意非空 key 通过 */
function validateKey(key, env) {
  if (!key) return { ok: false, status: 400, error: "missing_key" }
  const fixed = (env.SYNC_PASSWORD || "").trim()
  if (fixed && key !== fixed) return { ok: false, status: 401, error: "invalid_key" }
  return { ok: true }
}

export async function onRequestGet(context) {
  const { request, env } = context
  if (!checkSiteAuth(request, env)) return json({ ok: false, error: "unauthorized" }, 401)

  const key = new URL(request.url).searchParams.get("key") || ""
  const v = validateKey(key, env)
  if (!v.ok) return json({ ok: false, error: v.error }, v.status)

  try {
    const store = getStore_()
    const prefix = `${KEY_PREFIX}/${scopeOf(key, env)}/`
    const { blobs } = await store.list({ prefix })

    const entries = await Promise.all(
      (blobs || []).map(async (b) => {
        const id = b.key.slice(prefix.length)
        const payload = await store.get(b.key)
        let updatedAt = null
        if (typeof payload === "string") {
          try {
            const parsed = JSON.parse(payload)
            if (parsed && typeof parsed.updatedAt === "string") updatedAt = parsed.updatedAt
          } catch {
            // payload 非法时不阻塞列表
          }
        }
        return { id, md5: md5hex(payload || ""), updatedAt }
      })
    )

    return json({ ok: true, entries })
  } catch (e) {
    return json({ ok: false, error: "storage_error", message: String(e && e.message ? e.message : e) }, 500)
  }
}
