"use client"

import { useRef, useState } from "react"
import { ImagePlus, Loader2, RefreshCw } from "lucide-react"

import { MAX_AVATAR_SIZE_MB } from "@/lib/client-image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AvatarCropDialog } from "@/components/profile/avatar-crop-dialog"

interface AvatarUploaderProps {
  /** The cropped data URL (or empty string if none selected). */
  value: string
  onChange: (value: string) => void
  error?: string | null
  onError?: (message: string | null) => void
  id?: string
  /** Current avatar URL shown when no new image is selected yet. */
  currentSrc?: string | null
  /** Fallback label (e.g. nickname) while no image/avatar exists. */
  currentLabel?: string
}

export function AvatarUploader({
  value,
  onChange,
  error,
  onError,
  id = "avatar",
  currentSrc,
  currentLabel = "U",
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingSrc, setPendingSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const setError = (message: string | null) => {
    onError?.(message)
    if (!onError) onChange("")
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_AVATAR_SIZE_MB * 1024 * 1024) {
      setError(`头像不能超过 ${MAX_AVATAR_SIZE_MB}MB，请压缩后重新选择`)
      return
    }

    setLoading(true)
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      setLoading(false)
      setPendingSrc(reader.result as string)
    }
    reader.onerror = () => {
      setLoading(false)
      setError("图片读取失败")
    }
    reader.readAsDataURL(file)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>头像（可选）</Label>
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 shrink-0">
          {value ? (
            <AvatarImage src={value} alt="头像预览" />
          ) : currentSrc ? (
            <AvatarImage src={currentSrc} alt="当前头像" />
          ) : (
            <AvatarFallback className="text-lg">
              {currentLabel.slice(0, 2)}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="mr-2 h-4 w-4" />
            )}
            选择图片
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange("")
                setError(null)
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              清除
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        支持 JPG/PNG/WebP，大小限制 {MAX_AVATAR_SIZE_MB}MB。
        图片将在浏览器中按 1:1 裁切并压缩至 600×600 后上传，不消耗服务器性能。
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {pendingSrc && (
        <AvatarCropDialog
          open={Boolean(pendingSrc)}
          src={pendingSrc}
          onCancel={() => setPendingSrc(null)}
          onConfirm={(dataUrl) => {
            onChange(dataUrl)
            setPendingSrc(null)
          }}
        />
      )}
    </div>
  )
}
