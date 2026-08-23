import { WriteBlogButton } from "@/components/blog/write-blog-button"

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <WriteBlogButton />
    </>
  )
}
