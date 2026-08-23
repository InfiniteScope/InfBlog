import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NicknameForm } from "@/components/profile/nickname-form"
import { PasswordForm } from "@/components/profile/password-form"
import { AvatarSettingsCard } from "@/components/profile/avatar-settings-card"

export const metadata = {
  title: "我的 | InfBlog",
}

const roleLabels: Record<string, string> = {
  OWNER: "站长",
  ADMIN: "管理员",
  VISITOR: "访客",
}

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/profile")}`)
  }

  const { user } = session

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-8">
      <section className="space-y-2">
        <p className="font-mono text-xs tracking-widest text-accent">// PROFILE</p>
        <h1 className="font-display text-4xl tracking-tight">我的</h1>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl tracking-tight">账号信息</CardTitle>
          <CardDescription>查看当前登录账号的基本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">用户名</span>
            <span className="font-mono">{user.name}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">昵称</span>
            <span>{user.nickname || "未设置"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">权限等级</span>
            <span className="font-medium text-accent">
              {roleLabels[user.role] ?? user.role}
            </span>
          </div>
        </CardContent>
      </Card>

      <AvatarSettingsCard />

      <NicknameForm userId={user.id} currentNickname={user.nickname ?? ""} />

      {user.role !== "OWNER" && <PasswordForm userId={user.id} />}
    </div>
  )
}
