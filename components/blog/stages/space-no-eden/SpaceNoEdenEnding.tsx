"use client"

import { useEffect, useMemo, useState } from "react"
import { Radio, Send, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { encodeTelemetryMorse } from "./chapters"
import { useSpaceNoEdenStage } from "./stage-context"

const PRESET_SIGNALS = [
  "STILL TRANSMITTING",
  "拒绝沉默",
  "AS ABOVE, SO BELOW",
  "2047-OPHIUCHUS",
]

const STORAGE_KEY = "infblog:sne-antenna-last"

export function SpaceNoEdenEnding() {
  const { active, chapter } = useSpaceNoEdenStage()
  const [mounted, setMounted] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [signal, setSignal] = useState("STILL TRANSMITTING")
  const [lastTransmitted, setLastTransmitted] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [pulseWave, setPulseWave] = useState(false)
  const [cooldownSec, setCooldownSec] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setLastTransmitted(saved)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!active) return
    let cancelled = false
    fetch("/api/stage/space-no-eden/antenna")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.count === "number") {
          setCount(data.count)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [active])

  useEffect(() => {
    if (cooldownSec <= 0) return
    const timer = setInterval(() => {
      setCooldownSec((prev) => {
        if (prev <= 1) {
          setErrorMsg(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownSec])

  const morsePreview = useMemo(() => encodeTelemetryMorse(signal), [signal])

  if (!mounted || !active) return null

  async function handleTransmit(e: React.FormEvent) {
    e.preventDefault()
    if (sending || cooldownSec > 0) return
    setSending(true)
    setErrorMsg(null)

    const textToSend = signal.trim() || "STILL TRANSMITTING"
    try {
      const res = await fetch("/api/stage/space-no-eden/antenna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal: textToSend }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.status === 429 && typeof data.retryAfterMs === "number") {
        const secs = Math.max(1, Math.ceil(data.retryAfterMs / 1000))
        setCooldownSec(secs)
        setErrorMsg(`信号冷却中，请 ${secs} 秒后再试`)
        return
      }

      if (!res.ok) {
        setErrorMsg(data.error || "脉冲发送失败")
        return
      }

      if (typeof data.count === "number") {
        setCount(data.count)
      }
      setLastTransmitted(textToSend)
      try {
        localStorage.setItem(STORAGE_KEY, textToSend)
      } catch {
        // ignore
      }
      setPulseWave(true)
      setTimeout(() => setPulseWave(false), 1800)
    } catch {
      setErrorMsg("网络波动，未能接通遥测站")
    } finally {
      setSending(false)
    }
  }

  return (
    <section
      aria-label="在暗面架起天线"
      className="relative mt-6 overflow-hidden rounded-2xl border bg-card/60 p-5 backdrop-blur-md sm:p-6"
      style={{ borderColor: `rgba(${chapter.glowRgb}, 0.35)` }}
    >
      {/* 发射瞬间的脉冲扩散光环 */}
      {pulseWave && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-pulse"
          style={{
            background: `radial-gradient(circle at 50% 25%, rgba(${chapter.glowRgb}, 0.22), transparent 68%)`,
          }}
        />
      )}

      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full border"
              style={{
                borderColor: `rgba(${chapter.glowRgb}, 0.5)`,
                backgroundColor: `rgba(${chapter.glowRgb}, 0.12)`,
                color: `rgb(${chapter.glowRgb})`,
              }}
            >
              <Radio className={cn("h-3.5 w-3.5", pulseWave && "animate-ping")} />
            </span>
            <div>
              <p className="font-mono text-[11px] tracking-widest text-muted-foreground">
                DARK_SIDE_ANTENNA // 拒绝沉默
              </p>
              <h2 className="font-display text-lg tracking-tight text-foreground">
                在各自的暗面架起天线
              </h2>
            </div>
          </div>

          {count !== null && (
            <span
              className="rounded-full border px-2.5 py-0.5 font-mono text-[11px]"
              style={{
                borderColor: `rgba(${chapter.glowRgb}, 0.35)`,
                color: `rgb(${chapter.glowRgb})`,
              }}
            >
              已发射 {count} 道信号
            </span>
          )}
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          在寂静彻底收走一切意义之前，把一句短小的追问、坐标或呼号编码进脉冲序列，向这颗孤独行星之外的黑暗发出一束信号。
        </p>

        <div className="flex flex-wrap gap-1.5">
          {PRESET_SIGNALS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setSignal(preset)}
              className="rounded-full border border-border/70 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              style={
                signal === preset
                  ? {
                      borderColor: `rgba(${chapter.glowRgb}, 0.55)`,
                      backgroundColor: `rgba(${chapter.glowRgb}, 0.12)`,
                      color: `rgb(${chapter.glowRgb})`,
                    }
                  : undefined
              }
            >
              {preset}
            </button>
          ))}
        </div>

        <form onSubmit={handleTransmit} className="flex flex-col gap-2.5 sm:flex-row">
          <Input
            value={signal}
            onChange={(e) => setSignal(e.target.value)}
            maxLength={80}
            placeholder="输入想发往深空的一句话或呼号…"
            className="font-mono text-xs"
            disabled={sending}
          />
          <Button
            type="submit"
            disabled={sending || cooldownSec > 0}
            className="shrink-0 gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {cooldownSec > 0
              ? `冷却中 ${cooldownSec}s`
              : sending
                ? "编码发射中..."
                : "发射脉冲信号"}
          </Button>
        </form>

        {/* 实时莫尔斯电码编码预览 */}
        <div
          className="rounded-lg border bg-background/50 px-3 py-2 font-mono text-[11px]"
          style={{ borderColor: "hsl(var(--border) / 0.6)" }}
        >
          <span className="text-muted-foreground">MORSE_STREAM: </span>
          <span
            className="break-all tracking-widest"
            style={{ color: `rgb(${chapter.glowRgb})` }}
          >
            {morsePreview}
          </span>
        </div>

        {errorMsg && cooldownSec > 0 && (
          <p className="font-mono text-xs text-amber-500">
            信号冷却中，请 {cooldownSec} 秒后再试
          </p>
        )}
        {errorMsg && cooldownSec === 0 && (
          <p className="font-mono text-xs text-destructive">{errorMsg}</p>
        )}

        {lastTransmitted && (
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <Sparkles
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: `rgb(${chapter.glowRgb})` }}
            />
            <span>
              已将「{lastTransmitted}」编码为电磁波脉冲
              {count !== null ? ` · 你是第 ${count} 位在此处暗面架起天线的人` : ""}
            </span>
          </div>
        )}
      </div>
    </section>
  )
}
