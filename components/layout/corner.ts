/**
 * 右下角悬浮栈的锚点契约。
 * 所有落在右下角的悬浮件（回到顶部/文章操作/书签/书写入口）必须从这里取档位，
 * 禁止散落硬编码坐标——新增悬浮件时从此处追加更高档位，物理上杜绝互相遮挡。
 */
export const CORNER = {
  /** 最底档：回到顶部（常驻） */
  backToTop: "bottom-6",
  /** 第二档：文章操作浮栏（书签/收藏/点赞）、文库书签 */
  float: "bottom-20",
  /** 第三档：书写入口（仅站长，/blog 与文章页） */
  write: "bottom-[8.75rem]",
} as const

export const CORNER_RIGHT = "right-6"
