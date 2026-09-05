"use client"

import { useEffect, useState } from "react"
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
import {
  getUiTheme,
  setUiThemeWithTransition,
  type UiTheme,
} from "@/components/theme/ui-theme"
import { cn } from "@/lib/utils"

const uiThemeOptions: { value: UiTheme; label: string; description: string }[] =
  [
    {
      value: "classic",
      label: "经典",
      description: "朴素温润的默认界面",
    },
    {
      value: "explore",
      label: "探索",
      description: "月之暗面：抽象、工业、向未知致意",
    },
  ]

const backgroundOptions: {
  value: BackgroundType
  label: string
  description: string
}[] = [
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
  const [uiTheme, setUiTheme] = useState<UiTheme>("classic")

  useEffect(() => {
    setUiTheme(getUiTheme())
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>外观设置</DialogTitle>
          <DialogDescription>界面主题与背景效果</DialogDescription>
        </DialogHeader>

        {/* 界面主题：经典 / 探索（日食转场） */}
        <div className="space-y-2 pt-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            // 界面主题
          </p>
          <div className="grid grid-cols-2 gap-3">
            {uiThemeOptions.map((option) => (
              <button
                key={option.value}
                onClick={(e) => {
                  setUiThemeWithTransition(option.value, {
                    x: e.clientX,
                    y: e.clientY,
                  })
                  setUiTheme(option.value)
                }}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  uiTheme === option.value
                    ? "border-accent bg-accent/10"
                    : "border-border bg-card/50 hover:border-accent/50"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    uiTheme === option.value
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-muted-foreground"
                  )}
                >
                  {uiTheme === option.value && <Check className="h-3 w-3" />}
                </div>
                <div>
                  <p className="font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 背景效果 */}
        <div className="space-y-2 pt-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            // 背景效果
          </p>
          <div className="grid gap-3">
            {backgroundOptions.map((option) => (
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
