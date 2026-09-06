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
