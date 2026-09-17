import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { getDigest } from "@/lib/digest"
import { DigestView } from "@/components/digest/digest-view"
import { Button } from "@/components/ui/button"

interface PageProps {
  params: Promise<{ date: string; period: string }>
}

export const revalidate = 300

export async function generateMetadata({ params }: PageProps) {
  const { date, period } = await params
  const digest = await getDigest(date, period)
  const alternates = {
    types: {
      "application/rss+xml": [
        { title: "科技资讯日报", url: "/digest/feed.xml" },
        { title: "InfBlog 博客", url: "/feed.xml" },
      ],
    },
  }
  return digest
    ? {
        title: `${digest.title} | InfBlog`,
        description: digest.summary ?? undefined,
        alternates,
      }
    : { title: "快报 | InfBlog", alternates }
}

export default async function DigestDetailPage({ params }: PageProps) {
  const { date, period } = await params
  const digest = await getDigest(date, period)
  if (!digest) notFound()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-8">
      <Button variant="ghost" size="sm" className="w-fit gap-1" asChild>
        <Link href="/digest">
          <ArrowLeft className="h-4 w-4" />
          返回快报
        </Link>
      </Button>
      <DigestView digest={digest} />
    </div>
  )
}
