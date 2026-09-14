import { svgEl, setAttrs, measureText, CANVAS_FONT_STACK } from '../dom.js'
import { NODE_COLORS, EDGE_COLORS, NOTE_COLORS, NOTE_SIZES, EDGE_HIT_WIDTH, EDGE_STROKE, ARROW_LEN } from '../palette.js'
import { nodeMetrics, nodeCaptionOffset, nodeBBox, edgeGeom, quadPath, autoBendFor } from '../geometry.js'

export class Renderer {
  constructor(store, viewport, selection) {
    this.store = store
    this.viewport = viewport
    this.selection = selection
    this.nodeEls = new Map()
    this.edgeEls = new Map()
    this.noteEls = new Map()
    this.adj = new Map()
    this.buildMarkers()
    this.overlayEls = {}
    viewport.content.innerHTML = ''
  }

  buildMarkers() {
    for (const key in EDGE_COLORS) {
      const marker = svgEl('marker', {
        id: `arr-${key}`,
        viewBox: '0 0 10 10',
        refX: 9,
        refY: 5,
        markerWidth: ARROW_LEN,
        markerHeight: ARROW_LEN,
        orient: 'auto',
        markerUnits: 'userSpaceOnUse'
      }, this.viewport.defs)
      svgEl('path', { d: 'M0 0 L10 5 L0 10 Z', fill: EDGE_COLORS[key] }, marker)
    }
  }

  render() {
    this.viewport.content.innerHTML = ''
    this.nodeEls.clear()
    this.edgeEls.clear()
    this.noteEls.clear()
    this.adj = new Map()

    const { nodes, edges, notes } = this.store.lists()
    const edgeLayer = svgEl('g', { id: 'edgeLayer' }, this.viewport.content)
    const nodeLayer = svgEl('g', { id: 'nodeLayer' }, this.viewport.content)
    const noteLayer = svgEl('g', { id: 'noteLayer' }, this.viewport.content)

    const siblingMap = new Map()
    for (const e of edges) {
      if (e.from === e.to) continue
      const key = [e.from, e.to].sort().join('~')
      if (!siblingMap.has(key)) siblingMap.set(key, [])
      siblingMap.get(key).push(e)
    }

    for (const e of edges) {
      const elEdge = this.buildEdge(e, e.from === e.to ? null : siblingMap.get([e.from, e.to].sort().join('~')))
      edgeLayer.appendChild(elEdge)
      this.edgeEls.set(e.id, elEdge)
      if (!this.adj.has(e.from)) this.adj.set(e.from, new Set())
      if (!this.adj.has(e.to)) this.adj.set(e.to, new Set())
      this.adj.get(e.from).add(e.id)
      this.adj.get(e.to).add(e.id)
    }
    for (const n of nodes) {
      const elNode = this.buildNode(n)
      nodeLayer.appendChild(elNode)
      this.nodeEls.set(n.id, elNode)
    }
    for (const t of notes) {
      const elNote = this.buildNote(t)
      noteLayer.appendChild(elNote)
      this.noteEls.set(t.id, elNote)
    }
    this.syncSelection()
  }

  buildNode(node) {
    const m = nodeMetrics(node)
    const g = svgEl('g', {
      class: 'node',
      'data-id': node.id,
      'data-type': 'node',
      transform: `translate(${node.x} ${node.y})`
    })
    const palette = NODE_COLORS[node.color] || NODE_COLORS.slate
    if (m.kind === 'circle') {
      svgEl('circle', {
        class: 'shape', cx: 0, cy: 0, r: m.r,
        fill: palette.fill, stroke: palette.stroke,
        'stroke-width': 2, filter: 'url(#softShadow)'
      }, g)
    } else {
      svgEl('rect', {
        class: 'shape', x: -m.w / 2, y: -m.h / 2, width: m.w, height: m.h, rx: m.rx,
        fill: palette.fill, stroke: palette.stroke,
        'stroke-width': 2, filter: 'url(#softShadow)'
      }, g)
    }
    svgEl('text', {
      class: 'node-label',
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-family': CANVAS_FONT_STACK,
      'font-size': m.fontSize,
      'font-weight': 600,
      fill: palette.label,
      'pointer-events': 'none'
    }, g).textContent = node.label || ''
    if (node.note) {
      svgEl('text', {
        class: 'node-caption',
        y: nodeCaptionOffset(node),
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'font-family': CANVAS_FONT_STACK,
        'font-size': 12,
        'font-weight': 500,
        fill: '#64748B',
        stroke: '#F6F8FB',
        'stroke-width': 3.5,
        'paint-order': 'stroke',
        'stroke-linejoin': 'round',
        'pointer-events': 'none'
      }, g).textContent = node.note
    }
    return g
  }

  edgeBend(edge) {
    if (edge.from === edge.to) return edge.bendManual ? edge.bend : 0
    if (edge.bendManual) return edge.bend
    const siblings = this.store.edgeSiblings(edge)
    return autoBendFor(edge, siblings.length > 1 ? siblings : null)
  }

