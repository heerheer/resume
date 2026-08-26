"use client"

import { use, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import ResumeBuilder from "@/components/resume-builder"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import type { ResumeData, StoredResume } from "@/types/resume"
import { getResumeById, updateEntryData, StorageError } from "@/lib/storage"
import { autoSyncIfEnabled } from "@/lib/sync"
import { useToast } from "@/hooks/use-toast"

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [, setCurrentData] = useState<ResumeData | null>(null)

  const entry = useMemo<StoredResume | null>(() => getResumeById(id), [id])

  const handleSave = async (data: ResumeData) => {
    try {
      const updated = updateEntryData(id, data)
      toast({ title: "保存成功", description: new Date(updated.updatedAt).toLocaleString() })
      // 启用云同步密钥时自动同步（失败提示，不阻塞本地保存）。
      // 推送 updateEntryData 落库后的 merged 数据，保证与本地存储 MD5 一致，避免刚保存即被误判为冲突
      void autoSyncIfEnabled(id, updated.resumeData).then((r) => {
        if (!r.synced && r.message) {
          toast({ title: "云同步失败", description: r.message, variant: "destructive" })
        }
      })
    } catch (e: unknown) {
      if (e instanceof StorageError && e.code === "QUOTA_EXCEEDED") {
        toast({
          title: "保存失败：存储空间不足",
          description: "请删除一些旧的简历，或导出为 JSON 文件后清理存储。",
          variant: "destructive",
        })
      } else {
        const message = e instanceof Error ? e.message : "未知错误"
        toast({ title: "保存失败", description: message, variant: "destructive" })
      }
    }
  }

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
      <ResumeBuilder
        initialData={entry.resumeData}
        onChange={setCurrentData}
        onBack={() => router.push("/")}
        onSave={(data) => handleSave(data)}
      />
    </main>
  )
}
