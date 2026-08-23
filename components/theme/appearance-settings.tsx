"use client"

import { Check } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  type BackgroundType,
  useBackground,
} from "@/components/theme/background-provider"
import { cn } from "@/lib/utils"

const options: { value: BackgroundType; label: string; description: string }[] = [
  {
    value: "clean",
    label: "简洁",
    description: "无背景效果，专注阅读",
  },
  {
    value: "particles",
    label: "粒子连线",
    description: "仿博客园的流动粒子网络",
  },
  {
    value: "blobs",
    label: "流体光晕",
    description: "柔和变化的模糊色块",
  },
]

interface AppearanceSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppearanceSettings({
  open,
  onOpenChange,
}: AppearanceSettingsProps) {
  const { background, setBackground } = useBackground()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>外观设置</DialogTitle>
          <DialogDescription>
            选择你喜欢的首页背景效果
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 pt-2">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => setBackground(option.value)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                background === option.value
                  ? "border-accent bg-accent/10"
                  : "border-border bg-card/50 hover:border-accent/50"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  background === option.value
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-muted-foreground"
                )}
              >
                {background === option.value && (
                  <Check className="h-3 w-3" />
                )}
              </div>
              <div>
                <p className="font-medium">{option.label}</p>
                <p className="text-sm text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
