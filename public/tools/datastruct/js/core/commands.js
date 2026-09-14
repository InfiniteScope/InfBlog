import { snapVal, lerp, easeOutCubic, uid } from '../utils.js'
import { NODE_SIZES, DEFAULT_EDGE, DEFAULT_NOTE, DEFAULT_NODE } from '../palette.js'
import { createDoc } from './store.js'
import { nodeOuterRadius } from '../geometry.js'

export class Commands {
  constructor(store, history, persist, renderer, settings, viewport) {
    this.store = store
    this.history = history
    this.persist = persist
    this.renderer = renderer
    this.settings = settings
    this.viewport = viewport
    this.animToken = 0
    store.on('doc', () => this.cancelAnim())
  }

  touch() {
    this.store.emit('change', { op: 'gesture-end' })
  }

  addNodeAt(pt, patch = {}) {
    this.history.checkpoint('addNode')
    const node = this.store.addNode({
      x: pt.x, y: pt.y,
      label: this.store.nextNodeLabel(),
      ...DEFAULT_NODE,
      ...patch
    })
    this.persist.save()
    return node
  }

  addEdgeBetween(from, to, patch = {}) {
    const doc = this.store.doc
    for (const id in doc.edges) {
      const e = doc.edges[id]
      if (e.from === from && e.to === to && !e.label && !e.bendManual) {
        return { edge: e, existed: true }
      }
    }
    this.history.checkpoint('addEdge')
    const edge = this.store.addEdge({ from, to, ...DEFAULT_EDGE, ...patch })
    this.persist.save()
    return { edge, existed: false }
  }

  addNoteAt(pt, patch = {}) {
    this.history.checkpoint('addNote')
    const note = this.store.addNote({ x: pt.x, y: pt.y, ...DEFAULT_NOTE, ...patch })
    this.persist.save()
    return note
  }

  generateCells({ count, dir, index }, nodeDefaults = {}) {
    this.history.checkpoint('generate')
    const sizeKey = nodeDefaults.size || 'm'
    const cell = NODE_SIZES[sizeKey] || NODE_SIZES.m
    const gap = dir === 'vertical' ? 4 : 8
    const start = index === 'none' ? null : parseInt(index, 10)
    const totalW = dir === 'vertical' ? cell.h : count * cell.h + (count - 1) * gap
    const totalH = dir === 'vertical' ? count * cell.h + (count - 1) * gap : cell.h
    let x0, y0
    const bbox = this.renderer.contentBBox()
    if (bbox) {
      x0 = bbox.x + bbox.w + 110
      y0 = bbox.y
    } else {
      const c = this.viewport.screenToWorld(this.viewport.width / 2, this.viewport.height / 2)
      x0 = c.x - totalW / 2
      y0 = c.y - totalH / 2
    }
    x0 = snapVal(x0, this.settings.snapOn)
    y0 = snapVal(y0, this.settings.snapOn)
    const ids = []
    for (let i = 0; i < count; i++) {
      const x = dir === 'vertical'
        ? x0 + cell.h / 2
        : x0 + cell.h / 2 + i * (cell.h + gap)
      const y = dir === 'vertical'
        ? y0 + cell.h / 2 + i * (cell.h + gap)
        : y0 + cell.h / 2
      const node = this.store.addNode({
        x, y, label: '',
        note: start === null ? '' : String(start + i),
        shape: 'rect',
        ...nodeDefaults
      })
      ids.push(node.id)
    }
    this.touch()
    this.persist.save()
    return ids
  }

