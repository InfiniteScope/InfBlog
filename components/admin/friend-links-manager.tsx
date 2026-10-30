"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { FriendLinkItem } from "@/lib/friends"
import {
  createFriendLink,
  deleteFriendLink,
  moveFriendLink,
  updateFriendLink,
} from "@/app/admin/friends/actions"

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function FriendRow({
  item,
  first,
  last,
}: {
  item: FriendLinkItem
  first: boolean
  last: boolean
}) {
  const router = useRouter()
  const [name, setName] = useState(item.name)
  const [url, setUrl] = useState(item.url)
  const [note, setNote] = useState(item.note ?? "")
  const [pending, startTransition] = useTransition()

  const dirty =
    name !== item.name || url !== item.url || note !== (item.note ?? "")

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, okText: string) => {
    startTransition(async () => {
      try {
        const result = await fn()
        if (!result.ok) {
          toast.error(result.message ?? "操作失败")
          return
        }
        toast.success(okText)
        router.refresh()
      } catch (error) {
        toast.error(`操作失败：${errorMessage(error)}`)
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_1fr]">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="名称"
          maxLength={30}
          disabled={pending}
          aria-label="友链名称"
        />
        <Input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com"
          maxLength={300}
          disabled={pending}
          aria-label="友链链接"
        />
        <Input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="备注（可选）"
          maxLength={60}
          disabled={pending}
          aria-label="友链备注"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={dirty ? "default" : "outline"}
          disabled={pending || !dirty}
          onClick={() =>
            run(
              () => updateFriendLink(item.id, { name, url, note }),
              "已保存"
            )
          }
        >
          <Save className="mr-1 h-3.5 w-3.5" />
          {dirty ? "保存修改" : "已保存"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={pending || first}
          onClick={() => run(() => moveFriendLink(item.id, "up"), "已上移")}
          aria-label="上移"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || last}
          onClick={() => run(() => moveFriendLink(item.id, "down"), "已下移")}
          aria-label="下移"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>

        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => {
            if (!confirm(`确定删除「${item.name}」吗？`)) return
            run(() => deleteFriendLink(item.id), "已删除")
          }}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          删除
        </Button>

        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          ID {item.id}
        </span>
      </div>
    </div>
  )
}

export function FriendLinksManager({ initial }: { initial: FriendLinkItem[] }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [note, setNote] = useState("")
  const [pending, startTransition] = useTransition()

  const add = () => {
    startTransition(async () => {
      try {
        const result = await createFriendLink({ name, url, note })
        if (!result.ok) {
          toast.error(result.message ?? "添加失败")
          return
        }
        toast.success("已添加友链")
        setName("")
        setUrl("")
        setNote("")
        router.refresh()
      } catch (error) {
        toast.error(`添加失败：${errorMessage(error)}`)
      }
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card/50 p-4">
        <h3 className="mb-3 font-display text-lg tracking-tight">新增友链</h3>
        <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_1fr]">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="名称，如 Qm's Blog"
            maxLength={30}
            disabled={pending}
            aria-label="新友链名称"
          />
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            maxLength={300}
            disabled={pending}
            aria-label="新友链链接"
          />
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="备注（可选）"
            maxLength={60}
            disabled={pending}
            aria-label="新友链备注"
          />
        </div>
        <Button
          className="mt-3"
          size="sm"
          disabled={pending || !name.trim() || !url.trim()}
          onClick={add}
        >
          <Plus className="mr-1 h-4 w-4" />
          添加
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          添加后会立即出现在侧边栏与关于页，无需重新构建。
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-lg tracking-tight">
          当前友链（{initial.length}）
        </h3>
        {initial.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center text-muted-foreground">
            还没有友链，先在上方添加一条吧。
          </div>
        ) : (
          initial.map((item, index) => (
            <FriendRow
              key={item.id}
              item={item}
              first={index === 0}
              last={index === initial.length - 1}
            />
          ))
        )}
      </section>
    </div>
  )
}
