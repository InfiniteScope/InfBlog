let uidCounter = 0

export function uid(prefix) {
  uidCounter += 1
  return `${prefix}_${Date.now().toString(36)}${uidCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v
}

export function snapVal(v, enabled, grid = 20) {
  return enabled ? Math.round(v / grid) * grid : Math.round(v)
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay)
}

export function lerp(a, b, t) {
  return a + (b - a) * t
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export function debounce(fn, ms) {
  let timer = null
  const wrapped = (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
  wrapped.flush = (...args) => {
    clearTimeout(timer)
    fn(...args)
  }
  return wrapped
}

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

export function sanitizeFilename(name) {
  const cleaned = (name || '').replace(/[\\/:*?"<>|]/g, '').trim()
  return cleaned || 'diagram'
}

export function download(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function isMac() {
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
}

export function modKey(e) {
  return isMac() ? e.metaKey : e.ctrlKey
}