  buildEdge(edge) {
    const a = this.store.doc.nodes[edge.from]
    const b = this.store.doc.nodes[edge.to]
    const g = svgEl('g', {
      class: 'edge',
      'data-id': edge.id,
      'data-type': 'edge'
    })
    if (!a || !b) return g
    const geom = edgeGeom(a, b, edge, this.edgeBend(edge))
    const d = quadPath(geom.p1, geom.cp, geom.p2)
    const color = EDGE_COLORS[edge.color] || EDGE_COLORS.slate
    svgEl('path', {
      class: 'edge-body',
      d,
      fill: 'none',
      stroke: color,
      'stroke-width': EDGE_STROKE,
      'stroke-linecap': 'round',
      ...(edge.dashed ? { 'stroke-dasharray': '7 5' } : {}),
      ...(edge.directed ? { 'marker-end': `url(#arr-${edge.color})` } : {})
    }, g)
    svgEl('path', {
      class: 'edge-hit',
      d,
      fill: 'none',
      stroke: '#000',
      'stroke-opacity': 0,
      'stroke-width': EDGE_HIT_WIDTH,
      'pointer-events': 'stroke',
      'data-part': 'hit'
    }, g)
    if (edge.label) {
      svgEl('text', {
        class: 'edge-label',
        'data-part': 'label',
        x: geom.label.x + (edge.labelDx || 0),
        y: geom.label.y + (edge.labelDy || 0),
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'font-family': CANVAS_FONT_STACK,
        'font-size': 12.5,
        'font-weight': 600,
        fill: '#334155',
        stroke: '#FFFFFF',
        'stroke-width': 4.5,
        'paint-order': 'stroke',
        'stroke-linejoin': 'round'
      }, g).textContent = edge.label
    }
    return g
  }

  buildNote(note) {
    const g = svgEl('g', {
      class: 'note',
      'data-id': note.id,
      'data-type': 'note',
      transform: `translate(${note.x} ${note.y})`
    })
    const fontSize = NOTE_SIZES[note.size] || NOTE_SIZES.m
    const lines = String(note.text || '').split('\n')
    const lineHeight = fontSize * 1.5
    let maxW = 0
    for (const line of lines) {
      maxW = Math.max(maxW, measureText(line, fontSize, 400))
    }
    svgEl('rect', {
      class: 'note-hit',
      x: -7, y: -fontSize * 0.9,
      width: Math.max(maxW + 14, 24), height: lines.length * lineHeight + fontSize * 0.4,
      fill: '#000', 'fill-opacity': 0,
      'pointer-events': 'all',
      'data-part': 'hit'
    }, g)
    const text = svgEl('text', {
      class: 'note-text',
      'data-part': 'label',
      'font-family': CANVAS_FONT_STACK,
      'font-size': fontSize,
      'font-weight': 500,
      fill: NOTE_COLORS[note.color] || NOTE_COLORS.slate,
      stroke: '#F6F8FB',
      'stroke-width': 3.5,
      'paint-order': 'stroke',
      'stroke-linejoin': 'round',
      'pointer-events': 'none'
    }, g)
    lines.forEach((line, i) => {
      const tspan = svgEl('tspan', { x: 0, y: i * lineHeight }, text)
      tspan.textContent = line
    })
    return g
  }

  refreshNode(id) {
    const node = this.store.doc.nodes[id]
    const old = this.nodeEls.get(id)
    if (!node || !old) return
    const fresh = this.buildNode(node)
    old.replaceWith(fresh)
    this.nodeEls.set(id, fresh)
    const edgeIds = this.adj.get(id)
    if (edgeIds) for (const eid of edgeIds) this.refreshEdge(eid)
  }

  refreshEdge(id) {
    const edge = this.store.doc.edges[id]
    const old = this.edgeEls.get(id)
    if (!edge || !old) return
    const fresh = this.buildEdge(edge)
    old.replaceWith(fresh)
    this.edgeEls.set(id, fresh)
  }

  refreshNote(id) {
    const note = this.store.doc.notes[id]
    const old = this.noteEls.get(id)
    if (!note || !old) return
    const fresh = this.buildNote(note)
    old.replaceWith(fresh)
    this.noteEls.set(id, fresh)
  }

  setNodePosition(id, x, y) {
    const elNode = this.nodeEls.get(id)
    if (elNode) elNode.setAttribute('transform', `translate(${x} ${y})`)
  }

  setNotePosition(id, x, y) {
    const elNote = this.noteEls.get(id)
    if (elNote) elNote.setAttribute('transform', `translate(${x} ${y})`)
  }

  contentBBox() {
    const bbox = this.viewport.content.getBBox()
    if (!bbox.width && !bbox.height) return null
    return { x: bbox.x, y: bbox.y, w: bbox.width, h: bbox.height }
  }

