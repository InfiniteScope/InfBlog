import { uid } from './utils.js'

export const NODE_COLORS = {
  slate:  { fill: '#F1F5F9', stroke: '#94A3B8', label: '#334155' },
  blue:   { fill: '#DBEAFE', stroke: '#3B82F6', label: '#1E40AF' },
  green:  { fill: '#DCFCE7', stroke: '#22C55E', label: '#166534' },
  amber:  { fill: '#FEF3C7', stroke: '#F59E0B', label: '#92400E' },
  red:    { fill: '#FEE2E2', stroke: '#EF4444', label: '#991B1B' },
  purple: { fill: '#EDE9FE', stroke: '#8B5CF6', label: '#5B21B6' },
  teal:   { fill: '#CCFBF1', stroke: '#14B8A6', label: '#115E59' },
  pink:   { fill: '#FCE7F3', stroke: '#EC4899', label: '#9D174D' }
}

export const EDGE_COLORS = {
  slate:  '#64748B',
  blue:   '#2563EB',
  green:  '#16A34A',
  amber:  '#D97706',
  red:    '#DC2626',
  purple: '#7C3AED',
  teal:   '#0D9488',
  pink:   '#DB2777'
}

export const NOTE_COLORS = {
  slate:  '#475569',
  blue:   '#1D4ED8',
  green:  '#15803D',
  amber:  '#B45309',
  red:    '#B91C1C',
  purple: '#6D28D9'
}

export const SHAPES = ['circle', 'rect', 'pill']
export const SHAPE_LABELS = { circle: '圆形', rect: '方形', pill: '胶囊' }

export const NODE_SIZES = {
  s: { r: 16, h: 32, font: 12.5, pad: 14 },
  m: { r: 22, h: 40, font: 14,   pad: 17 },
  l: { r: 30, h: 54, font: 16.5, pad: 21 }
}
export const SIZE_LABELS = { s: '小', m: '中', l: '大' }

export const NOTE_SIZES = { s: 14, m: 18, l: 24 }

export const DEFAULT_NODE = { shape: 'circle', color: 'slate', size: 'm', label: '', note: '' }
export const DEFAULT_EDGE = { color: 'slate', directed: false, dashed: false, label: '', bend: 0, bendManual: false, labelDx: 0, labelDy: 0 }
export const DEFAULT_NOTE = { text: '标注文字', size: 'm', color: 'slate' }

export const GRID = 20
export const EDGE_HIT_WIDTH = 14
export const EDGE_STROKE = 2
export const ARROW_LEN = 10

export function newNodeId() { return uid('n') }
export function newEdgeId() { return uid('e') }
export function newNoteId() { return uid('t') }
