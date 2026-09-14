export function createDoc(meta = {}) {
  return {
    meta: {
      title: '未命名图示',
      mode: 'graph',
      ...meta
    },
    nodes: {},
    edges: {},
    notes: {}
  }
}

export function normalizeDoc(raw) {
  const doc = createDoc()
  if (!raw || typeof raw !== 'object') return doc
  if (raw.meta && typeof raw.meta === 'object') {
    doc.meta = { ...doc.meta, ...raw.meta }
  }
  for (const key of ['nodes', 'edges', 'notes']) {
    if (raw[key] && typeof raw[key] === 'object') {
      for (const id in raw[key]) {
        const item = raw[key][id]
        if (item && typeof item === 'object') doc[key][id] = { ...item }
      }
    }
  }
  for (const id in doc.nodes) {
    const n = doc.nodes[id]
    n.x = +n.x || 0
    n.y = +n.y || 0
  }
  for (const id in doc.edges) {
    const e = doc.edges[id]
    if (!doc.nodes[e.from] || !doc.nodes[e.to]) delete doc.edges[id]
  }
  return doc
}

export class Store {
  constructor() {
    this.doc = createDoc()
    this.listeners = { change: [], doc: [], selection: [] }
  }

  on(event, fn) {
    this.listeners[event].push(fn)
    return () => {
      this.listeners[event] = this.listeners[event].filter(f => f !== fn)
    }
  }

  emit(event, payload) {
    for (const fn of this.listeners[event]) fn(payload)
  }

  replace(doc, payload = {}) {
    this.doc = doc
    this.emit('doc', { ...payload })
    this.emit('change', { op: 'replace' })
  }

  lists() {
    return {
      nodes: Object.values(this.doc.nodes),
      edges: Object.values(this.doc.edges),
      notes: Object.values(this.doc.notes)
    }
  }

  isEmpty() {
    const { nodes, edges, notes } = this.doc
    return Object.keys(nodes).length === 0
      && Object.keys(edges).length === 0
      && Object.keys(notes).length === 0
  }

  addNode(patch = {}) {
    const id = patch.id || 'n_' + Math.random().toString(36).slice(2, 10)
    const node = {
      id, x: 0, y: 0, shape: 'circle', color: 'slate', size: 'm', label: '', note: '',
      ...patch
    }
    this.doc.nodes[id] = node
    this.emit('change', { op: 'addNode', id })
    return node
  }

  updateNode(id, patch, opts = {}) {
    const node = this.doc.nodes[id]
    if (!node) return null
    Object.assign(node, patch)
    if (!opts.silent) this.emit('change', { op: 'updateNode', id })
    return node
  }

  removeNodes(ids) {
    const removedEdges = []
    const idSet = new Set(ids)
    for (const id of idSet) delete this.doc.nodes[id]
    for (const eid in this.doc.edges) {
      const e = this.doc.edges[eid]
      if (idSet.has(e.from) || idSet.has(e.to)) {
        removedEdges.push(e.id)
        delete this.doc.edges[eid]
      }
    }
    this.emit('change', { op: 'removeNodes', ids: [...idSet] })
    return removedEdges
  }

  addEdge(patch = {}) {
    const id = patch.id || 'e_' + Math.random().toString(36).slice(2, 10)
    const edge = {
      id, from: '', to: '', label: '', color: 'slate',
      directed: false, dashed: false, bend: 0, bendManual: false, labelDx: 0, labelDy: 0,
      ...patch
    }
    this.doc.edges[id] = edge
    this.emit('change', { op: 'addEdge', id })
    return edge
  }

  updateEdge(id, patch, opts = {}) {
    const edge = this.doc.edges[id]
    if (!edge) return null
    Object.assign(edge, patch)
    if (!opts.silent) this.emit('change', { op: 'updateEdge', id })
    return edge
  }

  removeEdges(ids) {
    for (const id of ids) delete this.doc.edges[id]
    this.emit('change', { op: 'removeEdges', ids })
  }

  addNote(patch = {}) {
    const id = patch.id || 't_' + Math.random().toString(36).slice(2, 10)
    const note = {
      id, x: 0, y: 0, text: '标注文字', size: 'm', color: 'slate',
      ...patch
    }
    this.doc.notes[id] = note
    this.emit('change', { op: 'addNote', id })
    return note
  }

  updateNote(id, patch, opts = {}) {
    const note = this.doc.notes[id]
    if (!note) return null
    Object.assign(note, patch)
    if (!opts.silent) this.emit('change', { op: 'updateNote', id })
    return note
  }

  removeNotes(ids) {
    for (const id of ids) delete this.doc.notes[id]
    this.emit('change', { op: 'removeNotes', ids })
  }

  setTitle(title) {
    this.doc.meta.title = title
    this.emit('change', { op: 'title' })
  }

  setMode(mode) {
    this.doc.meta.mode = mode
    this.emit('change', { op: 'mode' })
  }

  nextNodeLabel() {
    let max = 0
    for (const id in this.doc.nodes) {
      const n = parseInt(this.doc.nodes[id].label, 10)
      if (!isNaN(n) && n > max) max = n
    }
    return String(max + 1)
  }

  edgeSiblings(edge) {
    const key = [edge.from, edge.to].sort().join('~')
    const out = []
    for (const id in this.doc.edges) {
      const e = this.doc.edges[id]
      if (e.from === e.to) continue
      if ([e.from, e.to].sort().join('~') === key) out.push(e)
    }
    out.sort((a, b) => (a._created || 0) - (b._created || 0))
    return out
  }
}
