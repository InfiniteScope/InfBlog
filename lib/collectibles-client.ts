import { toast } from "sonner"

import { COLLECTIBLE_MAP, type CollectibleId } from "@/lib/collectibles"

/** 获得新藏品 → 中央展示弹窗 */
export const COLLECTIBLE_REVEAL_EVENT = "collectible:reveal"

export function revealCollectible(itemId: CollectibleId) {
  window.dispatchEvent(
    new CustomEvent(COLLECTIBLE_REVEAL_EVENT, { detail: itemId })
  )
}

/**
 * 客户端预留入口：领取藏品。返回是否为新获得。
 * 未登录直接返回 false（不打扰弹窗）。
 */
export async function claimCollectible(
  itemId: CollectibleId
): Promise<"claimed" | "owned" | "unauthenticated" | "error"> {
  try {
    const res = await fetch("/api/collectibles/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    })
    if (res.status === 401) return "unauthenticated"
    const data = await res.json()
    if (data?.ok) return data.newlyClaimed ? "claimed" : "owned"
    return "error"
  } catch {
    return "error"
  }
}

export async function fetchMyCollectibles(): Promise<CollectibleId[]> {
  try {
    const res = await fetch("/api/collectibles/mine")
    const data = await res.json()
    if (Array.isArray(data?.items)) return data.items
    return []
  } catch {
    return []
  }
}

export function notifyCollectible(itemId: CollectibleId) {
  const meta = COLLECTIBLE_MAP[itemId]
  revealCollectible(itemId)
  toast.success(`获得藏品「${meta.name}」！`)
}
