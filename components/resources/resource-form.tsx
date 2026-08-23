"use client"

import { useActionState, useEffect, useState } from "react"
import { ImageIcon, Loader2, Plus, Sparkles } from "lucide-react"

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
}: ResourceFormProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName)
  const [summary, setSummary] = useState(initialSummary)
  const [icon, setIcon] = useState(initialIcon)
  const [homepageUrl, setHomepageUrl] = useState(initialHomepageUrl)
  const [description, setDescription] = useState(initialDescription)
  const [downloadUrl, setDownloadUrl] = useState(initialDownloadUrl)
  const [fetchingIcon, setFetchingIcon] = useState(false)
  const [iconError, setIconError] = useState<string | null>(null)

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
      }
      setIconError(null)
    }
  }, [state, mode])

  const errorMessage = (field: string) =>
    state?.success === false ? state.errors?.[field as keyof typeof state.errors]?.[0] : null

  async function handleAutoFetchIcon() {
    if (!homepageUrl.trim()) {
      setIconError("请先填写官网链接")
      return
    }
    setFetchingIcon(true)
    setIconError(null)
    try {
      const res = await fetch("/api/resources/icon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: homepageUrl.trim() }),
      })
      const result = (await res.json()) as
        | { success: true; url: string }
        | { success: false; message: string }
      if (result.success) {
        setIcon(result.url)
      } else {
        setIconError(result.message)
      }
    } catch {
      setIconError("网络错误，请重试或手动填写图标链接")
    } finally {
      setFetchingIcon(false)
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
                  className={cn(iconError && "border-destructive")}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={fetchingIcon || !homepageUrl.trim()}
                  onClick={handleAutoFetchIcon}
                  title="根据官网链接自动获取图标"
                >
                  {fetchingIcon ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {iconError ? (
                <p className="text-xs text-destructive">{iconError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  留空则使用默认图标；图标将按 1:1 展示
                </p>
              )}
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
