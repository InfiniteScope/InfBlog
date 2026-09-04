"use client"

import { useActionState, useEffect, useState } from "react"
import { ImageIcon, Loader2, Plus, Sparkles, Tag as TagIcon, X } from "lucide-react"

import {
  submitResource,
  updateResource,
  type ResourceFormState,
} from "@/app/resources/actions"
import { notifyCollectible } from "@/lib/collectibles-client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface ResourceFormProps {
  mode?: "create" | "edit"
  resourceId?: string
  initialName?: string
  initialSummary?: string
  initialDescription?: string
  initialIcon?: string
  initialHomepageUrl?: string
  initialDownloadUrl?: string
  initialTags?: string[]
  /** 供选择的已有标签 */
  allTags: string[]
}

export function ResourceForm({
  mode = "create",
  resourceId,
  initialName = "",
  initialSummary = "",
  initialDescription = "",
  initialIcon = "",
  initialHomepageUrl = "",
  initialDownloadUrl = "",
  initialTags = [],
  allTags,
}: ResourceFormProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName)
  const [summary, setSummary] = useState(initialSummary)
  const [icon, setIcon] = useState(initialIcon)
  const [homepageUrl, setHomepageUrl] = useState(initialHomepageUrl)
  const [description, setDescription] = useState(initialDescription)
  const [downloadUrl, setDownloadUrl] = useState(initialDownloadUrl)
  const [fetchingMeta, setFetchingMeta] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>(initialTags)
  const [newTag, setNewTag] = useState("")

  const action =
    mode === "create"
      ? submitResource
      : updateResource.bind(null, resourceId!)
  const [state, formAction, isPending] = useActionState<ResourceFormState, FormData>(
    action,
    null
  )

  useEffect(() => {
    if (state?.success) {
      setOpen(false)
      if (state.collectibleGranted) {
        notifyCollectible("sharing-hero")
      }
      if (mode === "create") {
        setName("")
        setSummary("")
        setIcon("")
        setHomepageUrl("")
        setDescription("")
        setDownloadUrl("")
        setTags([])
        setNewTag("")
      }
      setMetaError(null)
    }
  }, [state, mode])

  const addTag = (raw: string) => {
    const name = raw.trim().slice(0, 12)
    if (!name) return
    if (tags.includes(name) || tags.length >= 5) return
    setTags((prev) => [...prev, name])
    setNewTag("")
  }

  const removeTag = (name: string) => {
    setTags((prev) => prev.filter((t) => t !== name))
  }

  const errorMessage = (field: string) =>
    state?.success === false ? state.errors?.[field as keyof typeof state.errors]?.[0] : null

  /** 抓取官网信息：图标 + 标题 + 简介 */
  async function handleAutoFetchMeta() {
    if (!homepageUrl.trim()) {
      setMetaError("请先填写官网链接")
      return
    }
    setFetchingMeta(true)
    setMetaError(null)
    try {
      const res = await fetch("/api/resources/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: homepageUrl.trim() }),
      })
      const result = (await res.json()) as
        | { success: true; icon?: string; title?: string; description?: string }
        | { success: false; message: string }
      if (result.success) {
        if (result.icon) setIcon(result.icon)
        if (result.title && !name.trim()) setName(result.title.slice(0, 100))
        if (result.description && !summary.trim()) {
          setSummary(result.description.replace(/\s+/g, " ").slice(0, 30))
        }
      } else {
        setMetaError(result.message)
      }
    } catch {
      setMetaError("网络错误，请重试或手动填写")
    } finally {
      setFetchingMeta(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            分享资源
          </Button>
        ) : (
          <Button variant="ghost" size="sm">
            编辑
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "分享资源" : "编辑资源"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "分享好用的软件、工具。详细介绍支持 Markdown 语法。"
              : "修改资源信息（仅发布者、站长和管理员可见此入口）"}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4 pt-2">
          <input type="hidden" name="tags" value={tags.join(",")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="资源名称"
              />
              {errorMessage("name") && (
                <p className="text-xs text-destructive">{errorMessage("name")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">
                图标链接
                <span className="ml-1 font-normal text-muted-foreground">（可选）</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="icon"
                  name="icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="https://... 或点击自动获取"
                  className={cn(metaError && "border-destructive")}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={fetchingMeta || !homepageUrl.trim()}
                  onClick={handleAutoFetchMeta}
                  title="根据官网链接自动获取图标、标题、简介"
                >
                  {fetchingMeta ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {metaError ? (
                <p className="text-xs text-destructive">{metaError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  点击 ✨ 按钮可自动获取官网图标、标题与简介；图标将按 1:1 展示
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tag-input">
              标签
              <span className="ml-1 font-normal text-muted-foreground">
                （最多 5 个，可点选已有或用逗号/回车添加）
              </span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set([...tags, ...allTags])).map((t) => {
                const selected = tags.includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => (selected ? removeTag(t) : addTag(t))}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                      selected
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border bg-muted/40 text-muted-foreground hover:border-accent/50"
                    )}
                  >
                    <TagIcon className="h-3 w-3" />
                    {t}
                    {selected && <X className="h-3 w-3" />}
                  </button>
                )
              })}
              <input
                id="tag-input"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault()
                    addTag(newTag)
                  }
                }}
                onBlur={() => newTag.trim() && addTag(newTag)}
                placeholder="输入新标签..."
                className="h-7 w-[7rem] rounded-full border border-border bg-muted/40 px-3 text-xs outline-none placeholder:text-muted-foreground/50 focus:border-accent/60"
                maxLength={12}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">
              缩略简介
              <span className="ml-1 font-normal text-muted-foreground">
                （30 字以内，不支持 Markdown，展示在卡片上）
              </span>
            </Label>
            <Input
              id="summary"
              name="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value.slice(0, 30))}
              placeholder="一句话介绍这个资源"
              required
            />
            <div className="flex justify-between">
              {errorMessage("summary") ? (
                <p className="text-xs text-destructive">{errorMessage("summary")}</p>
              ) : (
                <span />
              )}
              <p className="text-xs text-muted-foreground tabular-nums">
                {summary.length}/30
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              详细介绍
              <span className="ml-1 font-normal text-muted-foreground">
                （3000 字以内，支持 Markdown，展示在详情页）
              </span>
            </Label>
            <Textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 3000))}
              placeholder="介绍这个资源的用途、亮点..."
              className="min-h-[120px] font-mono text-sm leading-relaxed"
            />
            <div className="flex justify-between">
              {errorMessage("description") ? (
                <p className="text-xs text-destructive">{errorMessage("description")}</p>
              ) : (
                <span />
              )}
              <p className="text-xs text-muted-foreground tabular-nums">
                {description.length}/3000
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="homepageUrl">官网链接（可选）</Label>
              <Input
                id="homepageUrl"
                name="homepageUrl"
                value={homepageUrl}
                onChange={(e) => setHomepageUrl(e.target.value)}
                placeholder="https://..."
              />
              {errorMessage("homepageUrl") && (
                <p className="text-xs text-destructive">{errorMessage("homepageUrl")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="downloadUrl">外部下载链接</Label>
              <Input
                id="downloadUrl"
                name="downloadUrl"
                value={downloadUrl}
                onChange={(e) => setDownloadUrl(e.target.value)}
                placeholder="https://..."
                required
              />
              {errorMessage("downloadUrl") && (
                <p className="text-xs text-destructive">{errorMessage("downloadUrl")}</p>
              )}
            </div>
          </div>

          {state?.success === false && state.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
          {state?.success === true && (
            <p className="text-sm text-accent">{state.message}</p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="mr-2 h-4 w-4" />
              )}
              {mode === "create" ? "提交" : "保存修改"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
