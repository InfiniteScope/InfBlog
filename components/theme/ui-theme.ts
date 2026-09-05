export type UiTheme = "classic" | "explore"

export const UI_THEME_STORAGE_KEY = "infblog-ui"
export const UI_CLASSIC_CLASS = "ui-classic"

/** 当前 UI 主题（经典 = html.ui-classic 存在；默认经典） */
export function getUiTheme(): UiTheme {
  if (typeof document === "undefined") return "classic"
  return document.documentElement.classList.contains(UI_CLASSIC_CLASS)
    ? "classic"
    : "explore"
}

export function applyUiTheme(theme: UiTheme) {
  document.documentElement.classList.toggle(
    UI_CLASSIC_CLASS,
    theme === "classic"
  )
  try {
    if (theme === "explore") {
      localStorage.setItem(UI_THEME_STORAGE_KEY, "explore")
    } else {
      localStorage.removeItem(UI_THEME_STORAGE_KEY)
    }
  } catch {
    // 隐私模式等场景下忽略存储失败
  }
}

interface ViewTransitionCapableDocument extends Document {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> }
}

/**
 * 日食转场：圆盘自点击处掠过画面完成换肤——
 * 进入「探索」= 月亮掩来（eclipse-in，慢而沉）；
 * 回到「经典」= 光复（eclipse-out，快而亮）。
 * reduced-motion 或浏览器不支持时直接切换。
 */
export function setUiThemeWithTransition(
  theme: UiTheme,
  origin?: { x: number; y: number }
) {
  if (typeof document === "undefined" || getUiTheme() === theme) return

  const doc = document as ViewTransitionCapableDocument
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (!doc.startViewTransition || reduce) {
    applyUiTheme(theme)
    return
  }

  const root = document.documentElement
  root.style.setProperty(
    "--vt-origin-x",
    `${origin?.x ?? window.innerWidth / 2}px`
  )
  root.style.setProperty(
    "--vt-origin-y",
    `${origin?.y ?? window.innerHeight / 2}px`
  )
  root.dataset.vt = theme === "explore" ? "eclipse-in" : "eclipse-out"

  const transition = doc.startViewTransition(() => applyUiTheme(theme))
  transition.finished.finally(() => {
    delete root.dataset.vt
  })
}