  beginMove(nodeIds, noteIds) {
    const gesture = this.history.gesture('move')
    const startNodes = new Map()
    const startNotes = new Map()
    for (const id of nodeIds) {
      const n = this.store.doc.nodes[id]
      if (n) startNodes.set(id, { x: n.x, y: n.y })
    }
    for (const id of noteIds) {
      const t = this.store.doc.notes[id]
      if (t) startNotes.set(id, { x: t.x, y: t.y })
    }
    const anchor = startNodes.size
      ? startNodes.values().next().value
      : startNotes.size ? startNotes.values().next().value : null
    return {
      moveTo: (dx, dy) => {
        if (!anchor) return
        let sdx = dx
        let sdy = dy
        if (this.settings.snapOn) {
          sdx = snapVal(anchor.x + dx, true) - anchor.x
          sdy = snapVal(anchor.y + dy, true) - anchor.y
        }
        for (const [id, s] of startNodes) {
          this.store.updateNode(id, { x: s.x + sdx, y: s.y + sdy }, { silent: true })
          this.renderer.setNodePosition(id, s.x + sdx, s.y + sdy)
        }
        for (const [id, s] of startNotes) {
          this.store.updateNote(id, { x: s.x + sdx, y: s.y + sdy }, { silent: true })
          this.renderer.setNotePosition(id, s.x + sdx, s.y + sdy)
        }
        const edgeIds = new Set()
        for (const id of startNodes.keys()) {
          const set = this.renderer.adj.get(id)
          if (set) for (const eid of set) edgeIds.add(eid)
        }
        for (const eid of edgeIds) this.renderer.refreshEdge(eid)
      },
      end: () => {
        gesture.end()
        this.touch()
        this.persist.save()
      }
    }
  }

  nudge(nodeIds, noteIds, dx, dy) {
    this.history.checkpoint('nudge', { coalesceMs: 900 })
    for (const id of nodeIds) {
      const n = this.store.doc.nodes[id]
      if (n) this.store.updateNode(id, { x: n.x + dx, y: n.y + dy })
    }
    for (const id of noteIds) {
      const t = this.store.doc.notes[id]
      if (t) this.store.updateNote(id, { x: t.x + dx, y: t.y + dy })
    }
    this.persist.save()
  }

  beginBend(edgeId) {
    const gesture = this.history.gesture('bend')
    return {
      setBend: (bend) => {
        this.store.updateEdge(edgeId, { bend: Math.round(bend), bendManual: true }, { silent: true })
        this.renderer.refreshEdge(edgeId)
        this.renderer.syncSelection()
      },
      end: () => {
        gesture.end()
        this.touch()
        this.persist.save()
      }
    }
  }

  beginLabelDrag(edgeId) {
    const gesture = this.history.gesture('labelMove')
    const edge = this.store.doc.edges[edgeId]
    const start = { dx: edge ? edge.labelDx || 0 : 0, dy: edge ? edge.labelDy || 0 : 0 }
    return {
      moveTo: (ddx, ddy) => {
        this.store.updateEdge(edgeId, { labelDx: start.dx + ddx, labelDy: start.dy + ddy }, { silent: true })
        this.renderer.refreshEdge(edgeId)
      },
      end: () => {
        gesture.end()
        this.touch()
        this.persist.save()
      }
    }
  }

  setProps(type, ids, patch) {
    this.history.checkpoint('props')
    for (const id of [].concat(ids)) {
      if (type === 'nodes') this.store.updateNode(id, patch)
      else if (type === 'edges') this.store.updateEdge(id, patch)
      else if (type === 'notes') this.store.updateNote(id, patch)
    }
    this.persist.save()
  }

  deleteIds(ids) {
    this.history.checkpoint('delete')
    const removedEdges = this.store.removeNodes(ids.nodes)
    this.store.removeEdges([...ids.edges, ...removedEdges])
    this.store.removeNotes(ids.notes)
    this.persist.save()
  }

  duplicate(ids) {
    this.history.checkpoint('duplicate')
    const doc = this.store.doc
    const map = new Map()
    const newNodes = []
    for (const id of ids.nodes) {
      const n = doc.nodes[id]
      if (!n) continue
      const clone = this.store.addNode({
        ...n,
        id: 'n_' + uid(),
        x: snapVal(n.x + 44, this.settings.snapOn),
        y: snapVal(n.y + 44, this.settings.snapOn)
      })
      map.set(id, clone.id)
      newNodes.push(clone.id)
    }
    const newEdges = []
    for (const id of ids.edges) {
      const e = doc.edges[id]
      if (!e) continue
      if (!map.has(e.from) || !map.has(e.to)) continue
      const clone = this.store.addEdge({ ...e, id: 'e_' + uid(), from: map.get(e.from), to: map.get(e.to) })
      newEdges.push(clone.id)
    }
    const newNotes = []
    for (const id of ids.notes) {
      const t = doc.notes[id]
      if (!t) continue
      const clone = this.store.addNote({ ...t, id: 't_' + uid(), x: t.x + 44, y: t.y + 44 })
      newNotes.push(clone.id)
    }
    this.persist.save()
    return { nodes: newNodes, edges: newEdges, notes: newNotes }
  }

