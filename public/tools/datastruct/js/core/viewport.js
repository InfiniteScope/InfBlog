import { clamp } from '../utils.js'
import { svgEl, setAttrs } from '../dom.js'
import { GRID } from '../palette.js'

const MIN_K = 0.25
const MAX_K = 3.2

export class Viewport {
  constructor(svg) {
    this.svg = svg
    this.k = 1
    this.tx = 0
    this.ty = 0
    this.width = 100
    this.height = 100
    this.onChange = null

    this.defs = svgEl('defs', {}, svg)
    this.gridRect = svgEl('rect', {
      id: 'gridBg', x: 0, y: 0, width: '100%', height: '100%', fill: 'url(#gridPattern)', 'data-noexport': '1'
    }, svg)
    this.world = svgEl('g', { id: 'world' }, svg)
    this.content = svgEl('g', { id: 'content' }, this.world)
    this.overlay = svgEl('g', { id: 'overlay', 'data-noexport': '1' }, this.world)

    this.pattern = svgEl('pattern', {
      id: 'gridPattern',
      patternUnits: 'userSpaceOnUse',
      width: GRID, height: GRID
    }, this.defs)
    svgEl('circle', { cx: 0, cy: 0, r: 1.4, fill: '#CBD5E1' }, this.pattern)

    this.filterShadow = svgEl('filter', {
      id: 'softShadow', x: '-40%', y: '-40%', width: '180%', height: '180%'
    }, this.defs)
    svgEl('feDropShadow', {
      dx: 0, dy: 1.5, stdDeviation: 1.6, 'flood-color': '#334155', 'flood-opacity': 0.22
    }, this.filterShadow)

    this.resize()
    this.center()
  }

  resize() {
    const rect = this.svg.getBoundingClientRect()
    this.width = Math.max(50, rect.width)
    this.height = Math.max(50, rect.height)
    this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`)
    this.apply()
  }

  center() {
    this.tx = this.width / 2
    this.ty = this.height / 2
    this.k = 1
    this.apply()
  }

  screenToWorld(sx, sy) {
    return { x: (sx - this.tx) / this.k, y: (sy - this.ty) / this.k }
  }

  worldToScreen(wx, wy) {
    return { x: wx * this.k + this.tx, y: wy * this.k + this.ty }
  }

  eventPoint(e) {
    const rect = this.svg.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  panBy(dx, dy) {
    this.tx += dx
    this.ty += dy
    this.apply()
  }

  zoomAt(factor, sx, sy) {
    const k2 = clamp(this.k * factor, MIN_K, MAX_K)
    if (k2 === this.k) return
    const ratio = k2 / this.k
    this.tx = sx - (sx - this.tx) * ratio
    this.ty = sy - (sy - this.ty) * ratio
    this.k = k2
    this.apply()
  }

  setZoom(k2, sx = this.width / 2, sy = this.height / 2) {
    this.zoomAt(k2 / this.k, sx, sy)
  }

  fit(bbox, pad = 48) {
    if (!bbox || bbox.w <= 0 || bbox.h <= 0) {
      this.center()
      return
    }
    const k = clamp(Math.min((this.width - pad * 2) / bbox.w, (this.height - pad * 2) / bbox.h), MIN_K, 1.6)
    this.k = k
    this.tx = this.width / 2 - (bbox.x + bbox.w / 2) * k
    this.ty = this.height / 2 - (bbox.y + bbox.h / 2) * k
    this.apply()
  }

  apply() {
    this.world.setAttribute('transform', `translate(${this.tx} ${this.ty}) scale(${this.k})`)
    const g = GRID * this.k
    this.pattern.setAttribute('width', g)
    this.pattern.setAttribute('height', g)
    this.pattern.setAttribute('patternTransform', `translate(${this.tx % g} ${this.ty % g})`)
    this.gridRect.setAttribute('opacity', clamp((this.k - 0.28) * 2.2, 0, 1))
    this.onChange && this.onChange()
  }
}
