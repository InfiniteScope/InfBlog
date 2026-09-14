import { el } from '../dom.js'
import { NODE_COLORS, EDGE_COLORS, NOTE_COLORS, SHAPES, SHAPE_LABELS, SIZE_LABELS } from '../palette.js'

const TEXT_PROPS = {
  nodes: [
    { key: 'label', label: '标签', placeholder: '节点文字' },
    { key: 'note', label: '备注', placeholder: '节点下方的小字说明' }
  ],
  edges: [
    { key: 'label', label: '标注', placeholder: '权重 / 说明（显示在边上）' }
  ]
}

const ALIGN_KINDS = [
  ['left', '左'], ['hcenter', '居中'], ['right', '右'], ['distributeX', '横距'],
  ['top', '上'], ['vcenter', '居中'], ['bottom', '下'], ['distributeY', '纵距']
]

export class Inspector {
  constructor(store, selection, commands) {
    Object.assign(this, { store, selection, commands })
    this.container = document.getElementById('inspector')
    selection.onChange(() => this.rebuild())
    store.on('change', () => this.syncValues())
    store.on('doc', () => this.rebuild())
    this.rebuild()
  }

  rebuild() {
    this.container.innerHTML = ''
    const ids = this.selection.ids()
    if (!this.selection.size()) {
      this.buildTips()
      return
    }
    if (ids.nodes.length) this.buildNodeSection(ids.nodes)
    if (ids.edges.length) this.buildEdgeSection(ids.edges)
    if (ids.notes.length) this.buildNoteSection(ids.notes)
    this.buildDeleteSection(ids)
  }

  uniform(kind, ids, key) {
    let value = null
    let first = true
    for (const id of ids) {
      const item = this.store.doc[kind][id]
      if (!item) continue
      if (first) { value = item[key]; first = false }
      else if (item[key] !== value) return ''
    }
    return value === null || value === undefined ? '' : value
  }

  sectionTitle(text, count) {
    const title = el('div', 'panel-title', this.container)
    title.textContent = text
    if (count > 1) {
      const badge = el('span', 'count-badge', title)
      badge.textContent = `${count} 个`
    }
  }

  buildTips() {
    this.sectionTitle('画布')
    const box = el('div', 'panel-section', this.container)
    const tips = el('div', 'tips-list', box)
    tips.innerHTML = `
      <div><b>添加节点</b>：按 <kbd>N</kbd> 后点击画布，或直接双击画布</div>
      <div><b>连线</b>：按 <kbd>E</kbd>，依次点击两个节点；从节点拖出可快速连出新节点</div>
      <div><b>标注</b>：按 <kbd>T</kbd> 点击画布添加说明文字</div>
      <div><b>编辑文字</b>：双击节点 / 连线 / 标注</div>
      <div><b>微调</b>：方向键移动，<kbd>Shift</kbd> 加速</div>
      <div><b>导出</b>：右上角导出 PNG / SVG，可直接用于博客</div>
    `
  }

  buildNodeSection(nodeIds) {
    const sec = el('div', 'panel-section', this.container)
    const title = el('div', 'panel-title', sec)
    title.textContent = '节点'
    if (nodeIds.length > 1) {
      const badge = el('span', 'count-badge', title)
      badge.textContent = `${nodeIds.length} 个`
    }
    this.container.appendChild(sec)

    if (nodeIds.length === 1) {
      for (const prop of TEXT_PROPS.nodes) {
        sec.appendChild(this.field(prop.label, this.textInput('nodes', nodeIds, prop.key, prop.placeholder)))
      }
    }

    const shapeSeg = this.segControl('nodes', nodeIds, 'shape', SHAPES.map(s => ({ v: s, label: SHAPE_LABELS[s] })))
    sec.appendChild(this.field('形状', shapeSeg))

    sec.appendChild(this.field('颜色', this.swatches('nodes', nodeIds, 'color', NODE_COLORS, true)))

    const sizeSeg = this.segControl('nodes', nodeIds, 'size', ['s', 'm', 'l'].map(s => ({ v: s, label: SIZE_LABELS[s] })))
    sec.appendChild(this.field('尺寸', sizeSeg))

    if (nodeIds.length >= 2) {
      sec.appendChild(this.field('对齐', this.alignGrid(nodeIds)))
    }
  }

  alignGrid(nodeIds) {
    const grid = el('div', 'align-grid')
    for (const [kind, label] of ALIGN_KINDS) {
      const btn = el('button', 'align-btn', grid)
      btn.textContent = label
      btn.title = kind.startsWith('distribute') ? '等距分布（至少 3 个节点）' : '对齐（至少 2 个节点）'
      btn.addEventListener('click', () => {
        if (kind === 'distributeX') this.commands.distributeNodes(nodeIds, 'x')
        else if (kind === 'distributeY') this.commands.distributeNodes(nodeIds, 'y')
        else this.commands.alignNodes(nodeIds, kind)
      })
    }
    return grid
  }

