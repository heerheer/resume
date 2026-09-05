"use client"
import { useState } from "react"
import { Icon } from "@iconify/react"
import type { Editor } from "@tiptap/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

interface AiOptimizeButtonProps {
  editor: Editor | null
  /** 所属简历模块标题，用于给 AI 提供语境（可选） */
  moduleTitle?: string
}

/**
 * 将优化后文本按行拆分为 tiptap 段落（与 PlainTextPaste 的粘贴逻辑保持一致）
 */
function textToDoc(text: string) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n")
  return {
    type: "doc" as const,
    content: lines.map((line) => ({
      type: "paragraph" as const,
      content: line ? [{ type: "text" as const, text: line }] : [],
    })),
  }
}

/**
 * 多行输入框右下角的 AI 优化按钮。
 * 下拉框默认提供"使用 AsuSkills 优化"，调用后端 /api/ai/optimize 后弹窗预览，
 * 用户确认后再回填编辑器。
 */
export default function AiOptimizeButton({ editor, moduleTitle }: AiOptimizeButtonProps) {
  const { toast } = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [original, setOriginal] = useState("")
  const [result, setResult] = useState("")
  const [error, setError] = useState("")

  const runOptimize = async () => {
    if (!editor) return
    const text = editor.getText().trim()
    if (!text) {
      toast({ title: "内容为空", description: "请先在输入框中填写需要优化的内容。" })
      return
    }
    setMenuOpen(false)
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, moduleTitle }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || "优化失败")
      }
      setOriginal(text)
      setResult(data.text)
      setDialogOpen(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "网络异常"
      toast({ title: "优化失败", description: msg, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const applyResult = () => {
    if (!editor || !result) return
    editor.commands.setContent(textToDoc(result))
    setDialogOpen(false)
    toast({ title: "已应用", description: "优化后的内容已回填到输入框。" })
  }

  return (
    <>
      <div className="absolute bottom-1 right-1 z-10">
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-primary hover:bg-muted/80 bg-background/60 shadow-sm"
              title="AI 优化"
            >
              {loading ? (
                <Icon icon="mdi:loading" className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Icon icon="mdi:auto-fix" className="w-3.5 h-3.5" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={runOptimize} disabled={loading}>
              <Icon icon="mdi:sparkles" className="w-4 h-4 mr-2 text-primary" />
              使用 AsuSkills 优化
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI 优化预览</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">原文</p>
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground border rounded-md p-3 max-h-64 overflow-y-auto bg-muted/30">{original}</pre>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">优化后</p>
              <pre className="whitespace-pre-wrap text-sm border rounded-md p-3 max-h-64 overflow-y-auto">{result || error || "加载中..."}</pre>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={applyResult} disabled={!result}>应用</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}