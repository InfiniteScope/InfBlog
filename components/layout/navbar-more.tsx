"use client"

import { useState } from "react"
import { BookOpen, BookX, MoreHorizontal, Palette } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AppearanceSettings } from "@/components/theme/appearance-settings"
import { useFlow } from "@/components/flow/flow-provider"

/** 细长比例屏幕下，把顶栏次要功能（外观/心流）收进"更多"菜单 */
export function NavbarMore() {
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const { active, toggle } = useFlow()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="更多功能" title="更多功能">
            <MoreHorizontal className="h-[1.2rem] w-[1.2rem]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setAppearanceOpen(true)}>
            <Palette className="mr-2 h-4 w-4" />
            外观设置
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggle}>
            {active ? (
              <BookX className="mr-2 h-4 w-4" />
            ) : (
              <BookOpen className="mr-2 h-4 w-4" />
            )}
            {active ? "退出心流模式" : "进入心流模式"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AppearanceSettings open={appearanceOpen} onOpenChange={setAppearanceOpen} />
    </>
  )
}
