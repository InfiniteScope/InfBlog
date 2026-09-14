import { registerStructure } from './registry.js'

const X_GAP = 120
const Y_GAP = 120

export function hierarchyLayout(nodes, edges, rootId) {
  if (!nodes.length) return {}
  const nodeIds = new Set(nodes.map(n => n.id))
  const adj = new Map()
  for (const id of nodeIds) adj.set(id, [])
  for (const e of edges) {
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to) || e.from === e.to) continue
    adj.get(e.from).push(e.to)
    adj.get(e.to).push(e.from)
  }
  const parent = new Map()
  const depth = new Map()
  const components = []

  const bfs = (root) => {
    parent.set(root, null)
    depth.set(root, 0)
    const queue = [root]
    const members = [root]
    while (queue.length) {
      const cur = queue.shift()
      for (const next of adj.get(cur)) {
        if (depth.has(next)) continue
        parent.set(next, cur)
        depth.set(next, depth.get(cur) + 1)
        queue.push(next)
        members.push(next)
      }
    }
    return members
  }

  const indegree = new Map()
  for (const e of edges) {
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to) || e.from === e.to) continue
    indegree.set(e.to, (indegree.get(e.to) || 0) + 1)
  }

  const remaining = new Set(nodeIds)
  let firstComponent = true
  while (remaining.size) {
    let root = null
    if (firstComponent && rootId && nodeIds.has(rootId) && remaining.has(rootId)) {
      root = rootId
    }
    if (!root) {
      const zero = nodes.find(n => remaining.has(n.id) && !indegree.get(n.id))
      root = (zero || nodes.find(n => remaining.has(n.id))).id
    }
    firstComponent = false
    const members = bfs(root)
    for (const m of members) remaining.delete(m)
    components.push(members)
  }

  const childrenOf = (id) => {
    const out = []
    for (const n of nodes) {
      if (parent.get(n.id) === id) out.push(n.id)
    }
    out.sort((a, b) => {
      const na = nodes.find(x => x.id === a)
      const nb = nodes.find(x => x.id === b)
      return na.x - nb.x
    })
    return out
  }

  const positions = {}
  let slot = 0
  const place = (id, offsetX) => {
    const children = childrenOf(id)
    let x
    if (!children.length) {
      x = offsetX + slot * X_GAP
      slot += 1
    } else {
      const childXs = children.map(child => place(child, offsetX))
      x = (Math.min(...childXs) + Math.max(...childXs)) / 2
    }
    positions[id] = { x: Math.round(x), y: Math.round(depth.get(id) * Y_GAP) }
    return x
  }

  let cursorX = 0
  for (const members of components) {
    const root = members.find(m => parent.get(m) === null) || members[0]
    slot = 0
    const rightmost = place(root, cursorX)
    cursorX = rightmost + X_GAP
  }

  const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length
  const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const id of Object.keys(positions)) {
    minX = Math.min(minX, positions[id].x)
    maxX = Math.max(maxX, positions[id].x)
    minY = Math.min(minY, positions[id].y)
    maxY = Math.max(maxY, positions[id].y)
  }
  const dx = cx - (minX + maxX) / 2
  const dy = cy - (minY + maxY) / 2
  for (const id of Object.keys(positions)) {
    positions[id].x = Math.round(positions[id].x + dx)
    positions[id].y = Math.round(positions[id].y + dy)
  }
  return positions
}

registerStructure({
  id: 'tree',
  label: '树',
  actions: [
    {
      id: 'hierarchy',
      label: '层次排布',
      desc: '选中节点可指定根',
      run: ({ layout, rootId }) => layout((nodes, edges) => hierarchyLayout(nodes, edges, rootId))
    }
  ]
})
