import { registerStructure } from './registry.js'
import { sequenceLayout } from './sequence.js'

registerStructure({
  id: 'array',
  label: '数组',
  icon: 'arrayMode',
  nodeDefaults: { shape: 'rect' },
  actions: [
    { id: 'generate', label: '生成数组', desc: '水平单元格 + 下标', generator: { count: 8, dir: 'horizontal', index: '0' } },
    { id: 'tidy', label: '水平排齐', desc: '按行紧密排列', run: ({ layout }) => layout(sequenceLayout('horizontal')) }
  ]
})
