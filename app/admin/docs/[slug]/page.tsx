import { notFound } from "next/navigation"

import { auth } from "@/auth"
import { getDocBySlug } from "@/lib/docs"
import { DocForm } from "@/components/admin/doc-form"

export const metadata = {
  title: "编辑档案 | InfBlog",
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function EditDocPage({ params }: PageProps) {
  const { slug } = await params
  const decodedSlug = decodeURIComponent(slug)

  const session = await auth()
  if (!session?.user || session.user.role !== "OWNER") {
    notFound()
  }

  let doc
  try {
    doc = await getDocBySlug(decodedSlug)
  } catch {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <h2 className="font-display text-xl tracking-tight">编辑档案</h2>
      <DocForm
        mode="edit"
        slug={doc.slug}
        initialTitle={doc.title}
        initialDescription={doc.description}
        initialContent={doc.content}
        initialTags={doc.tags}
        initialCoverImage={doc.coverImage}
        initialSource={doc.source}
        initialSourceUrl={doc.sourceUrl}
        initialDate={doc.date}
      />
    </div>
  )
}
