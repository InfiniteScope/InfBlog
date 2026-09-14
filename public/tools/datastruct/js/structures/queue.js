import { registerStructure } from './registry.js'
import { sequenceLayout } from './sequence.js'

registerStructure({
  id: 'queue',
  label: '队列',
  icon: 'queueMode',
  nodeDefaults: { shape: 'rect' },
  actions: [
    { id: 'generate', label: '生成队列', desc: '水平连续单元格', generator: { count: 6, dir: 'horizontal', index: 'none' } },
    { id: 'tidy', label: '水平排齐', desc: '按行紧密排列', run: ({ layout }) => layout(sequenceLayout('horizontal')) }
  ]
})
