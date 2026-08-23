import Link from "next/link"
import { ComponentPropsWithoutRef } from "react"

function Heading2({ className, ...props }: ComponentPropsWithoutRef<"h2">) {
  return (
    <h2
      className="mt-10 scroll-m-20 border-b border-border pb-2 font-display text-2xl tracking-tight transition-colors first:mt-0"
      {...props}
    />
  )
}

function Heading3({ className, ...props }: ComponentPropsWithoutRef<"h3">) {
  return (
    <h3
      className="mt-8 scroll-m-20 font-display text-xl tracking-tight transition-colors"
      {...props}
    />
  )
}

function Paragraph({ className, ...props }: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className="leading-7 [&:not(:first-child)]:mt-6"
      {...props}
    />
  )
}

function Anchor({ className, ...props }: ComponentPropsWithoutRef<"a">) {
  const { href } = props
  if (href?.startsWith("/")) {
    return (
      <Link
        href={href}
        className="font-medium text-primary underline underline-offset-4"
        {...props}
      />
    )
  }
  return (
    <a
      href={href}
      className="font-medium text-primary underline underline-offset-4"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  )
}

function UnorderedList({ className, ...props }: ComponentPropsWithoutRef<"ul">) {
  return (
    <ul
      className="my-6 ml-6 list-disc [&>li]:mt-2"
      {...props}
    />
  )
}

function OrderedList({ className, ...props }: ComponentPropsWithoutRef<"ol">) {
  return (
    <ol
      className="my-6 ml-6 list-decimal [&>li]:mt-2"
      {...props}
    />
  )
}

function Code({ className, ...props }: ComponentPropsWithoutRef<"code">) {
  return (
    <code
      className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm"
      {...props}
    />
  )
}

function Pre({ className, ...props }: ComponentPropsWithoutRef<"pre">) {
  return (
    <pre
      className="mb-4 mt-6 overflow-x-auto rounded-lg border border-border bg-muted p-4 font-mono text-sm"
      {...props}
    />
  )
}

function Img({
  className,
  alt,
  ...props
}: ComponentPropsWithoutRef<"img">) {
  return (
    <img
      alt={alt}
      className="my-6 h-auto w-full rounded-lg border border-border object-cover"
      {...props}
    />
  )
}

export const mdxComponents = {
  h2: Heading2,
  h3: Heading3,
  p: Paragraph,
  a: Anchor,
  ul: UnorderedList,
  ol: OrderedList,
  code: Code,
  pre: Pre,
  img: Img,
}
