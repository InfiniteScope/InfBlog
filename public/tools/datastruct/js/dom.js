export const SVGNS = 'http://www.w3.org/2000/svg'

export function svgEl(tag, attrs = {}, parent = null) {
  const el = document.createElementNS(SVGNS, tag)
  setAttrs(el, attrs)
  if (parent) parent.appendChild(el)
  return el
}

export function setAttrs(el, attrs = {}) {
  for (const key in attrs) {
    const val = attrs[key]
    if (val === null || val === undefined) continue
    el.setAttribute(key, String(val))
  }
}

export function el(tag, cls = '', parent = null) {
  const node = document.createElement(tag)
  if (cls) node.className = cls
  if (parent) parent.appendChild(node)
  return node
}

let measureCtx = null

export const CANVAS_FONT_STACK = 'ui-sans-serif, system-ui, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'

export function measureText(text, fontSize, weight = 600) {
  if (!measureCtx) {
    measureCtx = document.createElement('canvas').getContext('2d')
  }
  measureCtx.font = `${weight} ${fontSize}px ${CANVAS_FONT_STACK}`
  return measureCtx.measureText(text || '').width
}
