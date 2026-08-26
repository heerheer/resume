"use client"

import { use, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Icon } from "@iconify/react"
import type { ResumeData, StoredResume } from "@/types/resume"
import { getResumeById } from "@/lib/storage"
import { getCloudResume, getSyncKey, SyncError } from "@/lib/sync"
import ResumePreview from "@/components/resume-preview"

const CLOUD_SUFFIX = "-cloud"

export default function ViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const isCloud = id.endsWith(CLOUD_SUFFIX)
  const realId = isCloud ? id.slice(0, -CLOUD_SUFFIX.length) : id

  return isCloud ? (
    <CloudViewPage id={realId} />
  ) : (
    <LocalViewPage id={realId} />
  )
}

function LocalViewPage({ id }: { id: string }) {
  const router = useRouter()
  const entry = useMemo<StoredResume | null>(() => getResumeById(id), [id])

  if (!entry) {
    return (
      <main className="min-h-screen bg-background p-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => router.push("/")}>
            <Icon icon="mdi:arrow-left" className="w-4 h-4" /> 返回
          </Button>
          <span className="text-sm text-destructive">未找到该简历</span>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => router.push("/")}>
            <Icon icon="mdi:arrow-left" className="w-4 h-4" /> 返回
          </Button>
          <span className="text-sm text-muted-foreground">预览：{entry.resumeData.title}</span>
        </div>
      </div>
      <Separator />
      <div className="p-4">
        <div className="preview-panel w-full">
          <ResumePreview resumeData={entry.resumeData} />
        </div>
      </div>
    </main>
  )
}

function CloudViewPage({ id }: { id: string }) {
  const router = useRouter()
  const [data, setData] = useState<ResumeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const key = getSyncKey()
      if (!key) {
        if (!cancelled) {
          setError("未配置云同步密钥，无法查看云端数据")
          setLoading(false)
        }
        return
      }
      try {
        const c = await getCloudResume(key, id)
        const parsed = JSON.parse(c.payload) as ResumeData
        if (!cancelled) {
          setData(parsed)
          setLoading(false)
        }
      } catch (e) {
        if (cancelled) return
        const message = e instanceof SyncError && e.code === "INVALID_KEY"
          ? "云同步密钥已失效，请回到主页重新验证"
          : e instanceof Error ? e.message : "获取云端数据失败"
        setError(message)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  return (
    <main className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => router.push("/")}>
            <Icon icon="mdi:arrow-left" className="w-4 h-4" /> 返回
          </Button>
          <span className="text-sm text-muted-foreground">
            预览（云端）：{data?.title ?? (loading ? "加载中..." : "")}
          </span>
        </div>
      </div>
      <Separator />
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" /> 正在从云端加载...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-destructive">
            <Icon icon="mdi:cloud-alert-outline" className="w-4 h-4" /> {error}
          </div>
        ) : data ? (
          <div className="preview-panel w-full">
            <ResumePreview resumeData={data} />
          </div>
        ) : null}
      </div>
    </main>
  )
}
