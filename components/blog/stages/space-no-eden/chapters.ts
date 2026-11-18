export interface ChapterTelemetry {
  index: number
  code: string
  headingId: string
  title: string
  era: string
  tag: string
  distance: string
  note: string
  /** RGB triad for ambient glow */
  glowRgb: string
}

export const SPACE_NO_EDEN_CHAPTERS: ChapterTelemetry[] = [
  {
    index: 0,
    code: "CH.01",
    headingId: "天堂替代物",
    title: "天堂替代物",
    era: "1967 · LONDON",
    tag: "SYD BARRETT · DRONE & LSD",
    distance: "0.0026 AU",
    note: "冷战太空竞赛与迷幻地下室的回声延迟：当旧世界令感官窒息，太空被投射为无染的圣所。",
    glowRgb: "99, 102, 241",
  },
  {
    index: 1,
    code: "CH.02",
    headingId: "信使不承诺抵达",
    title: "信使不承诺抵达",
    era: "2047 · OPHIUCHUS",
    tag: "STARSET · TRANSMISSIONS / SILOS",
    distance: "470 LY",
    note: "来自蛇夫座的警告：现有规则必将随火箭一同升空，作为天堂替代物的太空已然破产。",
    glowRgb: "6, 182, 212",
  },
  {
    index: 2,
    code: "CH.03",
    headingId: "脆弱的远视主义",
    title: "脆弱的远视主义",
    era: "SILO_MATRIX",
    tag: "PERFECT MACHINE · OVERVIEW EFFECT",
    distance: "1.00 AU",
    note: "望远镜捕获百千年前的星光，却看不清支架下正在塌陷的地面与被各自筒仓隔绝的当下。",
    glowRgb: "56, 189, 248",
  },
  {
    index: 3,
    code: "CH.04",
    headingId: "理想纲领",
    title: "理想纲领",
    era: "1967 / 1989",
    tag: "OUTER SPACE TREATY · GNU GPL",
    distance: "GEO_ORBIT",
    note: "理想化的条约与协议往往诞生在利益尚未饱和之际；当技术越过界线，纲领便开始磨损。",
    glowRgb: "14, 165, 233",
  },
  {
    index: 4,
    code: "CH.05",
    headingId: "直到寂静收走意义",
    title: "直到寂静收走意义",
    era: "VOYAGER · SOLARIS",
    tag: "MACRO BLACK-BOX · HOLY GHOST",
    distance: "165+ AU",
    note: "无论是深空、气候还是人工智能巨物，渺小的个体只能放弃附庸幻想，在引力场中拿回部分自主权。",
    glowRgb: "59, 130, 246",
  },
  {
    index: 5,
    code: "CH.06",
    headingId: "暗面与视差",
    title: "暗面与视差",
    era: "ECLIPSE · PARALLAX",
    tag: "KEPLER ELLIPSE · DARK-SIDE ANTENNA",
    distance: "Δθ PARALLAX",
    note: "月球通体皆暗，它从无所谓隐秘净土。站在轨道两端凝视黑暗，以视差丈量自身与世界的纵深。",
    glowRgb: "34, 211, 238",
  },
]

const MORSE_TABLE: Record<string, string> = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  "0": "-----",
  "1": ".----",
  "2": "..---",
  "3": "...--",
  "4": "....-",
  "5": ".....",
  "6": "-....",
  "7": "--...",
  "8": "---..",
  "9": "----.",
}

/**
 * 将中英文短句编码为可见的莫尔斯/二进制脉冲序列（仅作仪式感可视化）。
 * ASCII 字母数字走标准国际莫尔斯码；中文等非 ASCII 字符按 UTF-16 码元高低位映射为短/长脉冲。
 */
export function encodeTelemetryMorse(input: string): string {
  const clean = input.trim() || "STILL TRANSMITTING"
  const tokens: string[] = []
  for (const ch of clean.slice(0, 32)) {
    if (ch === " ") {
      tokens.push("/")
      continue
    }
    const upper = ch.toUpperCase()
    if (MORSE_TABLE[upper]) {
      tokens.push(MORSE_TABLE[upper])
    } else {
      const code = ch.charCodeAt(0)
      // 取 5 位确定性比特序列生成紧凑电码
      let bits = ""
      for (let b = 4; b >= 0; b--) {
        bits += (code >> b) & 1 ? "-" : "."
      }
      tokens.push(bits)
    }
  }
  return tokens
    .join(" ")
    .replaceAll(".", "·")
    .replaceAll("-", "—")
}

export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || Number.isNaN(seconds) || seconds < 0) {
    return "0:00"
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")
  return `${mins}:${secs}`
}
