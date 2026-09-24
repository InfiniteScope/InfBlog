"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { createDoc, updateDoc, type DocFormState } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MdxEditor } from "@/components/admin/mdx-editor"

interface DocFormProps {
  mode: "create" | "edit"
  slug?: string
  initialTitle?: string
  initialDescription?: string
  initialContent?: string
  initialTags?: string[]
  initialCoverImage?: string
  initialSource?: string
  initialSourceUrl?: string
  initialDate?: string
}

export function DocForm({
  mode,
  slug,
  initialTitle = "",
  initialDescription = "",
  initialContent = "",
  initialTags = [],
  initialCoverImage = "",
  initialSource = "",
  initialSourceUrl = "",
  initialDate = "",
}: DocFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [content, setContent] = useState(initialContent)
  const [tags, setTags] = useState(initialTags.join(", "))
  const [coverImage, setCoverImage] = useState(initialCoverImage)
  const [source, setSource] = useState(initialSource)
  const [sourceUrl, setSourceUrl] = useState(initialSourceUrl)

  const action = mode === "create" ? createDoc : updateDoc.bind(null, slug!)
  const [state, formAction, isPending] = useActionState<DocFormState, FormData>(
    action,
    null
  )

  useEffect(() => {
    if (state?.success) {
      router.push(`/docs/${state.slug}`)
    }
  }, [state, router])

  return (
    <form action={formAction} className="space-y-6">
      <MdxEditor
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        content={content}
        setContent={setContent}
        tags={tags}
        setTags={setTags}
        coverImage={coverImage}
        setCoverImage={setCoverImage}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="source">资料来源（可选）</Label>
          <Input
            id="source"
            name="source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="例如：语雀 · XXX"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sourceUrl">来源链接（可选）</Label>
          <Input
            id="sourceUrl"
            name="sourceUrl"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      {mode === "edit" && initialDate && (
        <input type="hidden" name="date" value={initialDate} />
      )}

      <div className="flex items-center justify-between">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "保存中..."
            : mode === "create"
            ? "创建档案"
            : "更新档案"}
        </Button>
        {state?.success === false && (
          <div className="space-y-1 text-right">
            {state.message && (
              <p className="text-sm text-destructive">{state.message}</p>
            )}
            {state.errors && Object.values(state.errors).flat().length > 0 && (
              <p className="text-sm text-destructive">
                {Object.values(state.errors).flat().join("；")}
              </p>
            )}
          </div>
        )}
      </div>
    </form>
  )
}
