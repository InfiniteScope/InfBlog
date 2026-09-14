import { NODE_SIZES, EDGE_STROKE } from './palette.js'
import { measureText } from './dom.js'

export function nodeMetrics(node) {
  const size = NODE_SIZES[node.size] || NODE_SIZES.m
  const label = node.label || ''
  if (node.shape === 'circle') {
    const textW = measureText(label, size.font)
    const maxW = 2 * size.r - 12
    const fontSize = label && textW > maxW ? Math.max(9, size.font * maxW / textW) : size.font
    return { kind: 'circle', r: size.r, fontSize, textW: Math.min(textW, maxW) }
  }
  const textW = measureText(label, size.font)
  const w = Math.max(size.h, Math.ceil(textW) + size.pad * 2)
  return {
    kind: node.shape,
    w,
    h: size.h,
    rx: node.shape === 'pill' ? size.h / 2 : 7,
    fontSize: size.font,
    textW
  }
}

export function nodeBBox(node) {
  const m = nodeMetrics(node)
  if (m.kind === 'circle') {
    return { x: node.x - m.r, y: node.y - m.r, w: m.r * 2, h: m.r * 2 }
  }
  return { x: node.x - m.w / 2, y: node.y - m.h / 2, w: m.w, h: m.h }
}

export function nodeOuterRadius(node) {
  const m = nodeMetrics(node)
  if (m.kind === 'circle') return m.r
  return Math.hypot(m.w, m.h) / 2
}

export function nodeCaptionOffset(node) {
  const m = nodeMetrics(node)
  return (m.kind === 'circle' ? m.r : m.h / 2) + 17
}

function portToward(node, tx, ty) {
  const m = nodeMetrics(node)
  const dx = tx - node.x
  const dy = ty - node.y
  if (dx === 0 && dy === 0) return { x: node.x, y: node.y - (m.kind === 'circle' ? m.r : m.h / 2) }
  if (m.kind === 'circle') {
    const d = Math.hypot(dx, dy)
    return { x: node.x + dx / d * m.r, y: node.y + dy / d * m.r }
  }
  const hw = m.w / 2
  const hh = m.h / 2
  const sx = dx !== 0 ? hw / Math.abs(dx) : Infinity
  const sy = dy !== 0 ? hh / Math.abs(dy) : Infinity
  const s = Math.min(sx, sy)
  return { x: node.x + dx * s, y: node.y + dy * s }
}

function perpUnit(ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const len = Math.hypot(dx, dy)
  if (len === 0) return { x: 0, y: -1 }
  return { x: -dy / len, y: dx / len }
}

export function autoBendFor(edge, siblings) {
  if (edge.bendManual) return edge.bend
  if (!siblings || siblings.length < 2) return 0
  const idx = siblings.indexOf(edge)
  return (idx - (siblings.length - 1) / 2) * 56
}

export function selfLoopGeom(node, bend = 0) {
  const m = nodeMetrics(node)
  const r = m.kind === 'circle' ? m.r : Math.max(m.w, m.h) / 2
  const base = Math.PI * 1.25
  const spread = 0.62
  const p1 = { x: node.x + Math.cos(base - spread) * r, y: node.y + Math.sin(base - spread) * r }
  const p2 = { x: node.x + Math.cos(base + spread) * r, y: node.y + Math.sin(base + spread) * r }
  const loopR = r + 30 + bend
  const cx = node.x + Math.cos(base) * loopR * 1.12
  const cy = node.y + Math.sin(base) * loopR * 1.12
  const label = { x: node.x + Math.cos(base) * (loopR * 1.12 + 14), y: node.y + Math.sin(base) * (loopR * 1.12 + 14) }
  return { p1, cp: { x: cx, y: cy }, p2, label }
}

export function edgeGeom(a, b, edge, bend) {
  if (a.id === b.id) return selfLoopGeom(a, bend || 0)
  const ax = a.x, ay = a.y, bx = b.x, by = b.y
  const mid = { x: (ax + bx) / 2, y: (ay + by) / 2 }
  if (!bend) {
    const p1 = portToward(a, bx, by)
    const p2 = portToward(b, ax, ay)
    return { p1, cp: { ...mid }, p2, label: { ...mid }, straight: true }
  }
  const perp = perpUnit(ax, ay, bx, by)
  const cp = { x: mid.x + perp.x * bend, y: mid.y + perp.y * bend }
  const p1 = portToward(a, cp.x, cp.y)
  const p2 = portToward(b, cp.x, cp.y)
  const label = {
    x: (p1.x + 2 * cp.x + p2.x) / 4,
    y: (p1.y + 2 * cp.y + p2.y) / 4
  }
  return { p1, cp, p2, label, straight: false }
}

export function quadPath(p1, cp, p2) {
  return `M ${round2(p1.x)} ${round2(p1.y)} Q ${round2(cp.x)} ${round2(cp.y)} ${round2(p2.x)} ${round2(p2.y)}`
}

export function quadTangentAtEnd(p1, cp, p2) {
  const dx = p2.x - cp.x
  const dy = p2.y - cp.y
  const len = Math.hypot(dx, dy) || 1
  return { x: dx / len, y: dy / len }
}

export function round2(v) {
  return Math.round(v * 100) / 100
}

export function edgeHitBBox(geom) {
  const xs = [geom.p1.x, geom.cp.x, geom.p2.x]
  const ys = [geom.p1.y, geom.cp.y, geom.p2.y]
  const pad = EDGE_STROKE + 8
  return {
    x: Math.min(...xs) - pad,
    y: Math.min(...ys) - pad,
    w: Math.max(...xs) - Math.min(...xs) + pad * 2,
    h: Math.max(...ys) - Math.min(...ys) + pad * 2
  }
}
