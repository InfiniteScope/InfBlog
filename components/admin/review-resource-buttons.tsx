"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"

import { reviewResource } from "@/app/resources/actions"
import { Button } from "@/components/ui/button"

interface ReviewResourceButtonsProps {
  resourceId: string
}

export function ReviewResourceButtons({ resourceId }: ReviewResourceButtonsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        variant="default"
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (confirm("确定通过该资源分享吗？")) {
            startTransition(async () => {
              await reviewResource(resourceId, "approve")
              router.refresh()
            })
          }
        }}
        className="bg-accent text-accent-foreground hover:bg-accent/90"
      >
        <Check className="mr-1.5 h-4 w-4" />
        通过
      </Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (confirm("确定拒绝该资源分享吗？")) {
            startTransition(async () => {
              await reviewResource(resourceId, "reject")
              router.refresh()
            })
          }
        }}
      >
        <X className="mr-1.5 h-4 w-4" />
        拒绝
      </Button>
    </div>
  )
}
