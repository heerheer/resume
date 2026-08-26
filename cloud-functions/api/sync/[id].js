/**
 * 云同步 API：单条简历的读取 / 推送 / 删除
 * GET    /api/sync/<id>?key=<密钥>       → { ok, id, md5, payload }
 * PUT    /api/sync/<id>  body { key, payload } → { ok, id, md5 }
 * DELETE /api/sync/<id>?key=<密钥>       → { ok }
 *
 * Blob value 为客户端 JSON.stringify(resumeData) 的原样字符串（原样透传保证 MD5 一致）
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

function checkSiteAuth(request, env) {
  const pwd = (env.SITE_PASSWORD || "").trim()
  if (!pwd) return true
  const cookie = request.headers.get("cookie") || ""
  const m = /(?:^|;\s*)site_auth=([a-f0-9]{64})/.exec(cookie)
  return !!m && m[1] === sha256hex(pwd)
}

function validateKey(key, env) {
  if (!key) return { ok: false, status: 400, error: "missing_key" }
  const fixed = (env.SYNC_PASSWORD || "").trim()
  if (fixed && key !== fixed) return { ok: false, status: 401, error: "invalid_key" }
  return { ok: true }
}

/** id 白名单校验，防路径穿越 */
function isValidId(id) {
  return typeof id === "string" && /^[A-Za-z0-9-]{1,64}$/.test(id)
}

function blobKeyOf(key, env, id) {
  return `${KEY_PREFIX}/${scopeOf(key, env)}/${id}`
}

export async function onRequestGet(context) {
  const { request, params, env } = context
  if (!checkSiteAuth(request, env)) return json({ ok: false, error: "unauthorized" }, 401)

  const key = new URL(request.url).searchParams.get("key") || ""
  const v = validateKey(key, env)
  if (!v.ok) return json({ ok: false, error: v.error }, v.status)

  const id = params.id
  if (!isValidId(id)) return json({ ok: false, error: "invalid_id" }, 400)

  try {
    const store = getStore_()
    const payload = await store.get(blobKeyOf(key, env, id))
    if (payload === null || payload === undefined) {
      return json({ ok: false, error: "not_found" }, 404)
    }
    return json({ ok: true, id, md5: md5hex(payload), payload })
  } catch (e) {
    return json({ ok: false, error: "storage_error", message: String(e && e.message ? e.message : e) }, 500)
  }
}

export async function onRequestPut(context) {
  const { request, params, env } = context
  if (!checkSiteAuth(request, env)) return json({ ok: false, error: "unauthorized" }, 401)

  let body = null
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: "invalid_body" }, 400)
  }
  if (!body || typeof body.key !== "string" || typeof body.payload !== "string") {
    return json({ ok: false, error: "invalid_body" }, 400)
  }

  const v = validateKey(body.key, env)
  if (!v.ok) return json({ ok: false, error: v.error }, v.status)

  const id = params.id
  if (!isValidId(id)) return json({ ok: false, error: "invalid_id" }, 400)

  const { payload } = body
  if (payload.length > MAX_PAYLOAD) return json({ ok: false, error: "payload_too_large" }, 413)
  try {
    JSON.parse(payload)
  } catch {
    return json({ ok: false, error: "invalid_payload" }, 400)
  }

  try {
    const store = getStore_()
    await store.set(blobKeyOf(body.key, env, id), payload)
    return json({ ok: true, id, md5: md5hex(payload) })
  } catch (e) {
    return json({ ok: false, error: "storage_error", message: String(e && e.message ? e.message : e) }, 500)
  }
}

export async function onRequestDelete(context) {
  const { request, params, env } = context
  if (!checkSiteAuth(request, env)) return json({ ok: false, error: "unauthorized" }, 401)

  const key = new URL(request.url).searchParams.get("key") || ""
  const v = validateKey(key, env)
  if (!v.ok) return json({ ok: false, error: v.error }, v.status)

  const id = params.id
  if (!isValidId(id)) return json({ ok: false, error: "invalid_id" }, 400)

  try {
    const store = getStore_()
    await store.delete(blobKeyOf(key, env, id))
    return json({ ok: true })
  } catch (e) {
    return json({ ok: false, error: "storage_error", message: String(e && e.message ? e.message : e) }, 500)
  }
}
