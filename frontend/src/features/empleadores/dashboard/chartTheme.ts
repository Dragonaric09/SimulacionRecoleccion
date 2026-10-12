/** Paleta del proyecto (sistema-de-diseno): los mismos tokens en todos los gráficos. */

/** Color de la sección Empleadores (verde azulado). */
export const EMPLOYER = '#14A39A'
/** Color de la sección Titulados (azul). Se usa como segunda serie en las comparaciones. */
export const TITULADOS = '#1F6FB5'
/** Resaltado de un dato puntual. */
export const HIGHLIGHT = '#F2A33A'
/** Sin respuesta, «No sabe» y «No observado». */
export const NEUTRAL = '#94A3B8'
export const GRID = '#E2E8F0'
export const AXIS_TEXT = '#475569'
export const DANGER = '#D64545'
export const SUCCESS = '#2E9E5B'

/** Series de varias categorías, en este orden. */
export const CATEGORY_COLORS = ['#1F6FB5', '#14A39A', '#F2A33A', '#8E5BD0', '#E4572E', '#5C6B7A', '#7CB342', '#D9418C'] as const

/** Escala de suficiencia 1 a 5 (divergente naranja-azul). */
export const LIKERT_COLORS = ['#E4572E', '#F4A98A', '#F1F5F9', '#8DB8E0', '#1F6FB5'] as const

/** Escala de acuerdo: desacuerdo, parcial y acuerdo. */
export const AGREEMENT = { disagree: '#E4572E', partly: '#8DB8E0', agree: '#1F6FB5' } as const

const LIKERT_STOPS = [
  [0xe4, 0x57, 0x2e],
  [0xf4, 0xa9, 0x8a],
  [0xf1, 0xf5, 0xf9],
  [0x8d, 0xb8, 0xe0],
  [0x1f, 0x6f, 0xb5],
] as const

/** Color de una media de 1 a 5 interpolando la escala de suficiencia. */
export function likertColor(value: number) {
  const position = Math.min(Math.max(value, 1), 5) - 1
  const index = Math.min(Math.floor(position), 3)
  const t = position - index
  const from = LIKERT_STOPS[index]
  const to = LIKERT_STOPS[index + 1]
  const channel = (i: number) => Math.round(from[i] + (to[i] - from[i]) * t)
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`
}

export function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
