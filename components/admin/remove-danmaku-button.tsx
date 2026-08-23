"use client"

import { useTransition } from "react"
import { Trash2 } from "lucide-react"

import { removeDanmaku } from "@/app/danmaku/actions"
import { Button } from "@/components/ui/button"

interface RemoveDanmakuButtonProps {
  id: number
}

export function RemoveDanmakuButton({ id }: RemoveDanmakuButtonProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="destructive"
      size="icon"
      disabled={isPending}
      onClick={() => {
        if (confirm("确定要删除这条弹幕吗？")) {
          startTransition(async () => {
            const result = await removeDanmaku(id)
            if (!result.success) {
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
