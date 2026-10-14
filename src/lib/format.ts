import { currentLanguage } from '../i18n'

export const HIDDEN_VALUE = 'R$ ••••'

// A moeda é sempre o real; só os separadores seguem o idioma
const NUMBER_LOCALE = { 'pt-BR': 'pt-BR', en: 'en-US' } as const

/** 1234.5 → "1.234,50" (em inglês, "1,234.50") */
export function formatDecimal(value: number): string {
  return (Number.isFinite(value) ? value : 0).toLocaleString(NUMBER_LOCALE[currentLanguage()], { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 1234.5 → "R$ 1.234,50" (em inglês, "R$ 1,234.50") */
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

const NAMES = {
  'pt-BR': {
    months: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
    monthsShort: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
    weekdays: ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'],
  },
  en: {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
}

const names = () => NAMES[currentLanguage()]
const isEnglish = () => currentLanguage() === 'en'
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const pad = (value: number) => String(value).padStart(2, '0')

/** "Terça-feira, 7 de outubro" (em inglês, "Tuesday, October 7") */
export function weekdayLabel(date = new Date()): string {
  const { months, weekdays } = names()
  const weekday = weekdays[date.getDay()]
  const month = months[date.getMonth()]
  return capitalize(isEnglish() ? `${weekday}, ${month} ${date.getDate()}` : `${weekday}, ${date.getDate()} de ${month}`)
}

/** "março de 2026" (em inglês, "March 2026") */
export function monthYearLabel(month: number, year: number): string {
  const name = names().months[month - 1]
  return isEnglish() ? `${name} ${year}` : `${name} de ${year}`
}

/** "Março de 2026" */
export function monthYearTitle(month: number, year: number): string {
  return capitalize(monthYearLabel(month, year))
}

/** "16/03" (em inglês, "03/16") */
export function dayMonth(date: Date): string {
  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  return isEnglish() ? `${month}/${day}` : `${day}/${month}`
}

/** Dia e mês soltos, sem zero à esquerda: "10/3" (em inglês, "3/10") */
export function dayMonthLabel(day: number, month: number): string {
  return isEnglish() ? `${month}/${day}` : `${day}/${month}`
}

/** "16/03/2026" (em inglês, "03/16/2026") */
export function fullDate(date: Date): string {
  return `${dayMonth(date)}/${date.getFullYear()}`
}

/** "16 de mar" (em inglês, "Mar 16"), com o ano quando não é o atual */
export function shortDate(date: Date): string {
  const month = names().monthsShort[date.getMonth()]
  const sameYear = date.getFullYear() === new Date().getFullYear()
  if (isEnglish()) return sameYear ? `${month} ${date.getDate()}` : `${month} ${date.getDate()}, ${date.getFullYear()}`
  const base = `${pad(date.getDate())} de ${month}`
  return sameYear ? base : `${base} de ${date.getFullYear()}`
}

/** "08:00" (em inglês, "8:00 AM") */
export function timeLabel(date: Date): string {
  const minutes = pad(date.getMinutes())
  if (!isEnglish()) return `${pad(date.getHours())}:${minutes}`
  const hours = date.getHours() % 12 || 12
  return `${hours}:${minutes} ${date.getHours() < 12 ? 'AM' : 'PM'}`
}

/** "2026-10-13 08:00:05" (datetime do MySQL) → Date no fuso local */
export function parseLocalDateTime(value: string): Date {
  const [datePart, timePart = ''] = value.split(' ')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes, seconds] = timePart.split(':').map(Number)
  return new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, seconds || 0)
}
