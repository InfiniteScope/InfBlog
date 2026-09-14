import { clamp, snapVal, dist, modKey } from '../utils.js'
import { GRID, DEFAULT_NODE, DEFAULT_EDGE, DEFAULT_NOTE } from '../palette.js'
import { edgeGeom, nodeBBox } from '../geometry.js'
import { measureText } from '../dom.js'
import { getStructure } from '../structures/registry.js'

const TOOLS = ['select', 'node', 'edge', 'text', 'hand']

export class Interactions {
  constructor(store, viewport, renderer, commands, selection, editor, ui, settings) {
    Object.assign(this, { store, viewport, renderer, commands, selection, editor, ui, settings })
    this.svg = viewport.svg
    this.tool = 'select'
    this.spaceDown = false
    this.drag = null
    this.pendingEdge = null
    this.lastAdd = { t: 0, x: 0, y: 0 }
    this.bindEvents()
  }

  bindEvents() {
    const svg = this.svg
    svg.addEventListener('pointerdown', (e) => this.onPointerDown(e))
    svg.addEventListener('pointermove', (e) => this.onPointerMove(e))
    svg.addEventListener('pointerup', (e) => this.onPointerUp(e))
    svg.addEventListener('dblclick', (e) => this.onDblClick(e))
    svg.addEventListener('contextmenu', (e) => e.preventDefault())
    svg.addEventListener('wheel', (e) => this.onWheel(e), { passive: false })
    window.addEventListener('keydown', (e) => this.onKeyDown(e))
    window.addEventListener('keyup', (e) => this.onKeyUp(e))
  }

  setTool(tool) {
    if (!TOOLS.includes(tool)) return
    this.cancelPending()
    this.tool = tool
    this.svg.dataset.tool = tool
    this.renderer.hideGhostNode()
    this.renderer.hideEdgePreview()
    this.ui.onToolChanged(tool)
  }

  cancelPending() {
    if (this.pendingEdge) {
      this.pendingEdge = null
      this.renderer.setPendingNode(null)
      this.renderer.hideEdgePreview()
    }
    this.ui.setHintForTool(this.tool)
  }

  hitAtClient(cx, cy) {
    const el = document.elementFromPoint(cx, cy)
    const g = el && el.closest && el.closest('#content [data-id]')
    if (!g) return null
    const partEl = el.closest('[data-part]')
    return {
      id: g.dataset.id,
      type: g.dataset.type,
      part: partEl ? partEl.dataset.part : 'hit'
    }
  }

  hitFromEvent(e) {
    const g = e.target.closest && e.target.closest('#content [data-id]')
    if (!g) return null
    const partEl = e.target.closest('[data-part]')
    return {
      id: g.dataset.id,
      type: g.dataset.type,
      part: partEl ? partEl.dataset.part : 'hit'
    }
  }

  structure() {
    return getStructure(this.store.doc.meta.mode)
  }

  nodeDefaults() {
    return { ...DEFAULT_NODE, ...(this.structure().nodeDefaults || {}) }
  }

  edgeDefaults() {
    return { ...DEFAULT_EDGE, ...(this.structure().edgeDefaults || {}) }
  }

  snapPt(worldPt, e) {
    const on = this.settings.snapOn && !e.altKey
    return { x: snapVal(worldPt.x, on, GRID), y: snapVal(worldPt.y, on, GRID) }
  }

  guardDoubleClick(worldPt) {
    const now = Date.now()
    if (now - this.lastAdd.t < 350 && dist(this.lastAdd.x, this.lastAdd.y, worldPt.x, worldPt.y) < 14) {
      return true
    }
    this.lastAdd = { t: now, x: worldPt.x, y: worldPt.y }
    return false
  }

  onWheel(e) {
    e.preventDefault()
    const p = this.viewport.eventPoint(e)
    const factor = Math.pow(1.0016, -e.deltaY)
    this.viewport.zoomAt(factor, p.x, p.y)
  }

  startPan(e) {
    const p = this.viewport.eventPoint(e)
    this.svg.classList.add('panning-active')
    this.drag = {
      mode: 'pan',
      start: p,
      tx: this.viewport.tx,
      ty: this.viewport.ty
    }
    this.svg.setPointerCapture(e.pointerId)
  }

