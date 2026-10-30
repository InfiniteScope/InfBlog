/**
 * 友链种子：把 lib/config.ts 里的默认友链写入数据库（仅在表为空时执行）。
 *
 * 用法：
 *   pnpm tsx scripts/seed-friends.ts
 *
 * 为什么要种子：后台改成数据库驱动后，首次部署如果表是空的，
 * 侧边栏/关于页会显示“暂无友链”。这个脚本只跑一次即可。
 */
import { PrismaClient } from "@prisma/client"

import { siteConfig } from "../lib/config"

const prisma = new PrismaClient()

async function main() {
  const count = await prisma.friendLink.count()
  if (count > 0) {
    console.log(`friend_links 已有 ${count} 条，跳过种子`)
    return
  }

  const friends = siteConfig.links.friends
  if (friends.length === 0) {
    console.log("lib/config.ts 里没有默认友链，跳过")
    return
  }

  await prisma.friendLink.createMany({
    data: friends.map((friend, index) => ({
      name: friend.name,
      url: friend.url,
      note: null,
      sortOrder: index,
    })),
  })
  console.log(`已写入 ${friends.length} 条默认友链`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
