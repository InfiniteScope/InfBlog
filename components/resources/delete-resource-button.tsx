"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

import { deleteResource } from "@/app/resources/actions"
import { Button } from "@/components/ui/button"

interface DeleteResourceButtonProps {
  resourceId: string
}

export function DeleteResourceButton({ resourceId }: DeleteResourceButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      title="删除资源"
      onClick={() => {
        if (confirm("确定要删除这条资源吗？此操作不可恢复。")) {
          startTransition(async () => {
            const result = await deleteResource(resourceId)
            if (result.success) {
              router.push("/resources")
              router.refresh()
            } else {
              alert(result.message)
            }
          })
        }
      }}
      className="text-destructive hover:text-destructive"
    >
      <Trash2 className="mr-1.5 h-4 w-4" />
      删除
    </Button>
  )
}
