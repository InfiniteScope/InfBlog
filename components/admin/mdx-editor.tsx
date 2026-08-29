"use client"

import { useRef, useState, useTransition } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ImageIcon, Loader2 } from "lucide-react"

import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

interface MdxEditorProps {
  title: string
  setTitle: (value: string) => void
  description: string
  setDescription: (value: string) => void
  content: string
  setContent: (value: string) => void
  tags: string
  setTags: (value: string) => void
  coverImage: string
  setCoverImage: (value: string) => void
}

export function MdxEditor({
  title,
  setTitle,
  description,
  setDescription,
  content,
  setContent,
  tags,
  setTags,
  coverImage,
  setCoverImage,
}: MdxEditorProps) {
  const [showPreview, setShowPreview] = useState(true)
  const [coverUploading, setCoverUploading] = useState(false)
  const [inlineUploading, setInlineUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const inlineInputRef = useRef<HTMLInputElement>(null)

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

  function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverUploading(true)
    uploadFile(file)
      .then((url) => setCoverImage(url))
      .catch((err: Error) => setUploadError(err.message))
      .finally(() => setCoverUploading(false))
  }

  function insertInlineImage(url: string) {
    const textarea = contentRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const alt = "图片描述"
    const insertion = `\n![${alt}](${url})\n`

    const newContent =
      content.slice(0, start) + insertion + content.slice(end)
    setContent(newContent)

    setTimeout(() => {
      const cursor = start + insertion.length
      textarea.focus()
      textarea.setSelectionRange(cursor, cursor)
    }, 0)
  }

  function handleInlineFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setInlineUploading(true)
    uploadFile(file)
      .then((url) => {
        insertInlineImage(url)
        if (inlineInputRef.current) {
          inlineInputRef.current.value = ""
        }
      })
      .catch((err: Error) => setUploadError(err.message))
      .finally(() => setInlineUploading(false))
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">标题</Label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="文章标题"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">标签</Label>
          <Input
            id="tags"
            name="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="用英文逗号分隔，例如：技术, 设计"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">描述</Label>
        <Input
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="文章简介，会显示在列表中"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="coverImage">封面图片</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            id="coverImage"
            name="coverImage"
            type="text"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="图片 URL，或点击下方按钮上传"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            disabled={coverUploading}
            onClick={() => document.getElementById("coverImageFile")?.click()}
          >
            {coverUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="mr-2 h-4 w-4" />
            )}
            上传封面
          </Button>
          <input
            id="coverImageFile"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverFileChange}
          />
        </div>
        {coverImage && (
          <div className="relative mt-2 aspect-video w-full max-w-md overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage}
              alt="封面预览"
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="content">正文内容（MDX）</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={inlineUploading}
            onClick={() => inlineInputRef.current?.click()}
          >
            {inlineUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="mr-2 h-4 w-4" />
            )}
            插入图片
          </Button>
          <input
            ref={inlineInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInlineFileChange}
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

      {uploadError && (
        <p className="text-sm text-destructive">{uploadError}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Textarea
          ref={contentRef}
          id="content"
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="在此输入 MDX 内容..."
          className="min-h-[480px] font-mono text-sm leading-relaxed"
        />
        {showPreview && (
          <div className="min-h-[480px] overflow-auto rounded-md border border-border bg-card/30 p-4">
            <div className="mb-2 border-b border-border pb-2 text-xs text-muted-foreground">
              实时预览（标准 Markdown，MDX 组件以实际发布为准）
            </div>
            <div className="max-w-none space-y-3 text-sm leading-relaxed [&_h1]:font-display [&_h1]:text-3xl [&_h1]:tracking-tight [&_h2]:font-display [&_h2]:text-xl [&_h2]:tracking-tight [&_h3]:font-display [&_h3]:text-lg [&_h3]:tracking-tight [&_h4]:font-display [&_h4]:text-base [&_h4]:tracking-tight [&_h5]:font-semibold [&_h6]:text-xs [&_h6]:font-semibold [&_blockquote]:border-l-4 [&_blockquote]:border-l-current [&_blockquote]:pl-3 [&_blockquote]:opacity-80 [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_del]:line-through [&_del]:text-muted-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
