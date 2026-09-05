"use client"

import { useEffect, useState } from "react"
import { useReducedMotion } from "motion/react"

const WORDS = [
  "MY BLOG",
  "InfBlog",
  "MY DIGITAL GARDEN",
  "MY CODINGLAB",
  "TECHLAB",
  "INFINITESCOPE's BLOG"
]

const TYPE_MS = 90
const DELETE_MS = 45
const HOLD_MS = 1600

type Phase = "typing" | "holding" | "deleting"

export function TypedHeading() {
  const prefersReducedMotion = useReducedMotion()
  const [wordIndex, setWordIndex] = useState(0)
  const [display, setDisplay] = useState("")
  const [phase, setPhase] = useState<Phase>("typing")

  useEffect(() => {
    // Reduced motion: show the first word statically, no typing.
    if (prefersReducedMotion) {
      setDisplay(WORDS[0])
      return
    }

    const word = WORDS[wordIndex]
    let timeout: ReturnType<typeof setTimeout> | undefined

    if (phase === "typing") {
      if (display.length < word.length) {
        timeout = setTimeout(
          () => setDisplay(word.slice(0, display.length + 1)),
          TYPE_MS
        )
      } else {
        setPhase("holding")
      }
    } else if (phase === "holding") {
      timeout = setTimeout(() => setPhase("deleting"), HOLD_MS)
    } else {
      if (display.length === 0) {
        setWordIndex((i) => (i + 1) % WORDS.length)
        setPhase("typing")
      } else {
        timeout = setTimeout(
          () => setDisplay(word.slice(0, display.length - 1)),
          DELETE_MS
        )
      }
    }

    return () => clearTimeout(timeout)
  }, [display, phase, wordIndex, prefersReducedMotion])

  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
      {"// WELCOME TO "}
      <span className="text-foreground">{display}</span>
      <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-accent" />
    </p>
  )
}
