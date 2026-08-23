"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Sparkles, X } from "lucide-react"

import { CollectibleViewer } from "@/components/collectibles/collectible-viewer"
import { Button } from "@/components/ui/button"
import { COLLECTIBLE_REVEAL_EVENT } from "@/lib/collectibles-client"
import { COLLECTIBLE_MAP, type CollectibleId } from "@/lib/collectibles"

const rarityLabel: Record<string, string> = {
  common: "普通",
  rare: "稀有",
  legendary: "传说",
}

/**
 * 获得新藏品 → 屏幕正中央全屏展示（大尺寸模型，可拖拽旋转）。
 * 挂在根布局，监听 collectible:reveal 事件。
 */
export function CollectibleReveal() {
  const [itemId, setItemId] = useState<CollectibleId | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<CollectibleId>).detail
      if (id && COLLECTIBLE_MAP[id]) setItemId(id)
    }
    window.addEventListener(COLLECTIBLE_REVEAL_EVENT, handler)
    return () => window.removeEventListener(COLLECTIBLE_REVEAL_EVENT, handler)
  }, [])

  const meta = itemId ? COLLECTIBLE_MAP[itemId] : null

  return (
    <AnimatePresence>
      {meta && (
        <motion.div
          key={meta.id}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* backdrop */}
          <div className="absolute inset-0 bg-background/70 backdrop-blur-md" />

          <motion.div
            initial={{ scale: 0.7, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="relative flex flex-col items-center gap-3 rounded-3xl border border-border bg-card/80 px-10 py-8 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setItemId(null)}
              className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>

            <motion.div
              initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 16 }}
              className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-accent"
            >
              <Sparkles className="h-3.5 w-3.5" />
              获得新藏品
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  color: meta.accent,
                  backgroundColor: `${meta.accent}1a`,
                }}
              >
                {rarityLabel[meta.rarity] ?? meta.rarity}
              </span>
            </motion.div>

            <CollectibleViewer itemId={meta.id} size={300} />

            <div className="text-center">
              <p className="font-display text-2xl tracking-tight">{meta.label}</p>
              <p className="mt-1 max-w-sm whitespace-pre-line text-sm text-muted-foreground">
                {meta.description}
              </p>
            </div>

            <Button onClick={() => setItemId(null)} className="mt-1 min-w-32">
              收下
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
