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
  /** BGM 轨道元数据（null 表示 /public/music 中尚未检测到 everglow） */
  bgmTrack: StageBgmTrack | null
  bgmPlaying: boolean
  bgmCurrentTime: number
  bgmDuration: number
  bgmMuted: boolean
  /** 浏览器自动播放策略拦截提示（需要一次用户交互唤醒） */
  autoplayBlocked: boolean
  /** 是否由用户手动切回了站点原歌单 */
  yieldedToMain: boolean
  /** 进入文章前，站点原音乐播放器是否正在播放 */
  suspendedMainTrackTitle?: string
  wasMainPlaying: boolean
  /** 局部深空剧场模式（默认开启，仅作用于本文章容器，绝不污染全局 theme） */
  immersiveDark: boolean
  /** 实际舞台是否处于深空暗色调（全局深色 或 局部深空剧场） */
  isDarkStage: boolean
  toggleImmersiveDark: () => void
  toggleBgmPlay: () => void
  seekBgm: (time: number) => void
  toggleBgmMute: () => void
  /** 停止文章伴音并恢复原音乐播放器（若原本在播放则从原进度继续） */
  restoreMainPlaylist: () => void
  /** 从原歌单重新切回文章伴音 Everglow */
  resumeArticleBgm: () => void
  /** 开篇全屏演出序幕 */
  curtainOpen: boolean
  dismissCurtain: () => void
  replayCurtain: () => void
  /** Web Audio 频谱分析器引用（供全屏舞台做音频响应演出） */
  analyserRef: MutableRefObject<AnalyserNode | null>
  /** 文末天线发射脉冲序列号（递增即触发全屏脉冲波） */
  antennaBurstSeq: number
  triggerAntennaBurst: () => void
}

const dummyRef: MutableRefObject<AnalyserNode | null> = { current: null }

const SpaceNoEdenContext = createContext<SpaceNoEdenStageContextValue>({
  active: false,
  scrollProgress: 0,
  chapterIndex: 0,
  chapter: SPACE_NO_EDEN_CHAPTERS[0],
  bgmTrack: null,
  bgmPlaying: false,
  bgmCurrentTime: 0,
  bgmDuration: 0,
  bgmMuted: false,
  autoplayBlocked: false,
  yieldedToMain: false,
  wasMainPlaying: false,
  immersiveDark: true,
  isDarkStage: true,
  toggleImmersiveDark: () => {},
  toggleBgmPlay: () => {},
  seekBgm: () => {},
  toggleBgmMute: () => {},
  restoreMainPlaylist: () => {},
  resumeArticleBgm: () => {},
  curtainOpen: false,
  dismissCurtain: () => {},
  replayCurtain: () => {},
  analyserRef: dummyRef,
  antennaBurstSeq: 0,
  triggerAntennaBurst: () => {},
})

export const SpaceNoEdenContextProvider = SpaceNoEdenContext.Provider

export function useSpaceNoEdenStage() {
  return useContext(SpaceNoEdenContext)
}
