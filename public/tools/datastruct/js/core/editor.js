import { measureText, CANVAS_FONT_STACK } from '../dom.js'
import { nodeMetrics, edgeGeom } from '../geometry.js'
import { NOTE_SIZES } from '../palette.js'

export class Editor {
  constructor(store, viewport, commands, selection) {
    this.store = store
    this.viewport = viewport
    this.commands = commands
    this.selection = selection
    this.layer = document.getElementById('editorLayer')
    this.active = null
    this.commitFn = null
    this.cancelFn = null
    this.reposition = this.reposition.bind(this)
  }

  isOpen() {
    return !!this.active
  }

  editNodeLabel(nodeId) {
    const node = this.store.doc.nodes[nodeId]
    if (!node) return
    this.commit()
    const m = nodeMetrics(node)
    const k = this.viewport.k
    const input = document.createElement('input')
    input.className = 'label-input'
    input.value = node.label
    input.placeholder = '值'
    input.style.left = '0px'
    input.style.top = '0px'
    input.style.width = `${Math.max(64, (m.kind === 'circle' ? m.r * 2 + 26 : m.w + 26) * k)}px`
    input.style.height = `${Math.max(28, (m.kind === 'circle' ? m.r * 1.6 : m.h + 8) * k)}px`
    input.style.fontSize = `${m.fontSize * k}px`
    input.style.fontFamily = CANVAS_FONT_STACK
    this.open(input, node.id, { kind: 'node', x: node.x, y: node.y })
  }

  editEdgeLabel(edgeId) {
    const edge = this.store.doc.edges[edgeId]
    if (!edge) return
    this.commit()
    const labelPos = this.edgeLabelPos(edge)
    const k = this.viewport.k
    const input = document.createElement('input')
    input.className = 'label-input'
    input.value = edge.label
    input.placeholder = '权重 / 说明'
    input.style.width = `${Math.max(72, 110 * k)}px`
    input.style.height = `${Math.max(26, 26 * k)}px`
    input.style.fontSize = `${12.5 * k}px`
    input.style.fontFamily = CANVAS_FONT_STACK
    this.open(input, edge.id, { kind: 'edge', x: labelPos.x, y: labelPos.y })
  }

  editNote(noteId, selectAll = false) {
    const note = this.store.doc.notes[noteId]
    if (!note) return
    this.commit()
    const k = this.viewport.k
    const fontSize = NOTE_SIZES[note.size] || NOTE_SIZES.m
    const lines = String(note.text || '').split('\n')
    let maxW = 0
    for (const line of lines) maxW = Math.max(maxW, measureText(line, fontSize, 400))
    const input = document.createElement('textarea')
    input.className = 'note-input'
    input.rows = Math.max(1, lines.length)
    input.value = note.text
    input.style.width = `${Math.max(120, (maxW + 34) * k)}px`
    input.style.fontSize = `${fontSize * k}px`
    input.style.fontFamily = CANVAS_FONT_STACK
    input.style.lineHeight = '1.5'
    this.open(input, note.id, { kind: 'note', x: note.x, y: note.y }, () => {
      input.style.height = 'auto'
      input.style.height = `${input.scrollHeight}px`
    })
    if (selectAll) input.select()
  }

  edgeLabelPos(edge) {
    const elEdge = this.commands.renderer.edgeEls.get(edge.id)
    const labelEl = elEdge && elEdge.querySelector('.edge-label')
    if (labelEl) {
      return { x: +labelEl.getAttribute('x'), y: +labelEl.getAttribute('y') }
    }
    const a = this.store.doc.nodes[edge.from]
    const b = this.store.doc.nodes[edge.to]
    if (!a || !b) return { x: 0, y: 0 }
    const geom = edgeGeom(a, b, edge, this.commands.renderer.edgeBend(edge))
    return { x: geom.label.x + (edge.labelDx || 0), y: geom.label.y + (edge.labelDy || 0) }
  }

  open(input, targetId, meta, onInput = null) {
    this.layer.appendChild(input)
    this.active = { input, targetId, meta, initial: input.value }
    this.reposition()
    this.commitFn = () => {
      const value = input.value
      const initial = this.active ? this.active.initial : null
      this.close()
      if (value !== initial) {
        this.applyValue(targetId, meta.kind, value)
      }
    }
    this.cancelFn = () => {
      this.close()
    }
    input.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.isComposing) return
      if (e.key === 'Escape') {
        e.preventDefault()
        this.cancelFn()
      } else if (e.key === 'Enter' && (meta.kind !== 'note' || e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        this.commitFn()
      }
    })
    input.addEventListener('blur', () => {
      if (this.active && this.active.input === input) this.commitFn()
    })
    input.addEventListener('input', () => {
      onInput && onInput()
      if (meta.kind === 'note') {
        input.style.height = 'auto'
        input.style.height = `${input.scrollHeight}px`
      }
    })
    input.addEventListener('pointerdown', (e) => e.stopPropagation())
    input.addEventListener('dblclick', (e) => e.stopPropagation())
    requestAnimationFrame(() => {
      input.focus()
      input.select()
      if (meta.kind === 'note') {
        input.style.height = 'auto'
        input.style.height = `${input.scrollHeight}px`
      }
    })
  }

  reposition() {
    if (!this.active) return
    const { input, meta } = this.active
    const s = this.viewport.worldToScreen(meta.x, meta.y)
    if (meta.kind === 'note') {
      input.style.left = `${s.x}px`
      input.style.top = `${s.y - 14 * this.viewport.k}px`
    } else {
      input.style.transform = 'translate(-50%, -50%)'
      input.style.left = `${s.x}px`
      input.style.top = `${s.y}px`
    }
  }

  applyValue(targetId, kind, value) {
    const trimmed = kind === 'note' ? value : value.trim()
    if (kind === 'node') this.commands.setProps('nodes', [targetId], { label: trimmed })
    else if (kind === 'edge') this.commands.setProps('edges', [targetId], { label: trimmed })
    else this.commands.setProps('notes', [targetId], { text: value })
  }

  commit() {
    if (!this.active) return
    const fn = this.commitFn
    if (fn) fn()
  }

  cancel() {
    if (!this.active) return
    const fn = this.cancelFn
    if (fn) fn()
  }

  close() {
    if (!this.active) return
    this.active.input.remove()
    this.active = null
    this.commitFn = null
    this.cancelFn = null
  }
}
