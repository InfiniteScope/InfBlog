"use client"

import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useThemeTransition } from "@/components/theme-provider"

export function ThemeToggle() {
  const { toggleWithTransition } = useThemeTransition()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleWithTransition}
      aria-label="切换主题"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
