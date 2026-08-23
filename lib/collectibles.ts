export type CollectibleId =
  | "banana"
  | "bubble-banana"
  | "sharing-hero"
  | "listener"
  | "reader"

export interface CollectibleMeta {
  id: CollectibleId
  name: string
  /** 展示名：name + id 的组合名牌 */
  label: string
  description: string
  /** 获得方式说明（图鉴用） */
  howToGet: string
  rarity: "common" | "rare" | "legendary"
  /** 主题色（展厅 UI / 底座光） */
  accent: string
}

export const COLLECTIBLE_LIST: CollectibleMeta[] = [
  {
    id: "banana",
    name: "Banana",
    label: "'Banana'",
    description: "一根平平无奇的香蕉。\n“骗局的开始总是甜蜜的...”",
    howToGet: "点击「点我试试」按钮，有 1% 概率掉落。",
    rarity: "common",
    accent: "#f5c328",
  },
  {
    id: "bubble-banana",
    name: "BubbleBanana",
    label: "'BubbleBanana'",
    description: "一根金色的香蕉，散发着狡黠的微光。\n“人类文明随贪念升沉。”",
    howToGet: "点击「点我试试」按钮，有 0.1% 概率掉落。",
    rarity: "legendary",
    accent: "#ffd700",
  },
  {
    id: "sharing-hero",
    name: "Sharing?Hero.",
    label: "'Sharing?Hero.'",
    description: "一个授予分享者的奖杯（抱歉技术有限，画的有点丑...）\n感谢您对本网站做出的贡献！",
    howToGet: "第一次提交资源分享后自动获得（无需通过审核）。",
    rarity: "rare",
    accent: "#e8b84b",
  },
  {
    id: "listener",
    name: "Listener...",
    label: "'Listener...'",
    description: "一台头戴式耳机和一台唱片机。\n若干月后，你还会记起这个博客里听的这些歌吧？",
    howToGet: "站内音乐累计播放超过 30 分钟。",
    rarity: "rare",
    accent: "#7e9bd8",
  },
  {
    id: "reader",
    name: "Reader...?",
    label: "'Reader...?'",
    description: "一本摊开的书。\n“我愿你常怀热爱。”",
    howToGet: "站内博客文章累计阅读超过 30 分钟。",
    rarity: "rare",
    accent: "#8ab4a0",
  },
]

export const COLLECTIBLE_MAP: Record<CollectibleId, CollectibleMeta> =
  Object.fromEntries(
    COLLECTIBLE_LIST.map((item) => [item.id, item])
  ) as Record<CollectibleId, CollectibleMeta>

export function isCollectibleId(value: string): value is CollectibleId {
  return value in COLLECTIBLE_MAP
}
