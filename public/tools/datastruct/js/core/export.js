import { download, sanitizeFilename } from '../utils.js'
import { normalizeDoc } from './store.js'

const EXPORT_PAD = 28
const PNG_SCALE = 2

export class Exporter {
  constructor(store, viewport, renderer, commands, ui) {
    Object.assign(this, { store, viewport, renderer, commands, ui })
    this.fileInput = document.getElementById('fileInput')
    this.fileInput.addEventListener('change', () => this.onFileChosen())
  }

  buildStandaloneSvg() {
    const bbox = this.renderer.contentBBox()
    if (!bbox) return null
    const pad = EXPORT_PAD
    const x = bbox.x - pad
    const y = bbox.y - pad
    const w = bbox.w + pad * 2
    const h = bbox.h + pad * 2

    const clone = this.viewport.svg.cloneNode(true)
    clone.querySelectorAll('[data-noexport]').forEach(n => n.remove())
    const world = clone.querySelector('#world')
    if (world) world.removeAttribute('transform')
    clone.setAttribute('width', Math.round(w))
    clone.setAttribute('height', Math.round(h))
    clone.setAttribute('viewBox', `${x} ${y} ${w} ${h}`)
    clone.removeAttribute('class')
    clone.removeAttribute('id')
    clone.removeAttribute('style')
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bg.setAttribute('x', x)
    bg.setAttribute('y', y)
    bg.setAttribute('width', w)
    bg.setAttribute('height', h)
    bg.setAttribute('fill', '#FFFFFF')
    clone.insertBefore(bg, clone.firstChild)
    return { svg: clone, w, h }
  }

  serialize(clone) {
    const str = new XMLSerializer().serializeToString(clone)
    return `<?xml version="1.0" encoding="UTF-8"?>\n${str}`
  }

  async rasterize(svgStr, w, h, scale) {
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    try {
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = url
      })
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(w * scale))
      canvas.height = Math.max(1, Math.round(h * scale))
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      return canvas
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  async makeThumb() {
    const built = this.buildStandaloneSvg()
    if (!built) return null
    const scale = Math.min(320 / built.w, 320 / built.h, 0.5)
    const canvas = await this.rasterize(this.serialize(built.svg), built.w, built.h, scale)
    return canvas.toDataURL('image/png')
  }

  async exportPng({ copy = false } = {}) {
    const built = this.buildStandaloneSvg()
    if (!built) {
      this.ui.toast('画布为空')
      return
    }
    const { w, h } = built
    const svgStr = this.serialize(built.svg)
    try {
      const canvas = await this.rasterize(svgStr, w, h, PNG_SCALE)
      const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
      if (copy) {
        await this.copyPng(pngBlob)
      } else {
        download(this.ui.exportFilename('png'), pngBlob)
        this.ui.toast('PNG 已导出')
      }
    } catch (err) {
      console.error(err)
      this.ui.toast(copy ? '复制失败，请改用导出 PNG' : '导出失败')
    }
  }

  async copyPng(blob) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      this.ui.toast('已复制到剪贴板，可直接粘贴')
    } catch (err) {
      download(this.ui.exportFilename('png'), blob)
      this.ui.toast('剪贴板不可用，已改为下载 PNG')
    }
  }

  exportSvg() {
    const built = this.buildStandaloneSvg()
    if (!built) {
      this.ui.toast('画布为空')
      return
    }
    const blob = new Blob([this.serialize(built.svg)], { type: 'image/svg+xml;charset=utf-8' })
    download(this.ui.exportFilename('svg'), blob)
    this.ui.toast('SVG 已导出')
  }

  exportJson() {
    const data = JSON.stringify(this.store.doc, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    download(this.ui.exportFilename('json'), blob)
    this.ui.toast('工程文件已保存')
  }

  importJson() {
    this.fileInput.value = ''
    this.fileInput.click()
  }

  onFileChosen() {
    const file = this.fileInput.files && this.fileInput.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result)
        const doc = normalizeDoc(raw)
        this.store.replace(doc)
        this.commands.history.clear()
        this.ui.fitView()
        this.ui.toast(`已导入「${doc.meta.title || file.name}」`)
      } catch (err) {
        console.error(err)
        this.ui.toast('导入失败：不是有效的工程文件')
      }
    }
    reader.readAsText(file)
  }
}
