"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

import { removeDoc } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"

interface RemoveDocButtonProps {
  slug: string
  redirectTo?: string
}

export function RemoveDocButton({ slug, redirectTo }: RemoveDocButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="destructive"
      size="icon"
      disabled={isPending}
      onClick={() => {
        if (confirm("确定要删除这份档案吗？此操作不可恢复。")) {
          startTransition(async () => {
            const result = await removeDoc(slug)
            if (result.success) {
              router.push(redirectTo || "/docs")
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
