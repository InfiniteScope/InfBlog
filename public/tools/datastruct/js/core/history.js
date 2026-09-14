import { deepClone } from '../utils.js'

const MAX_HISTORY = 120

export class History {
  constructor(store) {
    this.store = store
    this.undoStack = []
    this.redoStack = []
    this.lastGestureAt = 0
    this.lastGestureOp = null
    this.listeners = []
  }

  onChange(fn) {
    this.listeners.push(fn)
  }

  notify() {
    for (const fn of this.listeners) fn()
  }

  checkpoint(op = 'edit', { coalesceMs = 0 } = {}) {
    const now = Date.now()
    if (coalesceMs > 0 && op === this.lastGestureOp && now - this.lastGestureAt < coalesceMs) {
      this.lastGestureAt = now
      return false
    }
    this.undoStack.push(deepClone(this.store.doc))
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift()
    this.redoStack.length = 0
    this.lastGestureOp = op
    this.lastGestureAt = now
    this.notify()
    return true
  }

  gesture(op = 'edit') {
    this.checkpoint(op)
    return {
      end: () => {
        this.lastGestureOp = null
      }
    }
  }

  undo() {
    if (!this.undoStack.length) return false
    this.redoStack.push(deepClone(this.store.doc))
    this.store.replace(this.undoStack.pop(), { history: true })
    this.lastGestureOp = null
    this.notify()
    return true
  }

  redo() {
    if (!this.redoStack.length) return false
    this.undoStack.push(deepClone(this.store.doc))
    this.store.replace(this.redoStack.pop(), { history: true })
    this.lastGestureOp = null
    this.notify()
    return true
  }

  clear() {
    this.undoStack.length = 0
    this.redoStack.length = 0
    this.lastGestureOp = null
    this.notify()
  }

  canUndo() { return this.undoStack.length > 0 }
  canRedo() { return this.redoStack.length > 0 }
}
