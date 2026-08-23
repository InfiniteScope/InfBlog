"use client"

import { BookOpen, BookX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useFlow } from "@/components/flow/flow-provider"

export function FlowToggle() {
  const { active, toggle } = useFlow()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={active ? "退出心流模式" : "进入心流模式"}
      title={active ? "退出心流模式" : "进入心流模式"}
      className={active ? "text-primary" : undefined}
    >
      {active ? (
        <BookX className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <BookOpen className="h-[1.2rem] w-[1.2rem]" />
      )}
    </Button>
  )
}
