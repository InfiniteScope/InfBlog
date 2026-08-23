"use client"

import { Check, Library } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMusic, type MusicCategory } from "@/components/music/music-provider"
import { MUSIC_CATEGORIES } from "@/lib/music-categories"
import { cn } from "@/lib/utils"

export function MusicCategorySelect() {
  const { category, setCategory } = useMusic()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="更改音乐类型">
          <Library className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36">
        {MUSIC_CATEGORIES.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => setCategory(option.id as MusicCategory)}
            className="gap-2"
          >
            <span className={cn("flex-1")}>{option.label}</span>
            {category === option.id && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
