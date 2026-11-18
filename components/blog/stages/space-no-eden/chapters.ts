export interface ChapterTelemetry {
  index: number
  code: string
  headingId: string
  title: string
  era: string
  tag: string
  distance: string
}

export const SPACE_NO_EDEN_CHAPTERS: ChapterTelemetry[] = [
  {
    index: 0,
    code: "CH.01",
    headingId: "天堂替代物",
    title: "天堂替代物",
    era: "1967 · LONDON",
    tag: "PARADISE_SUBSTITUTE",
    distance: "0.0026 AU",
  },
  {
    index: 1,
    code: "CH.02",
    headingId: "信使不承诺抵达",
    title: "信使不承诺抵达",
    era: "2047 · OPHIUCHUS",
    tag: "TRANSMISSIONS",
    distance: "470 LY",
  },
  {
    index: 2,
    code: "CH.03",
    headingId: "脆弱的远视主义",
    title: "脆弱的远视主义",
    era: "1.00 AU",
    tag: "SILO_MATRIX",
    distance: "1.00 AU",
  },
  {
    index: 3,
    code: "CH.04",
    headingId: "理想纲领",
    title: "理想纲领",
    era: "1967 / 1989",
    tag: "IDEAL_AXIOMS",
    distance: "GEO_ORBIT",
  },
  {
    index: 4,
    code: "CH.05",
    headingId: "直到寂静收走意义",
    title: "直到寂静收走意义",
    era: "VOYAGER · SOLARIS",
    tag: "MACRO_BLACK_BOX",
    distance: "165+ AU",
  },
  {
    index: 5,
    code: "CH.06",
    headingId: "暗面与视差",
    title: "暗面与视差",
    era: "ECLIPSE · PARALLAX",
    tag: "DARK_SIDE_PARALLAX",
    distance: "Δθ PARALLAX",
  },
]