  onPointerDown(e) {
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) return
    this.editor.commit()
    if (this.drag) return

    if (e.button === 1 || e.button === 2 || this.spaceDown || this.tool === 'hand') {
      e.preventDefault()
      this.startPan(e)
      return
    }

    const hit = this.hitFromEvent(e)
    const screen = this.viewport.eventPoint(e)
    const world = this.viewport.screenToWorld(screen.x, screen.y)

    if (this.tool === 'select') {
      if (!hit) {
        this.drag = {
          mode: 'marquee',
          startWorld: world,
          additive: e.shiftKey,
          baseNodes: e.shiftKey ? new Set(this.selection.nodes) : new Set(),
          baseNotes: e.shiftKey ? new Set(this.selection.notes) : new Set()
        }
        this.svg.setPointerCapture(e.pointerId)
        if (!e.shiftKey) this.selection.clear()
        return
      }
      if (hit.type === 'node') {
        const already = this.selection.nodes.has(hit.id)
        if (e.shiftKey) {
          this.selection.toggle('nodes', hit.id)
          if (!this.selection.nodes.has(hit.id)) return
        } else if (!already) {
          this.selection.selectOnly('nodes', hit.id)
        }
        this.beginNodeDrag(e)
        return
      }
      if (hit.type === 'note') {
        const already = this.selection.notes.has(hit.id)
        if (e.shiftKey) {
          this.selection.toggle('notes', hit.id)
          if (!this.selection.notes.has(hit.id)) return
        } else if (!already) {
          this.selection.selectOnly('notes', hit.id)
        }
        this.drag = {
          mode: 'move',
          handle: this.commands.beginMove([...this.selection.nodes], [...this.selection.notes]),
          startWorld: world
        }
        this.svg.setPointerCapture(e.pointerId)
        return
      }
      if (hit.type === 'edge') {
        if (!this.selection.edges.has(hit.id)) this.selection.selectOnly('edges', hit.id)
        const edge = this.store.doc.edges[hit.id]
        if (!edge) return
        if (hit.part === 'label') {
          this.drag = {
            mode: 'label',
            handle: this.commands.beginLabelDrag(hit.id),
            startWorld: world
          }
        } else if (edge.from !== edge.to) {
          const a = this.store.doc.nodes[edge.from]
          const b = this.store.doc.nodes[edge.to]
          const dx = b.x - a.x, dy = b.y - a.y
          const len = Math.hypot(dx, dy) || 1
          this.drag = {
            mode: 'bend',
            handle: this.commands.beginBend(hit.id),
            mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
            perp: { x: -dy / len, y: dx / len }
          }
        }
        if (this.drag) this.svg.setPointerCapture(e.pointerId)
        return
      }
      return
    }

    if (this.tool === 'node') {
      if (hit && hit.type === 'node') {
        this.drag = {
          mode: 'grow',
          sourceId: hit.id,
          startWorld: world,
          moved: false
        }
        this.svg.setPointerCapture(e.pointerId)
        return
      }
      if (!hit && !this.guardDoubleClick(world)) {
        const pt = this.snapPt(world, e)
        const node = this.commands.addNodeAt(pt, this.nodeDefaults())
        this.selection.selectOnly('nodes', node.id)
      }
      return
    }

    if (this.tool === 'edge') {
      if (hit && hit.type === 'node') {
        this.drag = {
          mode: 'connect',
          downNodeId: hit.id,
          startWorld: world,
          moved: false
        }
        this.svg.setPointerCapture(e.pointerId)
        const geom = this.portPreview(hit.id, world)
        this.renderer.showEdgePreview(geom.p1, world)
      } else {
        this.cancelPending()
      }
      return
    }

