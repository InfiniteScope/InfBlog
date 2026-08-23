import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { COLLECTIBLE_LIST } from "@/lib/collectibles"
import { CollectibleGrid } from "@/components/collectibles/collectible-grid"

export const metadata = {
  title: "藏品图鉴 | InfBlog",
}

export default async function AdminCollectiblesPage() {
  const session = await auth()

  if (
    !session?.user ||
    (session.user.role !== "OWNER" && session.user.role !== "ADMIN")
  ) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-display text-2xl tracking-tight">藏品图鉴</h2>
        <p className="text-sm text-muted-foreground">
          全部藏品的 3D 模型与获得方式（共 {COLLECTIBLE_LIST.length} 件）
        </p>
      </div>
      <CollectibleGrid
        own={COLLECTIBLE_LIST.map((c) => c.id)}
        catalog
        emptyHint=""
      />
    </div>
  )
}
