/** 新弹幕创建后广播给 DanmakuList（热更新，不触发页面刷新） */
export const DANMAKU_CREATED_EVENT = "danmaku:created"

export interface CreatedDanmakuDetail {
  id: number
  content: string
  color: string
  userId: string | null
  createdAt: string
}
