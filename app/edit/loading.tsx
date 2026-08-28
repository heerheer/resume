import { Skeleton } from "@/components/ui/skeleton"

/**
 * 编辑页路由级骨架屏：
 * 首次进入 /edit/* 时路由 chunk（tiptap 等较重依赖）尚在下载，
 * loading.tsx 让导航立即提交并显示骨架，避免“点击后卡顿无反馈”。
 */
export default function EditLoading() {
  return (
    <main className="resume-editor bg-background">
      {/* 工具栏骨架 */}
      <div className="editor-toolbar">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-[220px]" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      {/* 内容区骨架：左侧编辑面板 + 右侧预览面板 */}
      <div className="editor-content">
        <div className="editor-panel">
          <div className="p-6 space-y-6">
            <div className="rounded-xl border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="rounded-xl border p-4 space-y-4">
              <Skeleton className="h-5 w-24" />
              <div className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-2/3" />
              </div>
            </div>
            <div className="rounded-xl border p-4 space-y-4">
              <Skeleton className="h-5 w-24" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
            <div className="rounded-xl border p-4 space-y-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </div>
        <div className="preview-panel">
          <div className="pdf-preview-mode bg-white">
            <div className="mx-auto w-3xl bg-white shadow-lg p-8 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
