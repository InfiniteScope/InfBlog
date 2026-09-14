import { debounce } from '../utils.js'
import { normalizeDoc, createDoc } from './store.js'

const KEY = 'struct-draw:doc:v1'

export class Persist {
  constructor(store) {
    this.store = store
    this.save = debounce(() => this.flush(), 250)
    window.addEventListener('pagehide', () => this.flush())
  }

  flush() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.store.doc))
      this.onSaved && this.onSaved()
    } catch (err) {
      console.warn('自动保存失败', err)
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return null
      return normalizeDoc(JSON.parse(raw))
    } catch {
      return null
    }
  }

  reset() {
    try {
      localStorage.removeItem(KEY)
    } catch {}
  }
}

export { createDoc, normalizeDoc }
