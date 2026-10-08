export const HIDDEN_VALUE = 'R$ ••••'

/** 1234.5 → "1.234,50" */
export function formatDecimal(value: number): string {
  return (Number.isFinite(value) ? value : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 1234.5 → "R$ 1.234,50" */
export function formatCurrency(value: number): string {
  return `R$ ${formatDecimal(value)}`
}

/** Valor ou o texto mascarado quando o usuário escondeu os valores */
export function money(value: number, hide: boolean, hiddenText = HIDDEN_VALUE): string {
  return hide ? hiddenText : formatCurrency(value)
}

/** Plural simples: plural(2, 'cartão', 'cartões') → "cartões" */
export function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** "Terça-feira, 7 de outubro" */
export function weekdayLabel(date = new Date()): string {
  return capitalize(`${WEEKDAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]}`)
}

/** "Março de 2026" */
export function monthYearTitle(month: number, year: number): string {
  return capitalize(`${MONTHS[month - 1]} de ${year}`)
}
