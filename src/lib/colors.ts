// Mesmas utilidades de cor do app nativo (finances-app/src/theme/colors.ts)

/** Cores fixas de destaque (ícones dos cards de resumo e das configurações) */
export const accents = {
  violet: '#8b5cf6',
  green: '#10b981',
  red: '#ef4444',
  blue: '#3b82f6',
  amber: '#f59e0b',
  emerald: '#10b981',
  gray: '#6b7280',
}

function parseHex(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((char) => char + char).join('') : clean.slice(0, 6)
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)]
}

const toHex = (rgb: number[]) =>
  `#${rgb.map((channel) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, '0')).join('')}`

/** Mesma cor com transparência (#RRGGBB + alpha em hex) */
export function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  const value = Math.round(Math.min(1, Math.max(0, alpha)) * 255).toString(16).padStart(2, '0')
  return `${toHex(rgb)}${value}`
}

/** Mistura a cor com branco (amount > 0) ou com preto (amount < 0) */
export function shade(hex: string, amount: number): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  const target = amount > 0 ? 255 : 0
  const t = Math.min(1, Math.abs(amount))
  return toHex(rgb.map((channel) => channel + (target - channel) * t))
}

/** Luminância relativa (0 = preto, 1 = branco) */
export function luminance(hex: string): number {
  const rgb = parseHex(hex)
  if (!rgb) return 0
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Proporção de um cartão de verdade (ISO/IEC 7810 ID-1) */
export const CARD_RATIO = 1.586

export const DARK_INK = '#111827'

/** Tinta do texto do cartão: escura nos muito claros (dourado, prata), branca nos demais */
export function cardInk(color: string) {
  return luminance(color) > 0.42 ? DARK_INK : '#ffffff'
}
