import { phpApiRequest } from './api'
import type { CardWithBalance, InvoiceWithCard } from '../types/database'

// Mesmas regras do app nativo (finances-app/src/data/invoices.ts)

const pad = (value: number) => String(value).padStart(2, '0')

/** Date → "2026-03-16" no fuso local (toISOString usaria UTC e poderia virar o dia) */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const nextMonth = (month: number, year: number) => (month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year })

/** Fatura em que uma compra cai: depois do dia de fechamento, vai para a do mês seguinte (mesma regra do items.php) */
export function invoiceMonthFor(card: CardWithBalance, purchaseDate: string): { month: number; year: number } {
  const [year, month, day] = purchaseDate.split('-').map(Number)
  return day > card.closing_day ? nextMonth(month, year) : { month, year }
}

/**
 * Garante que a fatura do mês existe, criando-a com as datas certas. O dia que não existe no mês
 * (ex.: fechamento 31 em fevereiro) vira o último dia; o PHP, sozinho, deixaria a data "transbordar".
 */
export async function ensureInvoice(card: CardWithBalance, month: number, year: number): Promise<void> {
  const cardId = card.card_id ?? card.id
  const invoices: InvoiceWithCard[] = await phpApiRequest(`invoices.php?card_id=${cardId}`)
  if (invoices.some((invoice) => invoice.reference_month === month && invoice.reference_year === year)) return

  const closingDate = new Date(year, month - 1, card.closing_day)
  if (closingDate.getMonth() !== month - 1) closingDate.setDate(0)
  const due = card.due_day < card.closing_day ? nextMonth(month, year) : { month, year }
  const dueDate = new Date(due.year, due.month - 1, card.due_day)
  if (dueDate.getMonth() !== due.month - 1) dueDate.setDate(0)

  const created = await phpApiRequest('invoices.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      card_id: cardId,
      reference_month: month,
      reference_year: year,
      closing_date: toDateKey(closingDate),
      due_date: toDateKey(dueDate),
    }),
  })
  if (!created?.id) throw new Error('Erro ao criar fatura')
}
