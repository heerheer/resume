"use client"

import type React from "react"

import { useState, useEffect, useCallback, memo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import type { ResumeData, EditorState } from "@/types/resume"
import { createDefaultResumeData } from "@/lib/utils"
import { loadDefaultTemplate, loadExampleTemplate } from "@/lib/storage"
import ResumePreview from "./resume-preview"
import PersonalInfoEditor from "./personal-info-editor"
import JobIntentionEditor from "./job-intention-editor"
import ModuleEditor from "./module-editor"
import ExportButton from "./export-button"

type ViewMode = "both" | "edit-only" | "preview-only"

const ViewModeSelector = memo(
  ({
    viewMode,
    onViewModeChange,
  }: {
    viewMode: ViewMode
    onViewModeChange: (mode: ViewMode) => void
  }) => {
    const modes = [
      { key: "both" as ViewMode, label: "编辑+预览", icon: "mdi:view-split-vertical" },
      { key: "edit-only" as ViewMode, label: "仅编辑", icon: "mdi:pencil" },
      { key: "preview-only" as ViewMode, label: "仅预览", icon: "mdi:eye" },
    ]

    return (
      <div className="relative inline-flex bg-muted rounded-lg p-1">
        {modes.map((mode) => (
          <button
            key={mode.key}
            onClick={() => onViewModeChange(mode.key)}
            className={`
            relative px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200
            flex items-center gap-2 min-w-[100px] justify-center
            ${viewMode === mode.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/70"
              }
          `}
          >
            <Icon icon={mode.icon} className="w-4 h-4" />
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        ))}
      </div>
    )
  },
)

ViewModeSelector.displayName = "ViewModeSelector"

/**
 * 简历构建器主组件
 */
export default function ResumeBuilder({ initialData, template = "default", onChange, onSave, onBack }: { initialData?: ResumeData; template?: "default" | "example"; onChange?: (data: ResumeData) => void; onSave?: (data: ResumeData) => void; onBack?: () => void }) {
  const [editorState, setEditorState] = useState<EditorState>({
    resumeData: initialData ?? createDefaultResumeData(),
    isEditing: true,
    showPreview: true,
  })

  const [viewMode, setViewMode] = useState<ViewMode>("both")

  useEffect(() => {
    if (initialData) return
    const loadTemplate = async () => {
      const tpl = template === "example" ? await loadExampleTemplate() : await loadDefaultTemplate()
      if (!tpl) return
      setEditorState((prev) => ({
        ...prev,
        resumeData: tpl,
      }))
    }
    loadTemplate()
  }, [initialData, template])

  // initialData 仅用于初始值；避免在 effect 中同步 setState 触发级联渲染
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
  }, [])

  const updateResumeData = useCallback((updates: Partial<ResumeData>) => {
    setEditorState((prev) => ({
      ...prev,
      resumeData: {
        ...prev.resumeData,
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    }))
  }, [])

  // 将变更在提交阶段通知父组件，避免在渲染中更新父组件
  useEffect(() => {
    onChange?.(editorState.resumeData)
  }, [editorState.resumeData, onChange])

  return (
    <div className="resume-editor">
      {/* 工具栏 */}
      <div className="editor-toolbar">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:file-document-edit" className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-semibold">简历编辑器</h1>
          </div>
          <Badge variant="secondary" className="text-xs">
            {editorState.resumeData.title}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* 返回置于视图模式切换左侧 */}
          {onBack ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBack?.()}
              className="gap-2 bg-transparent"
            >
              <Icon icon="mdi:arrow-left" className="w-4 h-4" />
              返回
            </Button>
          ) : null}

          <Separator orientation="vertical" className="h-6" />

          <ViewModeSelector viewMode={viewMode} onViewModeChange={handleViewModeChange} />

          {/* 保存 */}
          {onSave ? (
            <Button
              size="sm"
              onClick={() => onSave?.(editorState.resumeData)}
              className="gap-2 cursor-pointer bg-green-600 hover:bg-green-700 text-white"
            >
              <Icon icon="mdi:content-save" className="w-4 h-4" />
              保存
            </Button>
          ) : null}

          {/* 导出 */}
          <ExportButton
            resumeData={editorState.resumeData}
            size="sm"
          />
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="editor-content">
        {/* 编辑面板 */}
        {(viewMode === "both" || viewMode === "edit-only") && (
          <div className={`editor-panel ${viewMode === "edit-only" ? "w-full" : ""}`}>
            <div className="p-6 space-y-6">
              {/* 简历标题编辑 */}
              <Card className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon icon="mdi:format-title" className="w-5 h-5 text-primary" />
                      <h2 className="font-medium">简历标题</h2>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateResumeData({ centerTitle: !editorState.resumeData.centerTitle })}
                      className="gap-2 bg-transparent"
                    >
                      <Icon icon={editorState.resumeData.centerTitle ? "mdi:format-align-center" : "mdi:format-align-left"} className="w-4 h-4" />
                      {editorState.resumeData.centerTitle ? "居中显示" : "左对齐"}
                    </Button>
                  </div>
                  <Input
                    value={editorState.resumeData.title}
                    onChange={(e) => updateResumeData({ title: e.target.value })}
                    placeholder="请输入简历标题或姓名"
                    className="text-lg font-medium"
                  />
                </div>
              </Card>

              {/* 求职意向编辑 */}
              <JobIntentionEditor
                jobIntentionSection={editorState.resumeData.jobIntentionSection}
                onUpdate={(jobIntentionSection) => updateResumeData({ jobIntentionSection })}
              />

              {/* 个人信息编辑 */}
              <PersonalInfoEditor
                personalInfoSection={editorState.resumeData.personalInfoSection}
                avatar={editorState.resumeData.avatar}
                onUpdate={(personalInfoSection, avatar) => {
                  const updates: Partial<ResumeData> = { personalInfoSection }
                  if (avatar !== undefined) updates.avatar = avatar
                  updateResumeData(updates)
                }}
              />

              {/* 简历模块编辑 */}
              <ModuleEditor
                modules={editorState.resumeData.modules}
                onUpdate={(modules) => updateResumeData({ modules })}
              />
            </div>
          </div>
        )}

        {/* 预览面板 */}
        {(viewMode === "both" || viewMode === "preview-only") && (
          <div className={`preview-panel ${viewMode === "preview-only" ? "w-full" : ""}`}>
            <ResumePreview resumeData={editorState.resumeData} />
          </div>
        )}
      </div>
    </div>
  )
}
