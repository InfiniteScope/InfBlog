"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { updateUserRole } from "@/app/auth-actions"
import { Button } from "@/components/ui/button"

interface UserRoleFormProps {
  username: string
  currentRole: "OWNER" | "ADMIN" | "VISITOR"
}

export function UserRoleForm({ username, currentRole }: UserRoleFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleChange = (newRole: "ADMIN" | "VISITOR") => {
    startTransition(async () => {
      const result = await updateUserRole(username, newRole)
      if (!result.success) {
        setError(result.message)
        toast.error(result.message)
        return
      }
      setError(null)
      toast.success(result.message)
      // 让服务端重新读取用户列表（角色已在 DB 更新）
      window.location.reload()
    })
  }

  if (currentRole === "OWNER") {
    return (
      <span className="shrink-0 text-xs font-mono text-accent">OWNER</span>
    )
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-2">
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
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
