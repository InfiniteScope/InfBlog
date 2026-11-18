import { promises as fs } from "node:fs"
import path from "node:path"
import * as mm from "music-metadata"

export interface StageBgmTrack {
  title: string
  artist: string
  src: string
  durationSeconds: number
}

const MUSIC_ROOT = path.join(process.cwd(), "public", "music")
const AUDIO_EXT_PRIORITY = [".mp3", ".m4a", ".aac", ".ogg", ".opus", ".webm", ".wav", ".flac"]
const AUDIO_EXTENSIONS = new Set(AUDIO_EXT_PRIORITY)

interface CandidateFile {
  fullPath: string
  relSegments: string[]
  baseName: string
  ext: string
}

async function collectAudioFiles(dir: string, relSegments: string[] = []): Promise<CandidateFile[]> {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const results: CandidateFile[] = []
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue
    if (relSegments.length === 0 && entry.name === "covers") continue

    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const nested = await collectAudioFiles(fullPath, [...relSegments, entry.name])
      results.push(...nested)
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (!AUDIO_EXTENSIONS.has(ext)) continue
      results.push({
        fullPath,
        relSegments: [...relSegments, entry.name],
        baseName: path.basename(entry.name, path.extname(entry.name)),
        ext,
      })
    }
  }
  return results
}

function scoreCandidate(candidate: CandidateFile, needle: string): number {
  const lowerBase = candidate.baseName.toLowerCase()
  const exactScore = lowerBase === needle ? 0 : 100
  const extIdx = AUDIO_EXT_PRIORITY.indexOf(candidate.ext)
  const extScore = extIdx === -1 ? 50 : extIdx
  // 优先独立目录/根目录下的专属曲目，其次才是常规分类目录
  const depthScore = candidate.relSegments.length === 1 ? 0 : 10
  return exactScore + extScore + depthScore
}

/**
 * 在 public/music 下递归检索名称匹配 query 的音频文件（不限于三大歌单子目录）。
 * 优先匹配精确文件名及浏览器友好格式（mp3/m4a/ogg 优于 flac）。
 */
export async function findMusicByQuery(query: string): Promise<StageBgmTrack | null> {
  const needle = query.trim().toLowerCase()
  if (!needle) return null

  const candidates = (await collectAudioFiles(MUSIC_ROOT)).filter((item) =>
    item.baseName.toLowerCase().includes(needle)
  )
  if (candidates.length === 0) return null

  candidates.sort((a, b) => scoreCandidate(a, needle) - scoreCandidate(b, needle))
  const chosen = candidates[0]

  let title = chosen.baseName
  let artist = "STARSET"
  let durationSeconds = 0

  try {
    const metadata = await mm.parseFile(chosen.fullPath, { skipCovers: true })
    if (metadata.common.title) title = metadata.common.title
    if (metadata.common.artist) artist = metadata.common.artist
    if (metadata.format.duration) {
      durationSeconds = Math.round(metadata.format.duration)
    }
  } catch {
    // 元数据读取失败时回退到文件名，不阻塞页面渲染
  }

  const encodedPath = chosen.relSegments.map((seg) => encodeURIComponent(seg)).join("/")
  return {
    title,
    artist,
    src: `/music/${encodedPath}`,
    durationSeconds,
  }
}
