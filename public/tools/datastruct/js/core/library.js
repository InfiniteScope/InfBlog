import { uid } from '../utils.js'

const KEY = 'struct-draw:library:v1'
const CUR_KEY = 'struct-draw:current:v1'

export class Library {
  list() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || []
    } catch {
      return []
    }
  }

  saveList(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list))
      return true
    } catch {
      return false
    }
  }

  get(id) {
    return this.list().find(e => e.id === id) || null
  }

  saveCurrent(doc, thumb) {
    const list = this.list()
    const id = this.currentId()
    const idx = id ? list.findIndex(e => e.id === id) : -1
    const entryId = idx >= 0 ? id : 'w_' + uid()
    const entry = {
      id: entryId,
      updatedAt: Date.now(),
      thumb: thumb || null,
      doc: JSON.parse(JSON.stringify(doc))
    }
    if (idx >= 0) list[idx] = entry
    else list.push(entry)
    if (!this.saveList(list)) return null
    this.setCurrent(entryId)
    return entry
  }

  saveAs(doc, thumb) {
    const list = this.list()
    const entry = {
      id: 'w_' + uid(),
      updatedAt: Date.now(),
      thumb: thumb || null,
      doc: JSON.parse(JSON.stringify(doc))
    }
    list.push(entry)
    if (!this.saveList(list)) return null
    this.setCurrent(entry.id)
    return entry
  }

  remove(id) {
    const list = this.list().filter(e => e.id !== id)
    const ok = this.saveList(list)
    if (this.currentId() === id) this.setCurrent(null)
    return ok
  }

  currentId() {
    try {
      return localStorage.getItem(CUR_KEY)
    } catch {
      return null
    }
  }

  setCurrent(id) {
    try {
      if (id) localStorage.setItem(CUR_KEY, id)
      else localStorage.removeItem(CUR_KEY)
    } catch {}
  }
}
