"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Rocket } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  claimCollectible,
  notifyCollectible,
} from "@/lib/collectibles-client"
import { COLLECTIBLE_MAP } from "@/lib/collectibles"
import { SHATTER_EVENT } from "@/components/collectibles/shatter-avatar"

const PUNCHLINES = [
  "当一天和尚，...",
  "从今若许闲乘月...",
  "如果会跳出一根香蕉就好了",
  "你在纠结什么？",
  "也许该绑一个正经的功能了",
  "时而停下",
  "看看站长的仓库吧QAQ",
  "或许沿途的风景总好过终点",
  "互联网会记住",
  "InfBlog Is All Your Need!",
]

const REWARDS = [
  { text: "赛博功德+1", color: "#f59e0b" },
  { text: "智力+1", color: "#3b82f6" },
  { text: "智力+5", color: "#3b82f6" },
  { text: "源石锭+325", color: "#8b5cf6" },
  { text: "DPS+799", color: "#ef4444" },
  { text: "情商-2", color: "#10b981" },
  { text: "香蕉×1", color: "#eab308" },
  { text: "耐心+?", color: "#06b6d4" },
  { text: "take me to the moon...", color: "#3906d4ff" },
]

const BUTTON_WIDTH = 96 // px, matches w-24

const SHATTER_CHANCE = 0.05
const ROCKET_CHANCE = 0.05
const BANANA_CHANCE = 0.01
const BUBBLE_BANANA_CHANCE = 0.001

interface ShowReward {
  id: number
  text: string
  color: string
  x: number
}

interface RocketLaunch {
  id: number
  x: number
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function ChillButton() {
  const prefersReducedMotion = useReducedMotion()
  const { status } = useSession()
  const [punchline, setPunchline] = useState<string>("点我试试")
  const [rewards, setRewards] = useState<ShowReward[]>([])
  const [rockets, setRockets] = useState<RocketLaunch[]>([])
  const counterRef = useRef(0)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const claimBusyRef = useRef(false)

  // Measure whether the current punchline exceeds the button width.
  useEffect(() => {
    const el = measureRef.current
    if (!el) return
    setOverflowing(el.scrollWidth > BUTTON_WIDTH - 16)
  }, [punchline])

  function pushReward(text: string, color: string) {
    const id = ++counterRef.current
    const x = Math.floor(Math.random() * 57) - 28
    setRewards((prev) => [...prev.slice(-4), { id, text, color, x }])
    setTimeout(() => {
      setRewards((prev) => prev.filter((r) => r.id !== id))
    }, 1400)
  }

  async function claimDrop(itemId: "banana" | "bubble-banana") {
    if (claimBusyRef.current) return
    claimBusyRef.current = true
    try {
      const result = await claimCollectible(itemId)
      const meta = COLLECTIBLE_MAP[itemId]
      if (result === "claimed") {
        notifyCollectible(itemId)
        pushReward(`获得藏品 ${meta.label}`, meta.accent)
      } else if (result === "unauthenticated") {
        pushReward("登录后才能收进藏品!", "#94a3b8")
      }
    } finally {
      claimBusyRef.current = false
    }
  }

  async function handleClick() {
    let next = randomFrom(PUNCHLINES)
    while (next === punchline && PUNCHLINES.length > 1) {
      next = randomFrom(PUNCHLINES)
    }
    setPunchline(next)

    const reward = randomFrom(REWARDS)
    pushReward(reward.text, reward.color)

    // ── hidden rolls ─────────────────────────────────────────────
    if (!prefersReducedMotion) {
      // 5%: shatter the owner avatar (top-left sidebar)
      if (Math.random() < SHATTER_CHANCE) {
        window.dispatchEvent(new CustomEvent(SHATTER_EVENT))
      }
      // 5%: launch a small rocket from the button
      if (Math.random() < ROCKET_CHANCE) {
        const rect = containerRef.current?.getBoundingClientRect()
        const rocketId = ++counterRef.current
        setRockets((prev) => [
          ...prev,
          { id: rocketId, x: rect ? rect.left + rect.width / 2 : 0 },
        ])
        setTimeout(() => {
          setRockets((prev) => prev.filter((r) => r.id !== rocketId))
        }, 3000)
      }
    }

    // 1% banana / 0.1% golden banana (login required to collect)
    if (status === "authenticated") {
      if (Math.random() < BUBBLE_BANANA_CHANCE) {
        void claimDrop("bubble-banana")
      } else if (Math.random() < BANANA_CHANCE) {
        void claimDrop("banana")
      }
    }
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-24 overflow-hidden text-xs"
        onClick={handleClick}
        aria-label="点我试试"
        title={punchline}
      >
        {/* Hidden measuring copy, same font metrics as the visible text */}
        <span
          ref={measureRef}
          aria-hidden
          className="pointer-events-none absolute -z-10 whitespace-nowrap opacity-0"
        >
          {punchline}
        </span>

        {overflowing ? (
          // Long text: horizontal marquee scrolling
          <motion.span
            key={`marquee-${punchline}`}
            initial={{ x: BUTTON_WIDTH }}
            animate={{ x: -BUTTON_WIDTH }}
            transition={{ duration: 6, ease: "linear", repeat: Infinity }}
            className="block w-max whitespace-nowrap"
          >
            {punchline} | {punchline}
          </motion.span>
        ) : (
          // Short / medium text: vertical roll-in
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={punchline}
              initial={prefersReducedMotion ? undefined : { y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={prefersReducedMotion ? undefined : { y: -12, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="block w-full overflow-hidden text-ellipsis whitespace-nowrap"
            >
              {punchline}
            </motion.span>
          </AnimatePresence>
        )}
      </Button>

      {/* Floating rewards with random x offset, bounded to button edges */}
      <div className="pointer-events-none absolute inset-x-0 bottom-full mb-1">
        <AnimatePresence>
          {rewards.map((reward) => (
            <motion.span
              key={reward.id}
              initial={{ opacity: 0, y: 8, scale: 0.8, left: `calc(50% + ${reward.x}px)` }}
              animate={{ opacity: 1, y: -16, scale: 1, left: `calc(50% + ${reward.x}px)` }}
              exit={{ opacity: 0, y: -36, scale: 0.9, left: `calc(50% + ${reward.x}px)` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="absolute -translate-x-1/2 whitespace-nowrap font-mono text-xs font-medium"
              style={{ color: reward.color }}
            >
              {reward.text}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Rocket launches */}
      {rockets.map((rocket) => (
        <motion.div
          key={rocket.id}
          className="pointer-events-none fixed bottom-16 z-50"
          style={{ left: rocket.x }}
          initial={{ y: 0, x: "-50%", opacity: 1 }}
          animate={{ y: -window.innerHeight * 0.9, x: "-50%", opacity: [1, 1, 0] }}
          transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative flex flex-col items-center">
            <Rocket className="h-6 w-6 rotate-45 text-amber-400" />
            <div className="-mt-0.5 flex flex-col items-center">
              <span className="h-2 w-1 rounded-full bg-orange-400/90" />
              <span className="h-2 w-0.5 animate-pulse rounded-full bg-orange-500/70" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