    if (this.tool === 'text') {
      if (hit && hit.type === 'note') {
        this.editor.editNote(hit.id)
        return
      }
      if (!hit && !this.guardDoubleClick(world)) {
        const pt = this.snapPt(world, e)
        const note = this.commands.addNoteAt(pt, { ...DEFAULT_NOTE, ...(this.structure().noteDefaults || {}) })
        this.selection.selectOnly('notes', note.id)
        this.editor.editNote(note.id, true)
      }
    }
  }

  beginNodeDrag(e) {
    const s = this.viewport.eventPoint(e)
    this.drag = {
      mode: 'move',
      handle: this.commands.beginMove([...this.selection.nodes], [...this.selection.notes]),
      startWorld: this.viewport.screenToWorld(s.x, s.y)
    }
    this.svg.setPointerCapture(e.pointerId)
  }

  portPreview(nodeId, worldPt) {
    const a = this.store.doc.nodes[nodeId]
    return edgeGeom(a, { id: '_cursor', x: worldPt.x, y: worldPt.y, shape: 'circle', size: 'm' }, {}, 0)
  }

  onPointerMove(e) {
    const screen = this.viewport.eventPoint(e)
    const world = this.viewport.screenToWorld(screen.x, screen.y)

    if (!this.drag) {
      if (this.tool === 'node' && !this.editor.isOpen()) {
        const hit = this.hitFromEvent(e)
        if (!hit) {
          this.renderer.showGhostNode(this.nodeDefaults(), this.snapPt(world, e))
        } else {
          this.renderer.hideGhostNode()
        }
      } else if (this.tool !== 'node') {
        this.renderer.hideGhostNode()
      }
      if (this.pendingEdge && this.tool === 'edge') {
        const geom = this.portPreview(this.pendingEdge, world)
        this.renderer.showEdgePreview(geom.p1, world)
      }
      return
    }

    const d = this.drag
    if (d.mode === 'pan') {
      this.viewport.tx = d.tx + (screen.x - d.start.x)
      this.viewport.ty = d.ty + (screen.y - d.start.y)
      this.viewport.apply()
      return
    }
    if (d.mode === 'move') {
      d.handle.moveTo(world.x - d.startWorld.x, world.y - d.startWorld.y)
      return
    }
    if (d.mode === 'marquee') {
      d.rect = {
        x: Math.min(d.startWorld.x, world.x),
        y: Math.min(d.startWorld.y, world.y),
        w: Math.abs(world.x - d.startWorld.x),
        h: Math.abs(world.y - d.startWorld.y)
      }
      this.renderer.showMarquee(d.rect)
      return
    }
    if (d.mode === 'bend') {
      const bend = (world.x - d.mid.x) * d.perp.x + (world.y - d.mid.y) * d.perp.y
      d.handle.setBend(clamp(bend, -140, 140))
      return
    }
    if (d.mode === 'label') {
      d.handle.moveTo(world.x - d.startWorld.x, world.y - d.startWorld.y)
      return
    }
    if (d.mode === 'grow') {
      if (dist(d.startWorld.x, d.startWorld.y, world.x, world.y) > 8) d.moved = true
      const targetHit = this.hitAtClient(e.clientX, e.clientY)
      if (targetHit && targetHit.type === 'node' && targetHit.id !== d.sourceId) {
        const target = this.store.doc.nodes[targetHit.id]
        const geom = edgeGeom(this.store.doc.nodes[d.sourceId], target, {}, 0)
        this.renderer.showEdgePreview(geom.p1, geom.p2)
        this.renderer.hideGhostNode()
      } else {
        const geom = this.portPreview(d.sourceId, world)
        this.renderer.showEdgePreview(geom.p1, world)
        this.renderer.showGhostNode(this.nodeDefaults(), this.snapPt(world, e))
      }
      return
    }
    if (d.mode === 'connect') {
      if (dist(d.startWorld.x, d.startWorld.y, world.x, world.y) > 8) d.moved = true
      const targetHit = this.hitAtClient(e.clientX, e.clientY)
      const sourceId = this.pendingEdge || d.downNodeId
      if (targetHit && targetHit.type === 'node' && targetHit.id !== sourceId) {
        const target = this.store.doc.nodes[targetHit.id]
        const geom = edgeGeom(this.store.doc.nodes[sourceId], target, {}, 0)
        this.renderer.showEdgePreview(geom.p1, geom.p2)
      } else {
        const geom = this.portPreview(sourceId, world)
        this.renderer.showEdgePreview(geom.p1, world)
      }
    }
  }

  commitEdge(from, to) {
    const { edge, existed } = this.commands.addEdgeBetween(from, to, this.edgeDefaults())
    if (existed) this.ui.toast('已存在相同连线')
    this.pendingEdge = null
    this.renderer.setPendingNode(null)
    this.renderer.hideEdgePreview()
    this.ui.setHintForTool(this.tool)
  }

  onPointerUp(e) {
    const d = this.drag
    if (!d) return
    this.drag = null
    this.svg.classList.remove('panning-active')

    if (d.mode === 'pan') return

    if (d.mode === 'move') {
      d.handle.end()
      return
    }
    if (d.mode === 'bend' || d.mode === 'label') {
      d.handle.end()
      return
    }
    if (d.mode === 'marquee') {
      this.renderer.hideMarquee()
      const r = d.rect
      if (!r || (r.w < 6 / this.viewport.k && r.h < 6 / this.viewport.k)) return
      const selNodes = []
      const selNotes = []
      const { nodes, notes } = this.store.lists()
      for (const n of nodes) {
        const m = this.nodeBounds(n)
        if (m.x < r.x + r.w && m.x + m.w > r.x && m.y < r.y + r.h && m.y + m.h > r.y) selNodes.push(n.id)
      }
      for (const t of notes) {
        const b = this.noteBounds(t)
        if (b.x < r.x + r.w && b.x + b.w > r.x && b.y < r.y + r.h && b.y + b.h > r.y) selNotes.push(t.id)
      }
      this.selection.set('nodes', [...d.baseNodes, ...selNodes])
      this.selection.add('notes', [...d.baseNotes, ...selNotes])
      if (!selNodes.length && !selNotes.length) this.selection.clear()
      return
    }
    if (d.mode === 'grow') {
      this.renderer.hideEdgePreview()
      this.renderer.hideGhostNode()
      if (!d.moved) {
        this.selection.selectOnly('nodes', d.sourceId)
        return
      }
      const screen = this.viewport.eventPoint(e)
      const world = this.viewport.screenToWorld(screen.x, screen.y)
      const targetHit = this.hitAtClient(e.clientX, e.clientY)
      if (targetHit && targetHit.type === 'node' && targetHit.id !== d.sourceId) {
        this.commitEdge(d.sourceId, targetHit.id)
        return
      }
      const pt = this.snapPt(world, e)
      const node = this.commands.addNodeAt(pt, this.nodeDefaults())
      this.commands.addEdgeBetween(d.sourceId, node.id, this.edgeDefaults())
      this.selection.selectOnly('nodes', node.id)
      return
    }
    if (d.mode === 'connect') {
      this.renderer.hideEdgePreview()
      const targetHit = this.hitAtClient(e.clientX, e.clientY)
      const isNode = targetHit && targetHit.type === 'node'
      if (isNode) {
        const downId = d.downNodeId
        const targetId = targetHit.id
        if (this.pendingEdge && downId === this.pendingEdge) {
          this.commitEdge(downId, targetId)
        } else if (this.pendingEdge) {
          this.commitEdge(downId, targetId)
        } else if (targetId !== downId) {
          this.commitEdge(downId, targetId)
        } else {
          this.pendingEdge = targetId
          this.renderer.setPendingNode(targetId)
          this.ui.setHint('已选中起点，点击另一节点完成连线（Esc 取消）')
        }
      } else if (!d.moved) {
        this.cancelPending()
      } else {
        this.renderer.hideEdgePreview()
      }
    }
  }

  nodeBounds(n) {
    return nodeBBox(n)
  }

  noteBounds(t) {
    const fontSize = t.size === 's' ? 14 : t.size === 'l' ? 24 : 18
    const lines = String(t.text || '').split('\n')
    let maxW = 0
    for (const line of lines) maxW = Math.max(maxW, measureText(line, fontSize, 500))
    return { x: t.x, y: t.y - fontSize, w: maxW, h: lines.length * fontSize * 1.5 }
  }

  onDblClick(e) {
    const hit = this.hitFromEvent(e)
    if (hit && hit.type === 'node') {
      this.editor.editNodeLabel(hit.id)
      return
    }
    if (hit && hit.type === 'edge') {
      this.editor.editEdgeLabel(hit.id)
      return
    }
    if (hit && hit.type === 'note') {
      this.editor.editNote(hit.id)
      return
    }
    if (this.tool === 'select') {
      const screen = this.viewport.eventPoint(e)
      const world = this.viewport.screenToWorld(screen.x, screen.y)
      const pt = this.snapPt(world, e)
      const node = this.commands.addNodeAt(pt, this.nodeDefaults())
      this.selection.selectOnly('nodes', node.id)
      this.editor.editNodeLabel(node.id)
    }
  }

  onKeyDown(e) {
    const target = e.target
    if (target && (target.matches && target.matches('input, textarea, select, [contenteditable="true"]'))) return
    if (this.editor.isOpen()) return
    const backdrop = document.getElementById('modalBackdrop')
    if (backdrop && !backdrop.classList.contains('hidden')) return

    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault()
      this.spaceDown = true
      this.svg.classList.add('panning')
      return
    }
    if (modKey(e)) {
      const key = e.key.toLowerCase()
      if (key === 'z') {
        e.preventDefault()
        if (e.shiftKey) this.historyRedo()
        else this.historyUndo()
        return
      }
      if (key === 'y') {
        e.preventDefault()
        this.historyRedo()
        return
      }
      if (key === 'd') {
        e.preventDefault()
        this.duplicateSelection()
        return
      }
      if (key === 'a') {
        e.preventDefault()
        const { nodes, edges, notes } = this.store.lists()
        this.selection.set('nodes', nodes.map(n => n.id))
        this.selection.add('edges', edges.map(x => x.id))
        this.selection.add('notes', notes.map(t => t.id))
        return
      }
      if (key === 's') {
        e.preventDefault()
        this.ui.saveToLibrary()
        return
      }
      if (key === 'o') {
        e.preventDefault()
        this.ui.openLibrary()
        return
      }
      return
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      this.deleteSelection()
      return
    }
    if (e.key === 'Escape') {
      if (this.pendingEdge) this.cancelPending()
      else this.selection.clear()
      return
    }
    if (e.key === 'Enter') {
      this.editSelected()
      return
    }
    if (e.key.startsWith('Arrow')) {
      if (!this.selection.size()) return
      const step = this.settings.snapOn ? GRID : 2
      const mult = e.shiftKey ? 4 : 1
      const dx = e.key === 'ArrowLeft' ? -step * mult : e.key === 'ArrowRight' ? step * mult : 0
      const dy = e.key === 'ArrowUp' ? -step * mult : e.key === 'ArrowDown' ? step * mult : 0
      if (dx || dy) {
        e.preventDefault()
        this.commands.nudge([...this.selection.nodes], [...this.selection.notes], dx, dy)
      }
      return
    }
    const key = e.key.toLowerCase()
    if (key === 'v') this.setTool('select')
    else if (key === 'n') this.setTool('node')
    else if (key === 'e') this.setTool('edge')
    else if (key === 't') this.setTool('text')
    else if (key === 'h') this.setTool('hand')
    else if (key === 'f') this.ui.fitView()
    else if (key === '?' || (e.shiftKey && key === '/')) this.ui.toggleHelp()
    else if (key === '+' || key === '=') this.viewport.setZoom(this.viewport.k * 1.2)
    else if (key === '-') this.viewport.setZoom(this.viewport.k / 1.2)
    else if (key === '0') this.viewport.setZoom(1)
  }

  onKeyUp(e) {
    if (e.code === 'Space') {
      this.spaceDown = false
      this.svg.classList.remove('panning')
    }
  }

  historyUndo() {
    if (this.commands.history.undo()) {
      this.selection.clear()
      this.ui.toast('已撤销')
    }
  }

  historyRedo() {
    if (this.commands.history.redo()) {
      this.selection.clear()
      this.ui.toast('已重做')
    }
  }

  deleteSelection() {
    if (!this.selection.size()) return
    this.commands.deleteIds(this.selection.ids())
    this.selection.clear()
  }

  duplicateSelection() {
    if (!this.selection.size()) return
    const created = this.commands.duplicate(this.selection.ids())
    this.selection.clear(true)
    this.selection.set('nodes', created.nodes)
    this.selection.add('edges', created.edges)
    this.selection.add('notes', created.notes)
    this.ui.toast('已复制所选内容')
  }

  editSelected() {
    const { nodes, edges, notes } = this.selection.ids()
    if (nodes.length === 1) this.editor.editNodeLabel(nodes[0])
    else if (edges.length === 1) this.editor.editEdgeLabel(edges[0])
    else if (notes.length === 1) this.editor.editNote(notes[0])
  }
}
