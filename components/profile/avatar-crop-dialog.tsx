"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, ZoomIn } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"

interface AvatarCropDialogProps {
  open: boolean
  /** Source image data URL (already decoded). */
  src: string
  onCancel: () => void
  /** Returns a 600×600 webp data URL. */
  onConfirm: (dataUrl: string) => void
}

const VIEWPORT_SIZE = 320
const OUTPUT_SIZE = 600

export function AvatarCropDialog({
  open,
  src,
  onCancel,
  onConfirm,
}: AvatarCropDialogProps) {
  const imgRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [natural, setNatural] = useState({ w: 1, h: 1 })
  const [cropping, setCropping] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; startPos: { x: number; y: number } } | null>(null)

  // base scale: make the image cover the viewport (never leave gaps)
  const baseScale = Math.max(VIEWPORT_SIZE / natural.w, VIEWPORT_SIZE / natural.h)
  const displayScale = baseScale * scale

  // max offset so the image edges never move inside the viewport edges
  const maxX = Math.max(0, (natural.w * displayScale - VIEWPORT_SIZE) / 2)
  const maxY = Math.max(0, (natural.h * displayScale - VIEWPORT_SIZE) / 2)

  const clampPos = (x: number, y: number) => ({
    x: Math.max(-maxX, Math.min(maxX, x)),
    y: Math.max(-maxY, Math.min(maxY, y)),
  })

  useEffect(() => {
    const img = new Image()
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = src
  }, [src])

  const handlePointerDown = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPos: pos,
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const next = clampPos(
      drag.startPos.x + (e.clientX - drag.startX),
      drag.startPos.y + (e.clientY - drag.startY)
    )
    setPos(next)
  }

  const handlePointerUp = () => {
    dragRef.current = null
  }

  const handleScaleChange = (value: number[]) => {
    const next = value[0] ?? 1
    setScale(next)
    // Re-clamp position for the new scale.
    const k = (baseScale * next) / displayScale || 1
    setPos((p) => clampPos(p.x * k, p.y * k))
  }

  async function handleConfirm() {
    const img = imgRef.current
    if (!img) return
    setCropping(true)
    try {
      const k = displayScale // CSS px per image px
      const halfCrop = VIEWPORT_SIZE / (2 * k)
      const imgCX = natural.w / 2 - pos.x / k
      const imgCY = natural.h / 2 - pos.y / k

      const canvas = document.createElement("canvas")
      canvas.width = OUTPUT_SIZE
      canvas.height = OUTPUT_SIZE
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("浏览器不支持 Canvas")

      ctx.drawImage(
        img,
        imgCX - halfCrop,
        imgCY - halfCrop,
        halfCrop * 2,
        halfCrop * 2,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE
      )

      onConfirm(canvas.toDataURL("image/webp", 0.85))
    } catch {
      onCancel()
    } finally {
      setCropping(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>裁剪头像</DialogTitle>
          <DialogDescription>
            拖动头像调整位置，缩放改变大小，方形区域将被裁切
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {/* Crop viewport */}
          <div
            ref={containerRef}
            className="relative cursor-grab touch-none select-none overflow-hidden rounded-full border-2 border-accent/60 bg-muted active:cursor-grabbing"
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt="待裁剪的头像"
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 h-auto w-auto max-w-none"
              style={{
                width: natural.w * displayScale,
                height: natural.h * displayScale,
                transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
              }}
            />
            {/* Dimming frame */}
            <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_9999px_hsl(var(--background)/0.6)]" />
          </div>

          {/* Zoom slider */}
          <div className="flex w-full max-w-xs items-center gap-3">
            <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Slider
              value={[scale]}
              min={1}
              max={3}
              step={0.01}
              onValueChange={handleScaleChange}
            />
          </div>

          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={cropping}>
              取消
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={cropping}>
              {cropping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              确认裁剪
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
