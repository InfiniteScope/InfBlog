import { Store } from './core/store.js'
import { Persist, createDoc } from './core/persist.js'
import { History } from './core/history.js'
import { Selection } from './core/selection.js'
import { Library } from './core/library.js'
import { Viewport } from './core/viewport.js'
import { Renderer } from './core/renderer.js'
import { Commands } from './core/commands.js'
import { Editor } from './core/editor.js'
import { Interactions } from './core/interactions.js'
import { Inspector } from './core/inspector.js'
import { Exporter } from './core/export.js'
import { UI } from './ui/ui.js'
import './structures/graph.js'
import './structures/tree.js'
import './structures/stack.js'
import './structures/queue.js'
import './structures/array.js'

const svg = document.getElementById('canvas')
const settings = { snapOn: true }

const store = new Store()
const viewport = new Viewport(svg)
const selection = new Selection()
const renderer = new Renderer(store, viewport, selection)
const persist = new Persist(store)
const history = new History(store)
const library = new Library()
const commands = new Commands(store, history, persist, renderer, settings, viewport)
const editor = new Editor(store, viewport, commands, selection)
const ui = new UI({ store, viewport, renderer, commands, selection, persist, settings, library })
const interactions = new Interactions(store, viewport, renderer, commands, selection, editor, ui, settings)
const inspector = new Inspector(store, selection, commands)
const exporter = new Exporter(store, viewport, renderer, commands, ui)

ui.interactions = interactions
ui.exporter = exporter
ui.buildZoomControl()

selection.onChange(() => {
  renderer.syncSelection()
})

store.on('change', () => {
  renderer.render()
  ui.syncAll()
  persist.save()
})

store.on('doc', () => {
  selection.clear(true)
  renderer.render()
  ui.syncAll()
})

history.onChange(() => ui.syncHistory())

viewport.onChange = () => {
  editor.reposition()
  ui.updateZoomLabel()
}

persist.onSaved = () => ui.flashSaved()

window.addEventListener('resize', () => {
  viewport.resize()
  editor.reposition()
})

const saved = persist.load()
if (saved) {
  store.replace(saved)
  setTimeout(() => ui.toast('已恢复上次的内容'), 150)
} else {
  store.replace(createDoc())
}

interactions.setTool('select')
ui.syncAll()

const bbox = renderer.contentBBox()
if (bbox) viewport.fit(bbox, 72)

window.app = { store, viewport, renderer, commands, selection, history, settings, interactions, editor, ui, exporter, library }
