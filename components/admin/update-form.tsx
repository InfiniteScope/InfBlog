"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import { ImageIcon, Loader2 } from "lucide-react"

import {
  createUpdate,
  updateUpdate,
  type UpdateFormState,
} from "@/app/admin/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface UpdateFormProps {
  mode: "create" | "edit"
  slug?: string
  initialTitle?: string
  initialContent?: string
  initialDate?: string
}

function toLocalInputValue(iso?: string): string {
  const date = iso ? new Date(iso) : new Date()
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

export function UpdateForm({
  mode,
  slug,
  initialTitle = "",
  initialContent = "",
  initialDate,
}: UpdateFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [date, setDate] = useState(() => toLocalInputValue(initialDate))
  const [showPreview, setShowPreview] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const action =
    mode === "create" ? createUpdate : updateUpdate.bind(null, slug!)
  const [state, formAction, isPending] = useActionState<
    UpdateFormState,
    FormData
  >(action, null)

  useEffect(() => {
    if (state?.success) {
      router.push("/admin/updates")
      router.refresh()
    }
  }, [state, router])

  async function uploadFile(file: File): Promise<string> {
    setUploadError(null)
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error("读取文件失败"))
      reader.readAsDataURL(file)
    })

    const response = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, dataUrl }),
    })

    const result = (await response.json()) as
      | { success: true; url: string }
      | { success: false; message: string }

    if (!result.success) {
      throw new Error(result.message)
    }

    return result.url
  }

  function insertInlineImage(url: string) {
    const textarea = contentRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const insertion = `\n![图片描述](${url})\n`

    const newContent = content.slice(0, start) + insertion + content.slice(end)
    setContent(newContent)

    setTimeout(() => {
      const cursor = start + insertion.length
      textarea.focus()
      textarea.setSelectionRange(cursor, cursor)
    }, 0)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    uploadFile(file)
      .then((url) => {
        insertInlineImage(url)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      })
      .catch((err: Error) => setUploadError(err.message))
      .finally(() => setUploading(false))
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">标题（可选）</Label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="给这条动态起个标题"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">动态时间</Label>
          <Input
            id="date"
            name="date"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="content">动态内容（MDX）</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="mr-2 h-4 w-4" />
            )}
            插入图片
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-primary"
          >
            {showPreview ? "隐藏预览" : "显示预览"}
          </button>
        </div>
      </div>

      {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Textarea
          ref={contentRef}
          id="content"
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="在这里写点什么..."
          className="min-h-[280px] font-mono text-sm leading-relaxed"
        />
        {showPreview && (
          <div className="min-h-[280px] overflow-auto rounded-md border border-border bg-card/30 p-4">
            <div className="mb-2 border-b border-border pb-2 text-xs text-muted-foreground">
              实时预览
            </div>
            <div className="max-w-none space-y-3 text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_ol]:ml-5 [&_ol]:list-decimal [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_ul]:ml-5 [&_ul]:list-disc">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "保存中..."
            : mode === "create"
            ? "发布动态"
            : "更新动态"}
        </Button>
        {state?.success === false && state.message && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}
      </div>
    </form>
  )
}