  buildEdgeSection(edgeIds) {
    const sec = el('div', 'panel-section', this.container)
    const title = el('div', 'panel-title', sec)
    title.textContent = '连线'
    if (edgeIds.length > 1) {
      const badge = el('span', 'count-badge', title)
      badge.textContent = `${edgeIds.length} 条`
    }
    this.container.appendChild(sec)

    const dirSeg = this.segControl('edges', edgeIds, 'directed', [
      { v: false, label: '无向' }, { v: true, label: '有向' }
    ], v => String(v))
    sec.appendChild(this.field('类型', dirSeg))

    sec.appendChild(this.field('颜色', this.swatches('edges', edgeIds, 'color', EDGE_COLORS, false)))

    if (edgeIds.length === 1) {
      for (const prop of TEXT_PROPS.edges) {
        sec.appendChild(this.field(prop.label, this.textInput('edges', edgeIds, prop.key, prop.placeholder)))
      }
      sec.appendChild(this.field('弯曲', this.rangeControl('edges', edgeIds, 'bend', -140, 140)))
    }

    sec.appendChild(this.field('虚线', this.switchControl('edges', edgeIds, 'dashed')))
  }

  buildNoteSection(noteIds) {
    const sec = el('div', 'panel-section', this.container)
    const title = el('div', 'panel-title', sec)
    title.textContent = '标注'
    if (noteIds.length > 1) {
      const badge = el('span', 'count-badge', title)
      badge.textContent = `${noteIds.length} 个`
    }
    this.container.appendChild(sec)

    const sizeSeg = this.segControl('notes', noteIds, 'size', ['s', 'm', 'l'].map(s => ({ v: s, label: SIZE_LABELS[s] })))
    sec.appendChild(this.field('字号', sizeSeg))
    sec.appendChild(this.field('颜色', this.swatches('notes', noteIds, 'color', NOTE_COLORS, false)))
    if (noteIds.length === 1) {
      sec.appendChild(this.field('内容', this.textInput('notes', noteIds, 'text', '标注文字')))
    }
  }

  buildDeleteSection(ids) {
    const hr = el('div', 'panel-hr', this.container)
    const sec = el('div', 'panel-section', this.container)
    const btn = el('button', 'btn danger', sec)
    btn.textContent = '删除所选'
    btn.addEventListener('click', () => {
      this.commands.deleteIds(this.selection.ids())
      this.selection.clear()
    })
  }

  field(label, control) {
    const wrap = el('div', 'field')
    const lab = el('div', 'field-label', wrap)
    lab.textContent = label
    wrap.appendChild(control)
    return wrap
  }

  textInput(kind, ids, key, placeholder) {
    const input = el('input', 'text-input')
    input.type = 'text'
    input.placeholder = placeholder
    input.spellcheck = false
    input.dataset.kind = kind
    input.dataset.key = key
    input.addEventListener('change', () => {
      this.commands.setProps(kind, ids, { [key]: input.value })
    })
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur()
      e.stopPropagation()
    })
    return input
  }

  segControl(kind, ids, key, options, toStr = v => String(v)) {
    const seg = el('div', 'inspector-seg')
    for (const opt of options) {
      const btn = el('button', '', seg)
      btn.textContent = opt.label
      btn.dataset.kind = kind
      btn.dataset.key = key
      btn.dataset.value = toStr(opt.v)
      btn.addEventListener('click', () => {
        this.commands.setProps(kind, ids, { [key]: opt.v })
      })
    }
    return seg
  }

  swatches(kind, ids, key, colors, twoTone) {
    const grid = el('div', 'swatches')
    for (const name in colors) {
      const c = colors[name]
      const btn = el('button', 'swatch', grid)
      btn.title = name
      btn.dataset.kind = kind
      btn.dataset.key = key
      btn.dataset.value = name
      btn.style.background = twoTone ? c.fill : c
      btn.style.borderColor = twoTone ? c.stroke : 'rgba(15,23,42,.15)'
      btn.addEventListener('click', () => {
        this.commands.setProps(kind, ids, { [key]: name })
      })
    }
    return grid
  }

  rangeControl(kind, ids, key, min, max) {
    const row = el('div', 'range-row')
    const input = el('input')
    input.type = 'range'
    input.min = min
    input.max = max
    input.step = 2
    input.dataset.kind = kind
    input.dataset.key = key
    const val = el('span', 'range-val')
    val.textContent = '0'
    input.addEventListener('input', () => {
      val.textContent = input.value
    })
    input.addEventListener('change', () => {
      this.commands.setProps(kind, ids, { [key]: +input.value })
    })
    row.appendChild(input)
    row.appendChild(val)
    return row
  }

  switchControl(kind, ids, key) {
    const row = el('div', 'switch-row')
    const label = el('label', 'switch')
    const input = el('input')
    input.type = 'checkbox'
    input.dataset.kind = kind
    input.dataset.key = key
    const track = el('span', 'track')
    const thumb = el('span', 'thumb')
    label.appendChild(input)
    label.appendChild(track)
    label.appendChild(thumb)
    input.addEventListener('change', () => {
      this.commands.setProps(kind, ids, { [key]: input.checked })
    })
    row.appendChild(label)
    return row
  }

  syncValues() {
    const controls = this.container.querySelectorAll('[data-kind][data-key]')
    for (const c of controls) {
      const ids = this.selection.ids()[c.dataset.kind]
      if (!ids || !ids.length) continue
      const value = this.uniform(c.dataset.kind, ids, c.dataset.key)
      if (c.tagName === 'INPUT' && c.type === 'text') {
        if (document.activeElement !== c) c.value = value
      } else if (c.tagName === 'INPUT' && c.type === 'range') {
        c.value = value || 0
        const val = c.parentElement.querySelector('.range-val')
        if (val) val.textContent = String(value || 0)
      } else if (c.tagName === 'INPUT' && c.type === 'checkbox') {
        c.checked = value === true
      } else if (c.tagName === 'BUTTON') {
        c.classList.toggle('active', String(value) === c.dataset.value && value !== '')
      }
    }
  }
}
