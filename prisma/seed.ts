import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const username = "InfiniteScope"
  const password = process.env.SEED_OWNER_PASSWORD

  if (!password) {
    console.error("请先设置环境变量 SEED_OWNER_PASSWORD")
    process.exit(1)
  }

  const existing = await prisma.user.findUnique({
    where: { name: username },
  })

  if (existing) {
    console.log(`站长账号 ${username} 已存在，跳过 seed`)
    return
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  await prisma.user.create({
    data: {
      name: username,
      password: hashedPassword,
      role: "OWNER",
    },
  })

  console.log(`站长账号 ${username} 已创建`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
