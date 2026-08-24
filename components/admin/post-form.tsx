"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { createPost, updatePost, type AdminFormState } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"
import { MdxEditor } from "@/components/admin/mdx-editor"

interface PostFormProps {
  mode: "create" | "edit"
  slug?: string
  initialTitle?: string
  initialDescription?: string
  initialContent?: string
  initialTags?: string[]
  initialCoverImage?: string
  initialDate?: string
}

export function PostForm({
  mode,
  slug,
  initialTitle = "",
  initialDescription = "",
  initialContent = "",
  initialTags = [],
  initialCoverImage = "",
  initialDate = "",
}: PostFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [content, setContent] = useState(initialContent)
  const [tags, setTags] = useState(initialTags.join(", "))
  const [coverImage, setCoverImage] = useState(initialCoverImage)

  const action = mode === "create" ? createPost : updatePost.bind(null, slug!)
  const [state, formAction, isPending] = useActionState<AdminFormState, FormData>(
    action,
    null
  )

  useEffect(() => {
    if (state?.success) {
      router.push(`/blog/${state.slug}`)
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

      {mode === "edit" && initialDate && (
        <input type="hidden" name="date" value={initialDate} />
      )}

      <div className="flex items-center justify-between">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "保存中..."
            : mode === "create"
            ? "发布文章"
            : "更新文章"}
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
