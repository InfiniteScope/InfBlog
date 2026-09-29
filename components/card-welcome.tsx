"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BookMarked, FileText, Sparkles } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const CARD_COOKIE = "from_card"

/**
 * 名片卡欢迎弹窗：/card 入口设置 from_card cookie 后跳转主页，
 * 本组件读取并弹出问候，随后清除标记（刷新不再弹）。
 */
export function CardWelcome() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const hasFlag = document.cookie
      .split("; ")
      .some((c) => c.startsWith(`${CARD_COOKIE}=`))
    if (!hasFlag) return
    setOpen(true)
    // 清除标记：刷新 / 后续访问不再弹
    document.cookie = `${CARD_COOKIE}=; Max-Age=0; path=/`
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md select-none">
        <DialogHeader className="items-center text-center">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-accent/10">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <p className="font-mono text-[10px] tracking-widest text-accent">
            // WELCOME_FROM_CARD
          </p>
          <DialogTitle className="font-display text-2xl tracking-tight">
            欢迎通过名片卡访问本站！
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            很高兴在现实世界与你相遇。这里是 InfiniteScope 的个人博客——
            记录技术思考、设计实践与生活片段，随便逛逛吧。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 pt-1">
          <Button asChild onClick={() => setOpen(false)}>
            <Link href="/blog">
              <FileText className="mr-2 h-4 w-4" />
              去博客看看
            </Link>
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" asChild onClick={() => setOpen(false)}>
              <Link href="/docs">
                <BookMarked className="mr-2 h-4 w-4" />
                文库
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
            >
              随便逛逛
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