  alignNodes(nodeIds, kind) {
    const nodes = nodeIds.map(id => this.store.doc.nodes[id]).filter(Boolean)
    if (nodes.length < 2) return
    this.history.checkpoint('align')
    const xs = nodes.map(n => n.x)
    const ys = nodes.map(n => n.y)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    const midX = (minX + maxX) / 2
    const midY = (minY + maxY) / 2
    for (const n of nodes) {
      let { x, y } = n
      if (kind === 'left') x = minX
      else if (kind === 'hcenter') x = midX
      else if (kind === 'right') x = maxX
      else if (kind === 'top') y = minY
      else if (kind === 'vcenter') y = midY
      else if (kind === 'bottom') y = maxY
      this.store.updateNode(n.id, { x: snapVal(x, this.settings.snapOn), y: snapVal(y, this.settings.snapOn) })
    }
    this.persist.save()
  }

  distributeNodes(nodeIds, axis) {
    const nodes = nodeIds.map(id => this.store.doc.nodes[id]).filter(Boolean)
    if (nodes.length < 3) return
    this.history.checkpoint('distribute')
    const sorted = [...nodes].sort((a, b) => a[axis] - b[axis])
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const span = last[axis] - first[axis]
    const step = span / (sorted.length - 1)
    sorted.forEach((n, i) => {
      const patch = axis === 'x'
        ? { x: snapVal(first.x + step * i, this.settings.snapOn) }
        : { y: snapVal(first.y + step * i, this.settings.snapOn) }
      this.store.updateNode(n.id, patch)
    })
    this.persist.save()
  }

  applyLayout(positions, { animate = true } = {}) {
    const ids = Object.keys(positions).filter(id => this.store.doc.nodes[id])
    if (!ids.length) return
    this.history.checkpoint('layout')
    const from = new Map()
    for (const id of ids) {
      const n = this.store.doc.nodes[id]
      from.set(id, { x: n.x, y: n.y })
    }
    const applyFinal = () => {
      for (const id of ids) this.store.updateNode(id, positions[id], { silent: true })
      this.touch()
      this.persist.save()
    }
    if (!animate) {
      applyFinal()
      return
    }
    const token = ++this.animToken
    const t0 = performance.now()
    const duration = 280
    const edgeIds = new Set()
    for (const id of ids) {
      const set = this.renderer.adj.get(id)
      if (set) for (const eid of set) edgeIds.add(eid)
    }
    const step = (now) => {
      if (token !== this.animToken) return
      const t = Math.min(1, (now - t0) / duration)
      const p = easeOutCubic(t)
      for (const id of ids) {
        const s = from.get(id)
        const e = positions[id]
        const x = lerp(s.x, e.x, p)
        const y = lerp(s.y, e.y, p)
        this.store.doc.nodes[id].x = x
        this.store.doc.nodes[id].y = y
        this.renderer.setNodePosition(id, x, y)
      }
      for (const eid of edgeIds) this.renderer.refreshEdge(eid)
      if (t < 1) {
        requestAnimationFrame(step)
      } else {
        for (const id of ids) this.store.updateNode(id, positions[id], { silent: true })
        this.touch()
        this.persist.save()
      }
    }
    requestAnimationFrame(step)
  }

  cancelAnim() {
    this.animToken++
  }

  clearAll() {
    this.history.checkpoint('clear')
    this.store.replace(createDoc(this.store.doc.meta ? { title: this.store.doc.meta.title, mode: this.store.doc.meta.mode } : {}))
    this.persist.save()
  }

  contentRadiusBounds(nodeIds) {
    let max = 0
    for (const id of nodeIds) {
      const n = this.store.doc.nodes[id]
      if (n) max = Math.max(max, nodeOuterRadius(n))
    }
    return max
  }
}
