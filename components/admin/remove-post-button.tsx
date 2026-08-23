"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

import { removePost } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"

interface RemovePostButtonProps {
  slug: string
  redirectTo?: string
}

export function RemovePostButton({ slug, redirectTo }: RemovePostButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="destructive"
      size="icon"
      disabled={isPending}
      onClick={() => {
        if (confirm("确定要删除这篇文章吗？此操作不可恢复。")) {
          startTransition(async () => {
            const result = await removePost(slug)
            if (result.success) {
              router.push(redirectTo || "/blog")
              router.refresh()
            } else {
              alert(result.message)
            }
          })
        }
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
