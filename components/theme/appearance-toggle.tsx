"use client"

import { useState } from "react"
import { Palette } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AppearanceSettings } from "@/components/theme/appearance-settings"

export function AppearanceToggle() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="外观设置"
        title="外观设置"
      >
        <Palette className="h-[1.2rem] w-[1.2rem]" />
      </Button>
      <AppearanceSettings open={open} onOpenChange={setOpen} />
    </>
  )
}
