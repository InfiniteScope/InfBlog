import { registerStructure } from './registry.js'

export function circularLayout(nodes) {
  if (!nodes.length) return {}
  const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length
  const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length
  const sorted = [...nodes].sort((a, b) =>
    Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx))
  const R = Math.max(150, nodes.length * 26)
  const positions = {}
  sorted.forEach((n, i) => {
    const angle = -Math.PI / 2 + (i / sorted.length) * Math.PI * 2
    positions[n.id] = { x: Math.round(cx + Math.cos(angle) * R), y: Math.round(cy + Math.sin(angle) * R) }
  })
  return positions
}

export function gridTidyLayout(nodes) {
  if (!nodes.length) return {}
  const cols = Math.ceil(Math.sqrt(nodes.length))
  const sorted = [...nodes].sort((a, b) => {
    const ra = Math.round(a.y / 60)
    const rb = Math.round(b.y / 60)
    if (ra !== rb) return ra - rb
    return a.x - b.x
  })
  const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length
  const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length
  const rows = Math.ceil(nodes.length / cols)
  const x0 = cx - ((cols - 1) * 140) / 2
  const y0 = cy - ((rows - 1) * 120) / 2
  const positions = {}
  sorted.forEach((n, i) => {
    positions[n.id] = { x: Math.round(x0 + (i % cols) * 140), y: Math.round(y0 + Math.floor(i / cols) * 120) }
  })
  return positions
}

const graphActions = [
  { id: 'circular', label: '环形排布', desc: '均匀分布到圆周', run: ({ layout }) => layout(circularLayout) },
  { id: 'grid', label: '网格排布', desc: '按行列对齐', run: ({ layout }) => layout(gridTidyLayout) }
]

registerStructure({
  id: 'graph',
  label: '无向图',
  icon: 'graphMode',
  edgeDefaults: { directed: false },
  actions: graphActions
})

registerStructure({
  id: 'digraph',
  label: '有向图',
  icon: 'digraphMode',
  edgeDefaults: { directed: true },
  actions: graphActions
})