  syncSelection() {
    const overlay = this.viewport.overlay
    overlay.innerHTML = ''
    const sel = this.selection
    for (const id of sel.nodes) {
      const node = this.store.doc.nodes[id]
      if (!node) continue
      const m = nodeMetrics(node)
      const common = {
        class: 'sel-ring animated',
        fill: 'none', stroke: '#2563EB', 'stroke-width': 1.6,
        'stroke-dasharray': '5 4', 'pointer-events': 'none'
      }
      if (m.kind === 'circle') {
        svgEl('circle', { ...common, cx: node.x, cy: node.y, r: m.r + 6 }, overlay)
      } else {
        svgEl('rect', {
          ...common, x: node.x - m.w / 2 - 6, y: node.y - m.h / 2 - 6,
          width: m.w + 12, height: m.h + 12, rx: m.rx + 4
        }, overlay)
      }
    }
    for (const id of sel.edges) {
      const edge = this.store.doc.edges[id]
      if (!edge) continue
      const elEdge = this.edgeEls.get(id)
      const body = elEdge && elEdge.querySelector('.edge-body')
      if (body) {
        svgEl('path', {
          d: body.getAttribute('d'), fill: 'none', stroke: '#2563EB',
          'stroke-width': 6, 'stroke-opacity': 0.28, 'pointer-events': 'none'
        }, overlay)
      }
    }
    for (const id of sel.notes) {
      const elNote = this.noteEls.get(id)
      const hit = elNote && elNote.querySelector('.note-hit')
      if (hit) {
        svgEl('rect', {
          x: +hit.getAttribute('x'), y: +hit.getAttribute('y'),
          width: +hit.getAttribute('width'), height: +hit.getAttribute('height'),
          transform: elNote.getAttribute('transform'),
          fill: 'none', stroke: '#2563EB', 'stroke-width': 1.4,
          'stroke-dasharray': '5 4', 'pointer-events': 'none'
        }, overlay)
      }
    }
    if (this.pendingNodeId && this.store.doc.nodes[this.pendingNodeId]) {
      const node = this.store.doc.nodes[this.pendingNodeId]
      const m = nodeMetrics(node)
      const common = {
        class: 'sel-ring animated',
        fill: 'none', stroke: '#2563EB', 'stroke-width': 2,
        'stroke-dasharray': '5 4', 'pointer-events': 'none', opacity: 0.85
      }
      if (m.kind === 'circle') {
        svgEl('circle', { ...common, cx: node.x, cy: node.y, r: m.r + 8 }, overlay)
      } else {
        svgEl('rect', {
          ...common, x: node.x - m.w / 2 - 8, y: node.y - m.h / 2 - 8,
          width: m.w + 16, height: m.h + 16, rx: m.rx + 5
        }, overlay)
      }
    }
  }

  setPendingNode(id) {
    this.pendingNodeId = id
    this.syncSelection()
  }

  showGhostNode(nodeLike, pt) {
    this.hideGhostNode()
    const palette = NODE_COLORS[nodeLike.color] || NODE_COLORS.slate
    const m = nodeMetrics({ ...nodeLike, label: '' })
    let shapeEl
    if (m.kind === 'circle') {
      shapeEl = svgEl('circle', { cx: pt.x, cy: pt.y, r: m.r })
    } else {
      shapeEl = svgEl('rect', {
        x: pt.x - m.w / 2, y: pt.y - m.h / 2, width: m.w, height: m.h, rx: m.rx
      })
    }
    setAttrs(shapeEl, {
      fill: palette.fill, stroke: palette.stroke, 'stroke-width': 1.6,
      'stroke-dasharray': '5 4', opacity: 0.85, 'pointer-events': 'none'
    })
    this.viewport.overlay.appendChild(shapeEl)
    this.ghostEl = shapeEl
  }

  hideGhostNode() {
    if (this.ghostEl) {
      this.ghostEl.remove()
      this.ghostEl = null
    }
  }

  showEdgePreview(p1, p2) {
    this.hideEdgePreview()
    const g = svgEl('g', { 'pointer-events': 'none' })
    svgEl('path', {
      d: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`,
      stroke: '#2563EB', 'stroke-width': 2, 'stroke-dasharray': '6 5',
      fill: 'none', opacity: 0.9
    }, g)
    svgEl('circle', { cx: p2.x, cy: p2.y, r: 3.5, fill: '#2563EB' }, g)
    this.viewport.overlay.appendChild(g)
    this.previewEl = g
  }

  hideEdgePreview() {
    if (this.previewEl) {
      this.previewEl.remove()
      this.previewEl = null
    }
  }

  showMarquee(rect) {
    this.hideMarquee()
    if (!rect) return
    this.marqueeEl = svgEl('rect', {
      x: rect.x, y: rect.y, width: rect.w, height: rect.h,
      fill: 'rgba(37,99,235,.08)', stroke: '#2563EB',
      'stroke-width': 1.2, 'stroke-dasharray': '4 3', 'pointer-events': 'none'
    })
    this.viewport.overlay.appendChild(this.marqueeEl)
  }

  hideMarquee() {
    if (this.marqueeEl) {
      this.marqueeEl.remove()
      this.marqueeEl = null
    }
  }
}
