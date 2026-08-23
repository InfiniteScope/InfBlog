"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CollectibleGrid } from "@/components/collectibles/collectible-grid"
import type { CollectibleId } from "@/lib/collectibles"

interface CollectiblesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  own: CollectibleId[]
  /** catalog mode: show ALL items with how-to-get (admin handbook) */
  catalog?: boolean
}

export function CollectiblesDialog({
  open,
  onOpenChange,
  own,
  catalog = false,
}: CollectiblesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{catalog ? "藏品图鉴" : "网站藏品"}</DialogTitle>
        </DialogHeader>
        <CollectibleGrid own={own} catalog={catalog} />
      </DialogContent>
    </Dialog>
  )
}
