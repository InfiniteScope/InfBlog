import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import * as mm from "music-metadata"

import { MUSIC_CATEGORIES } from "@/lib/music-categories"

const MUSIC_DIR = path.join(process.cwd(), "public", "music")
const COVER_DIR = path.join(MUSIC_DIR, "covers")

const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".flac",
  ".wav",
  ".ogg",
  ".m4a",
  ".aac",
  ".webm",
  ".wma",
  ".m4a",
])

/** Signature track shown first in the default soothing playlist. */
const SIGNATURE_TRACK = "What We Are"

function safeFileName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60)
}

function formatDuration(seconds?: number) {
  if (!seconds || Number.isNaN(seconds)) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")
  return `${m}:${s}`
}

async function findAudioFiles(dir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(dir)
    return files.filter((file) =>
      AUDIO_EXTENSIONS.has(path.extname(file).toLowerCase())
    )
  } catch {
    return []
  }
}

async function findExistingCover(
  title: string,
  artist: string,
  baseName: string
): Promise<string | undefined> {
  const candidates = [
    // Matches the naming convention produced by metadata extraction.
    `${safeFileName(title)}_${safeFileName(artist)}.jpg`,
    `${safeFileName(title)}_${safeFileName(artist)}.png`,
    // Fallback: cover named after the audio file basename.
    `${safeFileName(baseName)}.jpg`,
    `${safeFileName(baseName)}.png`,
    `${safeFileName(baseName)}.jpeg`,
    `${safeFileName(baseName)}.webp`,
  ]

  for (const name of candidates) {
    try {
      await fs.access(path.join(COVER_DIR, name))
      return `/music/covers/${name}`
    } catch {
      // candidate not found, try next
    }
  }
  return undefined
}

export async function GET() {
  try {
    await fs.mkdir(COVER_DIR, { recursive: true })

    const tracks = await Promise.all(
      MUSIC_CATEGORIES.map(async (category) => {
        const categoryDir = path.join(MUSIC_DIR, category.dir)
        await fs.mkdir(categoryDir, { recursive: true })
        const audioFiles = await findAudioFiles(categoryDir)

        // Pin the signature track first so first-time visitors hear
        // "What We Are" right away in the default soothing playlist.
        audioFiles.sort((a, b) => {
          const aIsSignature = a.includes(SIGNATURE_TRACK)
          const bIsSignature = b.includes(SIGNATURE_TRACK)
          if (aIsSignature && !bIsSignature) return -1
          if (!aIsSignature && bIsSignature) return 1
          return a.localeCompare(b, "zh-CN")
        })

        return Promise.all(
          audioFiles.map(async (file) => {
            const filePath = path.join(categoryDir, file)
            const baseName = path.basename(file, path.extname(file))
            const metadata = await mm.parseFile(filePath)
            const common = metadata.common
            const duration = metadata.format.duration

            const title = common.title || baseName
            const artist = common.artist || "未知艺术家"

            let coverUrl = await findExistingCover(title, artist, baseName)

            if (!coverUrl && common.picture && common.picture.length > 0) {
              const picture = common.picture[0]
              const ext =
                picture.format?.toLowerCase().includes("png") ? "png" : "jpg"
              const coverName = `${safeFileName(title)}_${safeFileName(
                artist === "未知艺术家" ? "unknown" : artist
              )}.${ext}`
              const coverPath = path.join(COVER_DIR, coverName)
              try {
                await fs.writeFile(coverPath, picture.data)
                coverUrl = `/music/covers/${coverName}`
              } catch {
                // ignore cover write failure
              }
            }

            return {
              id: `${category.id}-${safeFileName(baseName)}`,
              title,
              artist,
              album: common.album || undefined,
              category: category.id,
              duration: formatDuration(duration),
              durationSeconds: duration ? Math.round(duration) : 0,
              src: `/music/${category.dir}/${file}`,
              cover: coverUrl,
            }
          })
        )
      })
    )

    return NextResponse.json({ tracks: tracks.flat().filter(Boolean) })
  } catch (error) {
    console.error("Failed to scan music library:", error)
    return NextResponse.json(
      { error: "Failed to scan music library" },
      { status: 500 }
    )
  }
}
