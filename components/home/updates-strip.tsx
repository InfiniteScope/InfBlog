import ReactMarkdown from "react-markdown"

import type { Update } from "@/lib/updates"

interface UpdatesStripProps {
  updates: Update[]
}

/**
 * 最新动态的横向滚动带：scroll-snap + 隐藏滚动条 + 边缘渐隐，
 * 打破首页纯纵向滚动的惯性（结构非线性）。
 */
export function UpdatesStrip({ updates }: UpdatesStripProps) {
  return (
    <div className="v2-strip -mx-2 px-2">
      {updates.map((update, index) => (
        <article
          key={index}
          className="v2-card flex w-[280px] shrink-0 flex-col gap-2 p-4 sm:w-[320px]"
        >
          <p className="font-mono text-[10px] tracking-wide text-accent">
            {new Date(update.date).toLocaleDateString("zh-CN")}
          </p>
          {update.title && (
            <p className="text-sm font-medium leading-snug">{update.title}</p>
          )}
          <div className="text-sm leading-relaxed text-muted-foreground line-clamp-3 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:leading-relaxed [&_ul]:ml-5 [&_ul]:list-disc">
            <ReactMarkdown>{update.content}</ReactMarkdown>
          </div>
        </article>
      ))}
    </div>
  )
}
