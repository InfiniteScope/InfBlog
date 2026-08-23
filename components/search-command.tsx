"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Download, FileText, Home, LayoutDashboard, MessageSquare, Rss, User } from "lucide-react"

import { siteConfig } from "@/lib/config"
import type { Post } from "@/lib/mdx"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

const navigationItems = [
  { name: "首页", href: "/", icon: Home },
  { name: "博客", href: "/blog", icon: FileText },
  { name: "动态", href: "/updates", icon: Rss },
  { name: "资源分享", href: "/resources", icon: Download },
  { name: "留言墙", href: "/guestbook", icon: MessageSquare },
  { name: "关于", href: "/about", icon: User },
  { name: "管理后台", href: "/admin/posts", icon: LayoutDashboard },
]

interface SearchCommandProps {
  posts?: Post[]
}

export function SearchCommand({ posts = [] }: SearchCommandProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="搜索"
      >
        <span className="sr-only">打开搜索</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[1.2rem] w-[1.2rem]"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="搜索页面、文章..." />
        <CommandList>
          <CommandEmpty>未找到结果</CommandEmpty>
          <CommandGroup heading="导航">
            {navigationItems.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => runCommand(() => router.push(item.href))}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          {posts.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="文章">
                {posts.map((post) => (
                  <CommandItem
                    key={post.slug}
                    onSelect={() =>
                      runCommand(() => router.push(`/blog/${post.slug}`))
                    }
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <span>{post.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          <CommandSeparator />
          <CommandGroup heading="设置">
            <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
              <span>返回首页</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
