import Link from "next/link"
import { ComponentPropsWithoutRef, ReactNode } from "react"

function getTextFromChildren(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children)
  }
  if (Array.isArray(children)) {
    return children.map(getTextFromChildren).join("")
  }
  if (children && typeof children === "object" && "props" in children) {
    const childProps = (children as { props: { children?: unknown } }).props
    if (childProps.children !== undefined) {
      return getTextFromChildren(childProps.children as ReactNode)
    }
  }
  return ""
}

function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function Heading2({ className, children, ...props }: ComponentPropsWithoutRef<"h2">) {
  const id = slugifyHeading(getTextFromChildren(children))
  return (
    <h2
      id={id}
      className="mt-10 scroll-m-20 border-b border-border pb-2 font-display text-2xl tracking-tight transition-colors first:mt-0"
      {...props}
    >
      {children}
    </h2>
  )
}

function Heading3({ className, children, ...props }: ComponentPropsWithoutRef<"h3">) {
  const id = slugifyHeading(getTextFromChildren(children))
  return (
    <h3
      id={id}
      className="mt-8 scroll-m-20 font-display text-xl tracking-tight transition-colors"
      {...props}
    >
      {children}
    </h3>
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
  // In-page anchor links should scroll within the same page.
  if (href?.startsWith("#")) {
    return (
      <a
        href={href}
        className="font-medium text-primary underline underline-offset-4"
        {...props}
      />
    )
  }
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
      className="mb-4 mt-6 overflow-x-auto rounded-lg border border-border bg-muted p-4 font-mono text-sm [&_code]:rounded-none [&_code]:bg-transparent [&_code]:p-0"
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

function Del({ className, ...props }: ComponentPropsWithoutRef<"del">) {
  return (
    <del
      className="line-through text-muted-foreground"
      {...props}
    />
  )
}

function Table({ className, ...props }: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="my-6 overflow-x-auto">
      <table
        className="w-full border-collapse text-sm"
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: ComponentPropsWithoutRef<"thead">) {
  return <thead className="bg-muted/50" {...props} />
}

function TableRow({ className, ...props }: ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      className="border-b border-border transition-colors hover:bg-muted/40"
      {...props}
    />
  )
}

function TableHead({ className, ...props }: ComponentPropsWithoutRef<"th">) {
  return (
    <th
      className="border border-border px-4 py-2 text-left font-medium"
      {...props}
    />
  )
}

function TableCell({ className, ...props }: ComponentPropsWithoutRef<"td">) {
  return <td className="border border-border px-4 py-2 align-top" {...props} />
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
  del: Del,
  table: Table,
  thead: TableHeader,
  tr: TableRow,
  th: TableHead,
  td: TableCell,
}
