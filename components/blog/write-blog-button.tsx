"use client"

import Link from "next/link"
import { PenLine } from "lucide-react"
import { useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { CORNER, CORNER_RIGHT } from "@/components/layout/corner"

export function WriteBlogButton() {
  const { data: session } = useSession()

  if (session?.user?.role !== "OWNER") {
    return null
  }

  return (
    <Button
      asChild
      className={`fixed ${CORNER_RIGHT} ${CORNER.write} z-40 h-12 gap-2 rounded-full px-5 shadow-lg`}
    >
      <Link href="/admin/posts/new">
        <PenLine className="h-5 w-5" />
        书写博客
      </Link>
    </Button>
  )
}
