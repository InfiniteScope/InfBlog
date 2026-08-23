"use client"

import { useState } from "react"

import { CollectibleViewer } from "@/components/collectibles/collectible-viewer"
import { Button } from "@/components/ui/button"
import {
  COLLECTIBLE_LIST,
  COLLECTIBLE_MAP,
  type CollectibleId,
} from "@/lib/collectibles"
import { cn } from "@/lib/utils"

type CollectibleMetaRarity = "common" | "rare" | "legendary"

const rarityStyles: Record<CollectibleMetaRarity, string> = {
  common: "border-border bg-card/50",
  rare: "border-accent/40 bg-accent/5",
  legendary: "border-amber-400/50 bg-amber-400/5",
}

interface CollectibleGridProps {
  own: CollectibleId[]
  /** catalog mode: show ALL items with how-to-get (admin handbook) */
  catalog?: boolean
  emptyHint?: string
}

export function CollectibleGrid({
  own,
  catalog = false,
  emptyHint = "你还没有获得任何藏品。试着多点几下「点我试试」吧。",
}: CollectibleGridProps) {
  const [selected, setSelected] = useState<CollectibleId | null>(null)

  const items = catalog
    ? COLLECTIBLE_LIST
    : COLLECTIBLE_LIST.filter((item) => own.includes(item.id))

  const selectedMeta = selected ? COLLECTIBLE_MAP[selected] : null
  const owned = new Set(own)

  return (
    <div className="space-y-4">
      {!catalog && own.length === 0 && (
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((meta) => {
          const isOwned = owned.has(meta.id)
          const metaRarity = meta.rarity as CollectibleMetaRarity
          return (
            <button
              key={meta.id}
              type="button"
              onClick={() => setSelected(meta.id)}
              className={cn(
                "group flex flex-col items-center rounded-xl border p-4 transition-colors hover:border-accent",
                isOwned
                  ? rarityStyles[metaRarity]
                  : "border-dashed border-border/60 bg-background/40"
              )}
            >
              {/* 无交互的预览小卡（旋转预览） */}
              <div className="pointer-events-none">
                <CollectibleViewer itemId={meta.id} size={110} />
              </div>
              <p className="mt-2 text-sm font-medium">{meta.label}</p>
              <p className="mt-0.5 text-xs">
                {isOwned
                  ? meta.rarity === "legendary"
                    ? "传说"
                    : meta.rarity === "rare"
                      ? "稀有"
                      : "普通"
                  : "未获得"}
              </p>
            </button>
          )
        })}
      </div>

      {selectedMeta && (
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* 详情大图：可拖拽旋转 */}
            <div className="shrink-0">
              <CollectibleViewer itemId={selectedMeta.id} size={180} />
            </div>
            <div className="space-y-1.5">
              <p className="font-display text-lg">{selectedMeta.label}</p>
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {selectedMeta.description}
              </p>
              {catalog && (
                <p className="text-xs text-muted-foreground/80">
                  获得方式：{selectedMeta.howToGet}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="secondary" onClick={() => setSelected(null)}>
                  关闭
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
