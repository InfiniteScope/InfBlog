/**
 * 兜底脚本：为所有已上线资源中图标为外链的生成本地缓存（≤400×400 WebP）。
 * 新的提交/更新/审核通过时已自动缓存，本脚本只处理历史数据。
 *
 * 用法: pnpm tsx scripts/cache-resource-icons.ts
 */
import { prisma } from "../lib/prisma"
import {
  cacheResourceIcon,
  isExternalIconUrl,
} from "../lib/resource-icon-cache"

async function main() {
  const resources = await prisma.resource.findMany({
    where: { status: "APPROVED" },
    select: { id: true, name: true, icon: true },
  })

  let cached = 0
  let failed = 0

  for (const r of resources) {
    if (!r.icon || !isExternalIconUrl(r.icon)) continue
    const icon = await cacheResourceIcon(r.icon)
    if (icon !== r.icon) {
      await prisma.resource.update({ where: { id: r.id }, data: { icon } })
      cached++
      console.log(`✓ ${r.name} -> ${icon}`)
    } else {
      failed++
      console.warn(`✗ ${r.name}: 缓存失败，保留外链`)
    }
  }

  console.log(
    `完成：资源 ${resources.length} 个（外链处理 ${cached + failed} 个，成功 ${cached} / 失败 ${failed}）`
  )
}

main().catch((err) => {
  console.error("脚本执行失败:", err)
  process.exit(1)
})
