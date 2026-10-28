/**
 * 全局加载边界。
 *
 * 没有 loading.tsx 时，点击站内链接会一直停在旧页面上等待 RSC 返回
 * （本站页面都是动态渲染，服务端 40–60ms + 公网往返 0.2–1.8s），
 * 期间没有任何反馈，观感像“卡住”。
 *
 * 这里给一个极轻的骨架：纯 CSS animate-pulse，不引入任何 JS，
 * 也不做会拖慢首帧的转场。加载完由 Suspense 直接替换。
 */
export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-3xl px-1 py-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* 顶部细进度感线条 */}
      <div className="mb-8 h-px w-full overflow-hidden bg-border/60">
        <div className="loading-sweep h-full w-1/3 bg-accent/80" />
      </div>

      <div className="space-y-4 animate-pulse">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-8 w-2/3 rounded bg-muted" />
        <div className="h-3 w-1/3 rounded bg-muted" />
        <div className="h-56 w-full rounded-xl bg-muted/70" />
        <div className="h-3 w-full rounded bg-muted/80" />
        <div className="h-3 w-11/12 rounded bg-muted/80" />
        <div className="h-3 w-4/5 rounded bg-muted/80" />
      </div>

      <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        Loading…
      </p>
    </div>
  )
}
