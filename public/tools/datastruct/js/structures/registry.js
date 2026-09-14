const registry = new Map()

export function registerStructure(def) {
  registry.set(def.id, {
    nodeDefaults: {},
    edgeDefaults: {},
    noteDefaults: {},
    actions: [],
    ...def
  })
}

export function getStructure(id) {
  return registry.get(id) || registry.get('graph')
}

export function listStructures() {
  return [...registry.values()]
}
