"use client"

import { useTransition } from "react"

import { updateUserRole } from "@/app/auth-actions"
import { Button } from "@/components/ui/button"

interface UserRoleFormProps {
  username: string
  currentRole: "OWNER" | "ADMIN" | "VISITOR"
}

export function UserRoleForm({ username, currentRole }: UserRoleFormProps) {
  const [isPending, startTransition] = useTransition()

  const handleChange = (newRole: "ADMIN" | "VISITOR") => {
    startTransition(async () => {
      await updateUserRole(username, newRole)
    })
  }

  if (currentRole === "OWNER") {
    return (
      <span className="shrink-0 text-xs font-mono text-accent">OWNER</span>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="text-xs text-muted-foreground">当前：{currentRole}</span>
      {currentRole === "VISITOR" ? (
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() => handleChange("ADMIN")}
        >
          {isPending ? "处理中..." : "升为管理员"}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => handleChange("VISITOR")}
        >
          {isPending ? "处理中..." : "降为访客"}
        </Button>
      )}
    </div>
  )
}
