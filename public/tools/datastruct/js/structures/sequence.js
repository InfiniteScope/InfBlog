import { nodeBBox } from '../geometry.js'

export function sequenceLayout(dir) {
  return (nodes) => {
    if (!nodes.length) return {}
    const sorted = [...nodes].sort((a, b) =>
      dir === 'vertical' ? a.y - b.y : a.x - b.x)
    let cellW = 0
    let cellH = 0
    for (const n of nodes) {
      const b = nodeBBox(n)
      cellW = Math.max(cellW, b.w)
      cellH = Math.max(cellH, b.h)
    }
    const gap = dir === 'vertical' ? 4 : 8
    const totalW = dir === 'vertical' ? cellW : nodes.length * cellW + (nodes.length - 1) * gap
    const totalH = dir === 'vertical' ? nodes.length * cellH + (nodes.length - 1) * gap : cellH
    const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length
    const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length
    const positions = {}
    sorted.forEach((n, i) => {
      const x = dir === 'vertical'
        ? cx
        : cx - totalW / 2 + cellW / 2 + i * (cellW + gap)
      const y = dir === 'vertical'
        ? cy - totalH / 2 + cellH / 2 + i * (cellH + gap)
        : cy
      positions[n.id] = { x: Math.round(x), y: Math.round(y) }
    })
    return positions
  }
}
