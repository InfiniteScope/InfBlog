export class Selection {
  constructor() {
    this.nodes = new Set()
    this.edges = new Set()
    this.notes = new Set()
    this.listeners = []
  }

  onChange(fn) {
    this.listeners.push(fn)
  }

  emit() {
    for (const fn of this.listeners) fn()
  }

  clear(silent = false) {
    if (!this.size()) return
    this.nodes.clear()
    this.edges.clear()
    this.notes.clear()
    if (!silent) this.emit()
  }

  set(type, ids) {
    this.nodes.clear()
    this.edges.clear()
    this.notes.clear()
    for (const id of [].concat(ids)) this[type].add(id)
    this.emit()
  }

  toggle(type, id) {
    if (this[type].has(id)) this[type].delete(id)
    else this[type].add(id)
    this.emit()
  }

  add(type, ids) {
    for (const id of [].concat(ids)) this[type].add(id)
    this.emit()
  }

  selectOnly(type, id) {
    this.set(type, [id])
  }

  has(type, id) {
    return this[type].has(id)
  }

  ids() {
    return {
      nodes: [...this.nodes],
      edges: [...this.edges],
      notes: [...this.notes]
    }
  }

  size() {
    return this.nodes.size + this.edges.size + this.notes.size
  }

  allIds() {
    return [...this.nodes, ...this.edges, ...this.notes]
  }
}
