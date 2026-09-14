import { el } from '../dom.js'
import { icon } from './icons.js'
import { listStructures } from '../structures/registry.js'
import { sanitizeFilename } from '../utils.js'

const TOOL_DEFS = [
  { id: 'select', icon: 'select', key: 'V', label: '选择 / 移动' },
  { id: 'node', icon: 'node', key: 'N', label: '添加节点' },
  { id: 'edge', icon: 'edge', key: 'E', label: '添加连线' },
  { id: 'text', icon: 'text', key: 'T', label: '添加标注' },
  { id: 'hand', icon: 'hand', key: 'H', label: '平移画布' }
]

const HINTS = {
  select: '拖动移动 · 框选多选 · 双击编辑文字 · Del 删除 · Ctrl+D 复制',
  node: '点击空白放置节点 · 从节点拖出可连出新节点',
  edge: '依次点击两个节点连线 · 点击同一节点两次成自环 · Esc 取消',
  text: '点击空白添加标注文字',
  hand: '拖拽平移画布 · 滚轮缩放'
}

export class UI {
  constructor(ctx) {
    Object.assign(this, ctx)
    this.formResolve = null
    this.buildToolRail()
    this.buildLibraryButtons()
    this.buildHistoryButtons()
    this.buildViewButtons()
    this.buildModeSegment()
    this.buildArrangeMenu()
    this.buildExportMenu()
    this.buildHelp()
    this.bindTitle()
    this.bindModals()
  }

  buildToolRail() {
    const rail = document.getElementById('toolRail')
    for (const t of TOOL_DEFS) {
      const btn = el('button', 'tool-btn', rail)
      btn.dataset.tool = t.id
      btn.title = `${t.label} (${t.key})`
      btn.innerHTML = icon(t.icon)
      const key = el('span', 'tool-key', btn)
      key.textContent = t.key
      btn.addEventListener('click', () => this.interactions.setTool(t.id))
    }
  }

