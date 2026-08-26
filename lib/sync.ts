"use client"

import { md5 } from "@/lib/md5"
import type { ResumeData } from "@/types/resume"

/** 云同步密钥在 localStorage 中的 key */
const SYNC_KEY_STORAGE = "resume.sync.key"

/** 客户端单条简历 payload 的安全上限（服务端 Cloud Function 上限 6MB，留余量） */
const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024

export type SyncErrorCode =
  | "INVALID_KEY"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "PAYLOAD_TOO_LARGE"
  | "UNAVAILABLE"
  | "UNKNOWN"

export class SyncError extends Error {
  code: SyncErrorCode
  constructor(message: string, code: SyncErrorCode = "UNKNOWN") {
    super(message)
    this.code = code
    this.name = "SyncError"
  }
}

export interface CloudEntry {
  id: string
  md5: string
  updatedAt: string | null
}

export interface CloudResume {
  id: string
  md5: string
  payload: string
}

function ensureClient() {
  if (typeof window === "undefined") {
    throw new SyncError("只能在浏览器环境中使用云同步", "UNAVAILABLE")
  }
}

export function getSyncKey(): string | null {
  try {
    return window.localStorage.getItem(SYNC_KEY_STORAGE)
  } catch {
    return null
  }
}

export function setSyncKey(key: string): void {
  window.localStorage.setItem(SYNC_KEY_STORAGE, key)
}

export function clearSyncKey(): void {
  try {
    window.localStorage.removeItem(SYNC_KEY_STORAGE)
  } catch {
    // ignore
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } })
  } catch {
    throw new SyncError("网络请求失败，云同步服务不可达", "UNAVAILABLE")
  }
}

/** 非 2xx 响应统一转换为 SyncError */
async function parseError(res: Response): Promise<never> {
  let body: Record<string, unknown> = {}
  try {
    body = (await res.json()) as Record<string, unknown>
  } catch {
    // ignore
  }
  const error = typeof body.error === "string" ? body.error : ""
  if (res.status === 401 && error === "invalid_key") {
    throw new SyncError("云同步密钥无效", "INVALID_KEY")
  }
  if (res.status === 401) {
    throw new SyncError("无权访问云同步服务", "UNAUTHORIZED")
  }
  if (res.status === 404 && error === "not_found") {
    throw new SyncError("云端未找到该简历", "NOT_FOUND")
  }
  if (res.status === 413) {
    throw new SyncError("简历数据过大，超过云同步限制", "PAYLOAD_TOO_LARGE")
  }
  // 404（路由不存在）或其它：均视为同步服务不可用（如部署平台未启用 cloud-functions）
  throw new SyncError("云同步服务不可用", "UNAVAILABLE")
}

/** 列出云端全部简历（同时用于密钥验证） */
export async function listCloud(key: string): Promise<CloudEntry[]> {
  const res = await request(`/api/sync?key=${encodeURIComponent(key)}`)
  if (!res.ok) await parseError(res)
  try {
    const body = (await res.json()) as { ok: boolean; entries: CloudEntry[] }
    return body.entries ?? []
  } catch (e) {
    if (e instanceof SyncError) throw e
    throw new SyncError("云同步响应解析失败", "UNKNOWN")
  }
}

/** 读取云端单条简历（原样 payload 字符串） */
export async function getCloudResume(key: string, id: string): Promise<CloudResume> {
  const res = await request(`/api/sync/${encodeURIComponent(id)}?key=${encodeURIComponent(key)}`)
  if (!res.ok) await parseError(res)
  try {
    const body = (await res.json()) as CloudResume & { ok: boolean }
    return { id: body.id, md5: body.md5, payload: body.payload }
  } catch (e) {
    if (e instanceof SyncError) throw e
    throw new SyncError("云同步响应解析失败", "UNKNOWN")
  }
}

/** 将本地简历推送（覆盖）到云端 */
export async function pushResume(key: string, id: string, resumeData: ResumeData): Promise<{ md5: string }> {
  const payload = JSON.stringify(resumeData)
  if (payload.length > MAX_PAYLOAD_SIZE) {
    throw new SyncError("简历数据过大（超过 5MB），无法云同步", "PAYLOAD_TOO_LARGE")
  }
  const res = await request(`/api/sync/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ key, payload }),
  })
  if (!res.ok) await parseError(res)
  try {
    const body = (await res.json()) as { ok: boolean; md5: string }
    return { md5: body.md5 }
  } catch (e) {
    if (e instanceof SyncError) throw e
    throw new SyncError("云同步响应解析失败", "UNKNOWN")
  }
}

/** 删除云端单条简历 */
export async function deleteCloudResume(key: string, id: string): Promise<void> {
  const res = await request(`/api/sync/${encodeURIComponent(id)}?key=${encodeURIComponent(key)}`, {
    method: "DELETE",
  })
  if (!res.ok) await parseError(res)
}

/** 计算本地简历数据的 MD5（与服务端对 payload 的计算保持一致） */
export function payloadMd5(resumeData: ResumeData): string {
  return md5(JSON.stringify(resumeData))
}

/**
 * 启用密钥时自动同步：无密钥时静默跳过；失败返回错误信息供调用方提示。
 */
export async function autoSyncIfEnabled(id: string, resumeData: ResumeData): Promise<{ synced: boolean; message?: string }> {
  let key: string | null = null
  try {
    key = getSyncKey()
  } catch {
    key = null
  }
  if (!key) return { synced: true }
  try {
    await pushResume(key, id, resumeData)
    return { synced: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "云同步失败"
    return { synced: false, message }
  }
}
