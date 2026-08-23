"use client"

import { motion } from "motion/react"
import ReactMarkdown from "react-markdown"
import { Sparkles } from "lucide-react"

import type { Update } from "@/lib/updates"

interface TimelineWidgetProps {
  updates: Update[]
}

export function TimelineWidget({ updates }: TimelineWidgetProps) {
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 font-display text-sm tracking-wide text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        // LATEST_UPDATES
      </h3>
      <div className="relative space-y-0">
        {/* Glowing vertical line */}
        <div className="absolute left-[15px] top-3 bottom-3 w-px bg-gradient-to-b from-accent/60 via-accent/30 to-transparent" />

        {updates.map((update, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.4,
              delay: index * 0.1,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="group relative pl-8 py-3"
          >
            {/* Node */}
            <span className="absolute left-[9px] top-4 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-background bg-accent shadow-[0_0_8px_hsl(var(--accent)/0.5)] transition-shadow group-hover:shadow-[0_0_12px_hsl(var(--accent)/0.8)]">
              <span className="h-1 w-1 rounded-full bg-background" />
            </span>

            <div className="rounded-xl border border-border bg-card/50 p-3 transition-colors hover:border-accent/40 hover:bg-card">
              <p className="mb-1 text-[10px] font-mono text-accent">
                {new Date(update.date).toLocaleDateString("zh-CN")}
              </p>
              {update.title && (
                <p className="mb-1 text-sm font-medium leading-snug">
                  {update.title}
                </p>
              )}
              <div className="space-y-2 text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:leading-relaxed [&_ul]:ml-5 [&_ul]:list-disc">
                <ReactMarkdown>{update.content}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
