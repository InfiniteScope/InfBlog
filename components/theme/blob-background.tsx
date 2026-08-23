"use client"

export function BlobBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="absolute -left-[10%] -top-[10%] h-[50vmax] w-[50vmax] rounded-full bg-accent/20 opacity-40 blur-[100px] animate-blob"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="absolute -right-[10%] top-[20%] h-[45vmax] w-[45vmax] rounded-full bg-primary/20 opacity-40 blur-[100px] animate-blob"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute bottom-[0%] left-[20%] h-[40vmax] w-[40vmax] rounded-full bg-purple-500/20 opacity-30 blur-[100px] animate-blob"
        style={{ animationDelay: "4s" }}
      />
      <div
        className="absolute right-[10%] bottom-[10%] h-[35vmax] w-[35vmax] rounded-full bg-cyan-500/20 opacity-30 blur-[100px] animate-blob"
        style={{ animationDelay: "6s" }}
      />
    </div>
  )
}
