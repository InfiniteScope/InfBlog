import { registerStructure } from './registry.js'
import { sequenceLayout } from './sequence.js'

registerStructure({
  id: 'stack',
  label: '栈',
  icon: 'stackMode',
  nodeDefaults: { shape: 'rect' },
  actions: [
    { id: 'generate', label: '生成栈', desc: '竖直连续单元格', generator: { count: 5, dir: 'vertical', index: 'none' } },
    { id: 'tidy', label: '竖直排齐', desc: '按列紧密排列', run: ({ layout }) => layout(sequenceLayout('vertical')) }
  ]
})