  onToolChanged(tool) {
    document.querySelectorAll('.tool-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tool === tool)
    })
    this.setHintForTool(tool)
  }

  setHintForTool(tool) {
    this.setHint(HINTS[tool] || '')
  }

  setHint(text) {
    document.getElementById('hint').textContent = text
  }

  buildLibraryButtons() {
    const wrap = document.getElementById('libraryBtns')
    const save = el('button', 'btn', wrap)
    save.innerHTML = `${icon('save')}<span>保存</span>`
    save.title = '保存到图库 (Ctrl+S)'
    save.addEventListener('click', () => this.saveToLibrary())
    const open = el('button', 'icon-btn', wrap)
    open.innerHTML = icon('folderOpen')
    open.title = '打开 / 我的图库 (Ctrl+O)'
    open.addEventListener('click', () => this.openLibrary())
  }

  async saveToLibrary() {
    if (this.store.isEmpty()) {
      this.toast('画布为空，先画点什么吧')
      return
    }
    const thumb = await this.exporter.makeThumb()
    const entry = this.library.saveCurrent(this.store.doc, thumb)
    if (!entry) {
      this.toast('保存失败：本地存储空间不足')
      return
    }
    this.toast(`已保存「${entry.doc.meta.title || '未命名图示'}」`)
  }

  async saveAsNew() {
    if (this.store.isEmpty()) {
      this.toast('画布为空，先画点什么吧')
      return
    }
    const thumb = await this.exporter.makeThumb()
    const entry = this.library.saveAs(this.store.doc, thumb)
    if (!entry) {
      this.toast('保存失败：本地存储空间不足')
      return
    }
    this.renderLibrary()
    this.toast(`已另存为新图「${entry.doc.meta.title || '未命名图示'}」`)
  }

  openLibrary() {
    this.renderLibrary()
    this.showModal(document.getElementById('libraryModal'))
  }

  renderLibrary() {
    const grid = document.getElementById('libraryGrid')
    const empty = document.getElementById('libraryEmpty')
    grid.innerHTML = ''
    const entries = [...this.library.list()].sort((a, b) => b.updatedAt - a.updatedAt)
    empty.classList.toggle('hidden', entries.length > 0)
    for (const entry of entries) {
      const card = el('div', 'library-card', grid)
      if (entry.id === this.library.currentId()) card.classList.add('current')
      const thumbBox = el('div', 'library-thumb', card)
      if (entry.thumb) {
        const img = el('img', '', thumbBox)
        img.src = entry.thumb
        img.alt = ''
        img.draggable = false
      } else {
        const ph = el('div', 'thumb-placeholder', thumbBox)
        ph.innerHTML = icon('image')
      }
      const title = el('div', 'library-title', card)
      title.textContent = (entry.doc.meta && entry.doc.meta.title) || '未命名图示'
      const meta = el('div', 'library-meta', card)
      const structure = listStructures().find(s => s.id === (entry.doc.meta && entry.doc.meta.mode))
      meta.textContent = `${structure ? structure.label : '图'} · ${this.fmtDate(entry.updatedAt)}`
      const del = el('button', 'icon-btn library-del', card)
      del.innerHTML = icon('trash')
      del.title = '删除'
      del.addEventListener('click', async (e) => {
        e.stopPropagation()
        const ok = await this.confirm(`删除「${title.textContent}」？删除后无法恢复。`)
        if (!ok) return
        this.library.remove(entry.id)
        this.renderLibrary()
      })
      card.addEventListener('click', () => this.openEntry(entry.id))
    }
  }

  openEntry(id) {
    const entry = this.library.get(id)
    if (!entry) return
    this.library.setCurrent(id)
    this.store.replace(entry.doc)
    this.commands.history.clear()
    this.hideModals()
    this.fitView()
    this.toast(`已打开「${(entry.doc.meta && entry.doc.meta.title) || '未命名图示'}」`)
  }

  fmtDate(ts) {
    const d = new Date(ts)
    const p = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  }

  buildHistoryButtons() {
    const wrap = document.getElementById('historyBtns')
    this.undoBtn = el('button', 'icon-btn', wrap)
    this.undoBtn.title = '撤销 (Ctrl+Z)'
    this.undoBtn.innerHTML = icon('undo')
    this.undoBtn.addEventListener('click', () => this.interactions.historyUndo())
    this.redoBtn = el('button', 'icon-btn', wrap)
    this.redoBtn.title = '重做 (Ctrl+Shift+Z)'
    this.redoBtn.innerHTML = icon('redo')
    this.redoBtn.addEventListener('click', () => this.interactions.historyRedo())
    this.syncHistory()
  }

  syncHistory() {
    const history = this.commands.history
    this.undoBtn.disabled = !history.canUndo()
    this.redoBtn.disabled = !history.canRedo()
  }

  buildViewButtons() {
    const wrap = document.getElementById('viewBtns')
    this.snapBtn = el('button', 'icon-btn toggled', wrap)
    this.snapBtn.title = '对齐网格吸附'
    this.snapBtn.innerHTML = icon('magnet')
    this.snapBtn.addEventListener('click', () => {
      this.settings.snapOn = !this.settings.snapOn
      this.syncSnap()
    })
    const fit = el('button', 'icon-btn', wrap)
    fit.title = '适应内容 (F)'
    fit.innerHTML = icon('fit')
    fit.addEventListener('click', () => this.fitView())
  }

  syncSnap() {
    this.snapBtn.classList.toggle('toggled', this.settings.snapOn)
  }

  fitView() {
    const bbox = this.renderer.contentBBox()
    this.viewport.fit(bbox, 56)
  }

  buildModeSegment() {
    const seg = document.getElementById('modeSeg')
    seg.innerHTML = ''
    for (const s of listStructures()) {
      const btn = el('button', '', seg)
      btn.dataset.mode = s.id
      btn.title = s.label
      btn.innerHTML = `${icon(s.icon || 'graphMode')}<span>${s.label}</span>`
      btn.addEventListener('click', () => {
        if (this.store.doc.meta.mode === s.id) return
        this.commands.history.checkpoint('mode')
        this.store.setMode(s.id)
        this.persist.save()
      })
    }
    this.syncMode()
  }

  syncMode() {
    const mode = this.store.doc.meta.mode
    document.querySelectorAll('#modeSeg button').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode)
    })
    this.buildArrangeMenu()
  }

  buildArrangeMenu() {
    const slot = document.getElementById('arrangeSlot')
    slot.innerHTML = ''
    const structure = listStructures().find(s => s.id === this.store.doc.meta.mode)
    if (!structure || !structure.actions.length) return
    const wrap = el('div', 'dropdown', slot)
    const btn = el('button', 'btn', wrap)
    btn.innerHTML = `${icon('arrange')}<span>排列</span>`
    const menu = el('div', 'dropdown-menu hidden', wrap)
    for (const action of structure.actions) {
      const item = el('button', 'dropdown-item', menu)
      item.innerHTML = `${icon('arrange')}<span>${action.label}</span><span class="dd-desc">${action.desc || ''}</span>`
      item.addEventListener('click', () => {
        menu.classList.add('hidden')
        this.runLayoutAction(action)
      })
    }
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const isOpen = !menu.classList.contains('hidden')
      this.closeMenus()
      menu.classList.toggle('hidden', isOpen)
    })
  }

  runLayoutAction(action) {
    if (action.generator) {
      this.openGenerator(action)
      return
    }
    const { nodes, edges } = this.store.lists()
    if (!nodes.length) {
      this.toast('画布为空，先添加一些节点吧')
      return
    }
    const ids = this.selection.ids()
    const rootId = ids.nodes.length === 1 ? ids.nodes[0] : null
    action.run({
      layout: (fn) => {
        const positions = fn(nodes, edges)
        this.commands.applyLayout(positions, { animate: true })
        this.toast('已重新排布')
      },
      rootId
    })
  }

  openGenerator(action) {
    this.openForm(action.label, action.generator).then(values => {
      if (!values) return
      const structure = listStructures().find(s => s.id === this.store.doc.meta.mode)
      const ids = this.commands.generateCells(values, (structure && structure.nodeDefaults) || {})
      this.selection.clear(true)
      this.selection.set('nodes', ids)
      this.fitView()
      this.toast(`已生成 ${values.count} 个单元格，可直接输入数值`)
    })
  }

  openForm(title, defaults) {
    return new Promise(resolve => {
      this.formResolve = resolve
      document.getElementById('formTitle').textContent = title
      const body = document.getElementById('formBody')
      body.innerHTML = ''
      const values = { count: defaults.count || 5, dir: defaults.dir || 'horizontal', index: defaults.index || 'none' }

      const row1 = el('div', 'form-row', body)
      const lab1 = el('div', 'field-label', row1)
      lab1.textContent = '数量（1 - 24）'
      const num = el('input', 'text-input', row1)
      num.type = 'number'
      num.min = 1
      num.max = 24
      num.value = values.count
      num.addEventListener('input', () => {
        const v = Math.max(1, Math.min(24, parseInt(num.value, 10) || 1))
        values.count = v
      })
      num.addEventListener('keydown', (e) => {
        e.stopPropagation()
        if (e.key === 'Enter') submit()
      })

      const row2 = el('div', 'form-row', body)
      const lab2 = el('div', 'field-label', row2)
      lab2.textContent = '排列方向'
      row2.appendChild(this.formSeg([
        { v: 'horizontal', label: '水平' },
        { v: 'vertical', label: '竖直' }
      ], values.dir, v => { values.dir = v }))

      const row3 = el('div', 'form-row', body)
      const lab3 = el('div', 'field-label', row3)
      lab3.textContent = '下标编号（显示在单元格下方）'
      row3.appendChild(this.formSeg([
        { v: 'none', label: '不显示' },
        { v: '0', label: '从 0 开始' },
        { v: '1', label: '从 1 开始' }
      ], values.index, v => { values.index = v }))

      const actions = el('div', 'form-actions', body)
      const cancel = el('button', 'btn', actions)
      cancel.textContent = '取消'
      cancel.addEventListener('click', () => this.hideModals())
      const ok = el('button', 'btn primary', actions)
      ok.textContent = '生成'
      ok.addEventListener('click', () => submit())

      const self = this
      function submit() {
        const r = self.formResolve
        self.formResolve = null
        self.hideModals()
        if (r) r({ ...values })
      }

      this.showModal(document.getElementById('formModal'))
      requestAnimationFrame(() => {
        num.focus()
        num.select()
      })
    })
  }

  formSeg(options, current, onPick) {
    const seg = el('div', 'inspector-seg')
    for (const opt of options) {
      const btn = el('button', '', seg)
      btn.textContent = opt.label
      btn.dataset.value = opt.v
      btn.classList.toggle('active', opt.v === current)
      btn.addEventListener('click', () => {
        seg.querySelectorAll('button').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        onPick(opt.v)
      })
    }
    return seg
  }

  buildExportMenu() {
    const slot = document.getElementById('exportSlot')
    slot.innerHTML = ''
    const wrap = el('div', 'dropdown', slot)
    const btn = el('button', 'btn primary', wrap)
    btn.innerHTML = `${icon('download')}<span>导出</span>`
    const menu = el('div', 'dropdown-menu hidden', wrap)
    const items = [
      { icon: 'image', label: 'PNG 图片 (2x)', desc: '博客插图', run: () => this.exporter.exportPng() },
      { icon: 'copy', label: '复制 PNG 到剪贴板', run: () => this.exporter.exportPng({ copy: true }) },
      { icon: 'svg', label: 'SVG 矢量图', run: () => this.exporter.exportSvg() },
      { sep: true },
      { icon: 'download', label: '保存工程 JSON', run: () => this.exporter.exportJson() },
      { icon: 'importIcon', label: '导入工程 JSON', run: () => this.exporter.importJson() },
      { sep: true },
      { icon: 'trash', label: '清空画布', danger: true, run: () => this.confirmClear() }
    ]
    for (const item of items) {
      if (item.sep) {
        el('div', 'dropdown-sep', menu)
        continue
      }
      const btnItem = el('button', 'dropdown-item' + (item.danger ? ' danger' : ''), menu)
      btnItem.innerHTML = `${icon(item.icon)}<span>${item.label}</span><span class="dd-desc">${item.desc || ''}</span>`
      btnItem.addEventListener('click', () => {
        menu.classList.add('hidden')
        item.run()
      })
    }
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const isOpen = !menu.classList.contains('hidden')
      this.closeMenus()
      menu.classList.toggle('hidden', isOpen)
    })
    document.addEventListener('click', () => this.closeMenus())
  }

  closeMenus() {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'))
  }

  confirmClear() {
    this.confirm('确定清空画布？当前内容仍可通过 Ctrl+Z 撤销恢复。').then(ok => {
      if (ok) this.commands.clearAll()
    })
  }

  buildZoomControl() {
    const wrap = document.getElementById('zoomCtrl')
    const minus = el('button', 'icon-btn', wrap)
    minus.title = '缩小'
    minus.innerHTML = icon('zoomOut')
    minus.addEventListener('click', () => this.viewport.setZoom(this.viewport.k / 1.2))
    this.zoomLabel = el('button', 'zoom-label', wrap)
    this.zoomLabel.textContent = '100%'
    this.zoomLabel.title = '点击恢复 100%'
    this.zoomLabel.addEventListener('click', () => this.viewport.setZoom(1))
    const plus = el('button', 'icon-btn', wrap)
    plus.title = '放大'
    plus.innerHTML = icon('zoomIn')
    plus.addEventListener('click', () => this.viewport.setZoom(this.viewport.k * 1.2))
  }

  updateZoomLabel() {
    if (this.zoomLabel) {
      this.zoomLabel.textContent = `${Math.round(this.viewport.k * 100)}%`
    }
  }

  bindTitle() {
    const input = document.getElementById('docTitle')
    input.addEventListener('change', () => {
      const title = input.value.trim() || '未命名图示'
      input.value = title
      this.store.setTitle(title)
      this.persist.save()
    })
    input.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.key === 'Enter') input.blur()
    })
    this.syncTitle()
  }

  syncTitle() {
    const input = document.getElementById('docTitle')
    if (document.activeElement !== input) {
      input.value = this.store.doc.meta.title || '未命名图示'
    }
  }

  syncEmptyHint() {
    document.getElementById('emptyHint').classList.toggle('hidden', !this.store.isEmpty())
  }

  showModal(elModal) {
    document.getElementById('modalBackdrop').classList.remove('hidden')
    elModal.classList.remove('hidden')
  }

  hideModals() {
    document.getElementById('modalBackdrop').classList.add('hidden')
    document.querySelectorAll('#modalBackdrop .modal').forEach(m => m.classList.add('hidden'))
    if (this.formResolve) {
      const r = this.formResolve
      this.formResolve = null
      r(null)
    }
  }

  bindModals() {
    document.getElementById('helpBtn').innerHTML = icon('question')
    document.getElementById('helpBtn').addEventListener('click', () => this.toggleHelp())
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.innerHTML = icon('close')
      btn.addEventListener('click', () => this.hideModals())
    })
    document.getElementById('modalBackdrop').addEventListener('click', (e) => {
      if (e.target.id === 'modalBackdrop') this.hideModals()
    })
    const saveAsBtn = document.getElementById('saveAsNewBtn')
    if (saveAsBtn) saveAsBtn.addEventListener('click', () => this.saveAsNew())
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !document.getElementById('modalBackdrop').classList.contains('hidden')) {
        this.hideModals()
      }
    })
  }

  buildHelp() {
    const groups = [
      ['工具', [['选择 / 移动', 'V'], ['添加节点', 'N'], ['添加连线', 'E'], ['添加标注', 'T'], ['平移画布', 'H']]],
      ['编辑', [['双击编辑文字', '双击'], ['删除所选', 'Del'], ['复制所选', 'Ctrl+D'], ['全选', 'Ctrl+A'], ['微移所选', '方向键'], ['编辑选中项', 'Enter'], ['撤销 / 重做', 'Ctrl+Z / Y']]],
      ['文件', [['保存到图库', 'Ctrl+S'], ['打开图库', 'Ctrl+O'], ['另存为新图', '图库左下角']]],
      ['视图', [['缩放', '滚轮'], ['平移', '空格拖拽 / 右键'], ['适应内容', 'F'], ['重置缩放', '0'], ['网格吸附开关', '磁吸按钮']]],
      ['结构技巧', [['无向图 / 有向图', '顶栏切换'], ['栈 / 队列 / 数组', '排列菜单生成'], ['自环', 'E 点击两次'], ['弯曲连线', '拖拽边中部'], ['平行边自动分开', '—']]]
    ]
    const body = document.getElementById('helpBody')
    body.innerHTML = ''
    const grid = el('div', 'help-grid', body)
    for (const [name, rows] of groups) {
      const group = el('div', 'help-group', grid)
      const h4 = el('h4', '', group)
      h4.textContent = name
      for (const [label, keys] of rows) {
        const row = el('div', 'help-row', group)
        const span = el('span', '', row)
        span.textContent = label
        const keyWrap = el('span', 'keys', row)
        for (const k of String(keys).split(' / ')) {
          const kbd = el('kbd', '', keyWrap)
          kbd.textContent = k
        }
      }
    }
  }

  toggleHelp(force) {
    const modal = document.getElementById('helpModal')
    const open = !modal.classList.contains('hidden')
    if (force === false || open) this.hideModals()
    else this.showModal(modal)
  }

  confirm(text) {
    return new Promise(resolve => {
      this.showModal(document.getElementById('confirmModal'))
      document.getElementById('confirmText').textContent = text
      const ok = document.getElementById('confirmOk')
      const cancel = document.getElementById('confirmCancel')
      const done = (result) => {
        this.hideModals()
        ok.onclick = null
        cancel.onclick = null
        resolve(result)
      }
      ok.onclick = () => done(true)
      cancel.onclick = () => done(false)
    })
  }

  toast(msg) {
    const wrap = document.getElementById('toastWrap')
    const t = el('div', 'toast', wrap)
    t.textContent = msg
    setTimeout(() => {
      t.classList.add('out')
      setTimeout(() => t.remove(), 260)
    }, 2000)
  }

  flashSaved() {
    const state = document.getElementById('saveState')
    state.textContent = '已保存 · 本地'
    state.style.color = '#16A34A'
    clearTimeout(this._saveTimer)
    this._saveTimer = setTimeout(() => {
      state.textContent = '已自动保存至本地'
      state.style.color = ''
    }, 1200)
  }

  exportFilename(ext) {
    return `${sanitizeFilename(this.store.doc.meta.title)}.${ext}`
  }

  syncAll() {
    this.syncHistory()
    this.syncMode()
    this.syncTitle()
    this.syncSnap()
    this.syncEmptyHint()
    this.updateZoomLabel()
  }
}
