"use client"

import Link from "next/link"
import { PenLine } from "lucide-react"
import { useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"

export function WriteBlogButton() {
  const { data: session } = useSession()

  if (session?.user?.role !== "OWNER") {
    return null
  }

  return (
    <Button
      asChild
      className="fixed right-6 top-16 z-50 h-12 gap-2 rounded-full px-5 shadow-lg"
    >
      <Link href="/admin/posts/new">
        <PenLine className="h-5 w-5" />
        书写博客
      </Link>
    </Button>
  )
}
