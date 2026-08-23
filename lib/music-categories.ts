export const MUSIC_CATEGORIES = [
  { id: "soothing", label: "缓速", dir: "soothing" },
  { id: "intense", label: "激烈", dir: "intense" },
  { id: "white-noise", label: "白噪", dir: "white-noise" },
] as const

export type MusicCategoryId = (typeof MUSIC_CATEGORIES)[number]["id"]
