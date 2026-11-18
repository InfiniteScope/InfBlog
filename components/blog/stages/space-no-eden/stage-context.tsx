"use client"

import { createContext, useContext, type MutableRefObject } from "react"
import type { StageBgmTrack } from "@/lib/music-find"
import { SPACE_NO_EDEN_CHAPTERS, type ChapterTelemetry } from "./chapters"

export interface SpaceNoEdenStageContextValue {
  /** 严格核对过当前 pathname === "/blog/宇宙非伊甸" */
  active: boolean
  /** 0..1 页面阅读滚动进度 */
  scrollProgress: number
  /** 当前所在章节索引 0..5 */
  chapterIndex: number
  chapter: ChapterTelemetry
  /** BGM 轨道元数据 */
  bgmTrack: StageBgmTrack | null
  bgmPlaying: boolean
  /** 浏览器自动播放策略拦截提示（需要一次用户交互唤醒） */
  autoplayBlocked: boolean
  /** 是否由用户手动切回了站点原歌单 */
  yieldedToMain: boolean
  /** 进入文章前站点原播放器信息 */
  suspendedMainTrackTitle?: string
  wasMainPlaying: boolean
  toggleBgmPlay: () => void
  /** 停止文章伴音并切回原音乐播放器 */
  restoreMainPlaylist: () => void
  /** 从原歌单切回文章伴音 Everglow */
  resumeArticleBgm: () => void
  /** Web Audio 频谱分析器引用 */
  analyserRef: MutableRefObject<AnalyserNode | null>
}

const dummyRef: MutableRefObject<AnalyserNode | null> = { current: null }

const SpaceNoEdenContext = createContext<SpaceNoEdenStageContextValue>({
  active: false,
  scrollProgress: 0,
  chapterIndex: 0,
  chapter: SPACE_NO_EDEN_CHAPTERS[0],
  bgmTrack: null,
  bgmPlaying: false,
  autoplayBlocked: false,
  yieldedToMain: false,
  wasMainPlaying: false,
  toggleBgmPlay: () => {},
  restoreMainPlaylist: () => {},
  resumeArticleBgm: () => {},
  analyserRef: dummyRef,
})

export const SpaceNoEdenContextProvider = SpaceNoEdenContext.Provider

export function useSpaceNoEdenStage() {
  return useContext(SpaceNoEdenContext)
}
