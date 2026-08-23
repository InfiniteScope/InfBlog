import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { UserRoleForm } from "@/components/admin/user-role-form"

export const metadata = {
  title: "用户权限管理 | InfBlog",
}

export default async function AdminUsersPage() {
  const session = await auth()

  if (session?.user?.role !== "OWNER") {
    notFound()
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, role: true, createdAt: true },
  })

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <h2 className="font-display text-xl tracking-tight">用户权限管理</h2>
      <p className="text-sm text-muted-foreground">
        仅站长可调整用户权限等级（管理员 / 访客）。
      </p>

      <div className="grid gap-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <p className="font-display text-base">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                注册时间：{user.createdAt.toLocaleDateString("zh-CN")}
              </p>
            </div>
            <UserRoleForm username={user.name ?? ""} currentRole={user.role} />
          </div>
        ))}
      </div>
    </div>
  )
}
