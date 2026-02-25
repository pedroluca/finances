import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import type { CardWithBalance, MonthlyTotal } from '../../types/database'

interface UpcomingPayment {
  cardId: number
  cardName: string
  cardColor: string
  unpaidAmount: number   // valor da fatia do usuário
  totalAmount?: number   // total do cartão (só para cartões próprios)
  isShared: boolean
  dueDate: Date
  isOverdue: boolean
  isDueToday: boolean
  isDueSoon: boolean
  diffDays: number
  referenceMonth: number
  referenceYear: number
}

interface DashboardUpcomingPaymentsProps {
  cards: CardWithBalance[]
  monthlyTotals: MonthlyTotal[]
  hideValues: boolean
}

function buildUpcomingPayments(
  cards: CardWithBalance[],
  monthlyTotals: MonthlyTotal[],
  maxDays: number | null,
): UpcomingPayment[] {
  if (!monthlyTotals || monthlyTotals.length === 0) return []

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const results: UpcomingPayment[] = []

  cards.forEach((card) => {
    const cardId = card.card_id ?? card.id
    if (!cardId || !card.due_day) return

    // Pega as faturas deste cartão com user_unpaid_amount > 0, da mais antiga pra mais recente
    const pendingInvoices = monthlyTotals
      .filter((t) => t.card_id === cardId && Number(t.user_unpaid_amount) > 0)
      .sort((a, b) => {
        if (a.reference_year !== b.reference_year) return a.reference_year - b.reference_year
        return a.reference_month - b.reference_month
      })

    if (pendingInvoices.length === 0) return

    // Mostra a mais antiga com saldo devedor (prioridade de pagamento)
    const invoice = pendingInvoices[0]

    // Calcula data de vencimento
    // Se due_day <= closing_day, o vencimento é no mês seguinte à referência
    let dueMonth = invoice.reference_month
    let dueYear = invoice.reference_year
    if (card.due_day !== undefined && card.closing_day !== undefined && card.due_day <= card.closing_day) {
      if (dueMonth === 12) {
        dueMonth = 1
        dueYear += 1
      } else {
        dueMonth += 1
      }
    }

    const dueDate = new Date(dueYear, dueMonth - 1, card.due_day)
    dueDate.setHours(0, 0, 0, 0)

    const diffMs = dueDate.getTime() - today.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    // Vencidas sempre aparecem; futuras só se dentro do range
    if (maxDays !== null && diffDays > maxDays) return

    results.push({
      cardId,
      cardName: card.card_name,
      cardColor: card.color,
      unpaidAmount: Number(invoice.user_unpaid_amount),
      totalAmount: invoice.is_shared_portion ? undefined : Number(invoice.unpaid_amount),
      isShared: !!card.is_shared,
      dueDate,
      isOverdue: diffDays < 0,
      isDueToday: diffDays === 0,
      isDueSoon: diffDays > 0 && diffDays <= 7,
      diffDays,
      referenceMonth: invoice.reference_month,
      referenceYear: invoice.reference_year,
    })
  })

  return results.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
}

const FILTERS: { label: string; value: number | null }[] = [
  { label: 'Todos', value: null },
  { label: '7d', value: 7 },
  { label: '15d', value: 15 },
  { label: '30d', value: 30 },
]

export function DashboardUpcomingPayments({ cards, monthlyTotals, hideValues }: DashboardUpcomingPaymentsProps) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<number | null>(15)

  const payments = buildUpcomingPayments(cards, monthlyTotals, filter)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-6 transition-colors">
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Próximos Pagamentos
        </h2>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {FILTERS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => setFilter(value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                filter === value
                  ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
          <p className="font-medium text-gray-900 dark:text-white">Tudo em dia!</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum pagamento pendente no momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <button
              key={payment.cardId}
              onClick={() => navigate(`/cards/${payment.cardId}`)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/60 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: payment.cardColor }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white leading-tight">
                      {payment.cardName}
                    </p>
                    {payment.isShared && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                        compartilhado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Vence{' '}
                    {payment.dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    {' '}·{' '}
                    fatura de{' '}
                    {new Date(payment.referenceYear, payment.referenceMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  {/* Para cartões próprios: mostra "Sua parte" se for menor que o total */}
                  {!payment.isShared && payment.totalAmount !== undefined && payment.totalAmount > payment.unpaidAmount ? (
                    <>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {hideValues ? 'R$ ••••' : `R$ ${payment.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">
                        Sua parte:{' '}
                        <span className="font-medium text-gray-600 dark:text-gray-300">
                          {hideValues ? 'R$ ••••' : `R$ ${payment.unpaidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      {/* Para compartilhados ou quando o total = parte do usuário */}
                      {payment.isShared && (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 text-right">Sua parte</p>
                      )}
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {hideValues ? 'R$ ••••' : `R$ ${payment.unpaidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </p>
                    </>
                  )}

                  {/* Urgency badges */}
                  {payment.isOverdue && (
                    <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">Vencida</span>
                  )}
                  {payment.isDueToday && (
                    <span className="text-[11px] font-semibold text-orange-500 dark:text-orange-400">Vence hoje</span>
                  )}
                  {payment.isDueSoon && !payment.isDueToday && (
                    <span className="text-[11px] font-semibold text-yellow-600 dark:text-yellow-400">
                      {payment.diffDays === 1 ? 'Amanhã' : `Em ${payment.diffDays} dias`}
                    </span>
                  )}
                  {!payment.isOverdue && !payment.isDueToday && !payment.isDueSoon && (
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      {payment.diffDays === 1 ? 'Em 1 dia' : `Em ${payment.diffDays} dias`}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
