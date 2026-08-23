"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Loader2 } from "lucide-react"

import { updateAvatar } from "@/app/auth-actions"
import { AvatarUploader } from "@/components/profile/avatar-uploader"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function AvatarSettingsCard() {
  const { data: session, update } = useSession()
  const user = session?.user
  const [dataUrl, setDataUrl] = useState("")
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSave() {
    if (!dataUrl) return
    setSaving(true)
    setMessage(null)
    try {
      const result = await updateAvatar(dataUrl)
      if (result?.success) {
        // Server action already refreshed the JWT cookie via unstable_update;
        // re-read into the client session so the navbar avatar updates.
        await update()
        setMessage("头像已更新")
        setDataUrl("")
        setUploadError(null)
      } else {
        setUploadError(result?.message ?? "保存失败")
      }
    } catch {
      setUploadError("保存失败，请稍后重试")
    } finally {
      setSaving(false)
    }
  }

  const displayName = user?.nickname || user?.name || "用户"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl tracking-tight">
          设置头像
        </CardTitle>
        <CardDescription>上传新头像，图片将在浏览器本地压缩至 600×600</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AvatarUploader
          value={dataUrl}
          onChange={setDataUrl}
          error={uploadError}
          onError={setUploadError}
          id="profile-avatar"
          currentSrc={user?.image}
          currentLabel={displayName}
        />
        {message && <p className="text-sm text-accent">{message}</p>}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!dataUrl || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            保存头像
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
