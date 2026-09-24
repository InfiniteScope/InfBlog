import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink, Pencil, Tag } from "lucide-react"
import { MDXRemote } from "next-mdx-remote/rsc"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import rehypePrettyCode from "rehype-pretty-code"

import { auth } from "@/auth"
import { getDocBySlug, getDocSlugs } from "@/lib/docs"
import { extractHeadings } from "@/lib/headings"
import { rehypeStyleObject } from "@/lib/rehype-style-object"
import { mdxComponents } from "@/components/mdx-components"
import { TableOfContents } from "@/components/blog/table-of-contents"
import { PostDates } from "@/components/blog/post-dates"
import { RemoveDocButton } from "@/components/admin/remove-doc-button"
import { Button } from "@/components/ui/button"

interface PageProps {
  params: Promise<{ slug: string }>
}

export const dynamicParams = true
export const revalidate = 60

export async function generateStaticParams() {
  const slugs = await getDocSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  try {
    const doc = await getDocBySlug(slug)
    return {
      title: `${doc.title} | 文库 | InfBlog`,
      description: doc.description,
    }
  } catch {
    return { title: "档案未找到 | InfBlog" }
  }
}

export default async function DocDetailPage({ params }: PageProps) {
  const { slug } = await params
  let doc

  try {
    doc = await getDocBySlug(slug)
  } catch {
    notFound()
  }

  const session = await auth()
  const isOwner = session?.user?.role === "OWNER"
  const headings = extractHeadings(doc.content)

  return (
    <div className="@container mx-auto flex w-full max-w-3xl flex-col gap-8 py-8 xl:max-w-none xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,48rem)_minmax(0,1fr)]">
      <article className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-8 xl:col-start-2 xl:row-start-1">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" className="w-fit gap-1" asChild>
            <Link href="/docs">
              <ArrowLeft className="h-4 w-4" />
              返回文库
            </Link>
          </Button>

          {isOwner && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/docs/${doc.slug}`}>
                  <Pencil className="mr-1 h-4 w-4" />
                  编辑
                </Link>
              </Button>
              <RemoveDocButton slug={doc.slug} redirectTo="/docs" />
            </div>
          )}
        </div>

        <header className="space-y-4">
          <p className="font-mono text-xs tracking-widest text-accent">
            // ARCHIVE
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <PostDates date={doc.date} updatedAt={doc.updatedAt} />
            {doc.tags.length > 0 && (
              <span className="flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" />
                {doc.tags.join(", ")}
              </span>
            )}
            {doc.sourceUrl && (
              <a
                href={doc.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 transition-colors hover:text-accent"
                title="资料来源"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                来源{doc.source ? `：${doc.source}` : ""}
              </a>
            )}
          </div>
          <h1 className="font-display text-3xl tracking-tight md:text-4xl">
            {doc.title}
          </h1>
          <p className="text-lg text-muted-foreground">{doc.description}</p>
          {doc.coverImage && (
            <div className="aspect-video w-full overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.coverImage}
                alt={doc.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </header>

        <div className="max-w-none">
          <MDXRemote
            source={doc.content}
            components={mdxComponents}
            options={{
              mdxOptions: {
                remarkPlugins: [remarkGfm, remarkMath],
                rehypePlugins: [
                  rehypeKatex,
                  [
                    rehypePrettyCode,
                    {
                      theme: { light: "github-light", dark: "github-dark" },
                      keepBackground: false,
                      defaultLang: "plaintext",
                    },
                  ],
                  rehypeStyleObject,
                ],
              },
            }}
          />
        </div>
      </article>

      {headings.length >= 3 && (
        <aside className="hidden @min-[1150px]:block xl:col-start-3 xl:row-start-1 xl:justify-self-end">
          <div className="sticky top-20">
            <TableOfContents headings={headings} />
          </div>
        </aside>
      )}
    </div>
  )
}
