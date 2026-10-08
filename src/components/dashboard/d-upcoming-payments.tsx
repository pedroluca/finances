import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, CreditCard, ReceiptText } from 'lucide-react'
import type { Bill, CardWithBalance, MonthlyTotal } from '../../types/database'
import { Card } from '../ui/card'
import { Badge, SegmentedControl } from '../ui/misc'
import { cn } from '../../lib/cn'
import { money } from '../../lib/format'

interface UpcomingPayment {
  kind: 'card' | 'bill'
  key: string
  label: string
  color: string
  icon?: string | null
  unpaidAmount: number   // valor a exibir (parte do usuário, no caso de cartão)
  totalAmount?: number   // total do cartão (só para cartões próprios)
  isShared: boolean
  amountPending: boolean // conta variável sem valor definido ainda
  dueDate: Date
  isOverdue: boolean
  isDueToday: boolean
  isDueSoon: boolean
  diffDays: number
  subLabel: string
  onClick: () => void
}

function buildCardPayments(
  cards: CardWithBalance[],
  monthlyTotals: MonthlyTotal[],
  maxDays: number | null,
  today: Date,
  navigate: (path: string) => void,
): UpcomingPayment[] {
  if (!monthlyTotals || monthlyTotals.length === 0) return []

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

    const referenceLabel = new Date(invoice.reference_year, invoice.reference_month - 1)
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

    results.push({
      kind: 'card',
      key: `card-${cardId}`,
      label: card.card_name,
      color: card.color,
      unpaidAmount: Number(invoice.user_unpaid_amount),
      totalAmount: invoice.is_shared_portion ? undefined : Number(invoice.unpaid_amount),
      isShared: !!card.is_shared,
      amountPending: false,
      dueDate,
      isOverdue: diffDays < 0,
      isDueToday: diffDays === 0,
      isDueSoon: diffDays > 0 && diffDays <= 7,
      diffDays,
      subLabel: `fatura de ${referenceLabel}`,
      onClick: () => navigate(`/cards/${cardId}`),
    })
  })

  return results
}

function buildBillPayments(
  bills: Bill[],
  maxDays: number | null,
  today: Date,
  navigate: (path: string) => void,
): UpcomingPayment[] {
  const results: UpcomingPayment[] = []

  bills.forEach((bill) => {
    if (!bill.active) return

    const unpaidCharges = (bill.charges ?? [])
      .filter((c) => !c.is_paid)
      .sort((a, b) => (a.reference_year - b.reference_year) || (a.reference_month - b.reference_month))

    if (unpaidCharges.length === 0) return
    const charge = unpaidCharges[0]

    const dueDate = new Date(charge.due_date + 'T00:00:00')
    const diffMs = dueDate.getTime() - today.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (maxDays !== null && diffDays > maxDays) return

    results.push({
      kind: 'bill',
      key: `bill-${charge.id}`,
      label: bill.description,
      color: bill.category_color ?? '#6366f1',
      icon: bill.category_icon,
      unpaidAmount: charge.amount ?? 0,
      isShared: false,
      amountPending: charge.amount === null,
      dueDate,
      isOverdue: diffDays < 0,
      isDueToday: diffDays === 0,
      isDueSoon: diffDays > 0 && diffDays <= 7,
      diffDays,
      subLabel: 'conta',
      onClick: () => navigate('/billings'),
    })
  })

  return results
}

type Filter = 'all' | '7' | '15' | '30'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: '7', label: '7d' },
  { value: '15', label: '15d' },
  { value: '30', label: '30d' },
]

interface DashboardUpcomingPaymentsProps {
  cards: CardWithBalance[]
  monthlyTotals: MonthlyTotal[]
  bills: Bill[]
  hideValues: boolean
}

export function DashboardUpcomingPayments({ cards, monthlyTotals, bills, hideValues }: DashboardUpcomingPaymentsProps) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('15')
  const maxDays = filter === 'all' ? null : Number(filter)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const payments = [
    ...buildCardPayments(cards, monthlyTotals, maxDays, today, navigate),
    ...buildBillPayments(bills, maxDays, today, navigate),
  ].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())

  const definedPayments = payments.filter((p) => !p.amountPending)
  const totalAll = definedPayments.reduce((sum, p) => sum + (p.totalAmount ?? p.unpaidAmount), 0)
  const totalMine = definedPayments.reduce((sum, p) => sum + p.unpaidAmount, 0)
  const showMine = Math.abs(totalMine - totalAll) > 0.004

  return (
    <Card className="p-4 md:p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Próximos Pagamentos</h2>
        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} compact />
      </div>

      {definedPayments.length > 0 && (
        <div className="flex gap-3">
          <TotalBox label="Valor total" value={money(totalAll, hideValues)} />
          {showMine && <TotalBox label="Sua parte" value={money(totalMine, hideValues)} />}
        </div>
      )}

      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <CheckCircle2 className="w-10 h-10 text-success" />
          <p className="font-semibold text-foreground">Tudo em dia!</p>
          <p className="text-sm text-muted">Nenhum pagamento pendente no momento.</p>
        </div>
      ) : (
        <div className="grid gap-2.5 xl:grid-cols-2">
          {payments.map((payment) => (
            <PaymentRow key={payment.key} payment={payment} hideValues={hideValues} />
          ))}
        </div>
      )}
    </Card>
  )
}

function TotalBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 min-w-0 bg-surface-2 rounded-xl px-3 py-2.5">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="text-[15px] font-semibold text-foreground truncate">{value}</p>
    </div>
  )
}

function PaymentRow({ payment, hideValues }: { payment: UpcomingPayment; hideValues: boolean }) {
  const { diffDays } = payment

  const urgency = payment.isOverdue
    ? { label: 'Vencida', className: 'text-danger' }
    : payment.isDueToday
      ? { label: 'Vence hoje', className: 'text-orange' }
      : payment.isDueSoon
        ? { label: diffDays === 1 ? 'Amanhã' : `Em ${diffDays} dias`, className: 'text-warning' }
        : { label: diffDays === 1 ? 'Em 1 dia' : `Em ${diffDays} dias`, className: 'text-subtle' }

  // Cartão próprio com itens de outras pessoas: mostra o total e, embaixo, a parte do usuário
  const showTotalAndPart = payment.kind === 'card' && !payment.isShared && payment.totalAmount !== undefined && payment.totalAmount > payment.unpaidAmount

  return (
    <button
      type="button"
      onClick={payment.onClick}
      className="w-full flex items-center gap-3 p-3.5 bg-surface-2 hover:bg-surface-3 rounded-xl transition-colors text-left"
    >
      {payment.kind === 'bill' ? (
        <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-lg" style={{ backgroundColor: `${payment.color}26`, color: payment.color }}>
          {payment.icon ?? <ReceiptText size={19} />}
        </div>
      ) : (
        <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white" style={{ backgroundColor: payment.color }}>
          <CreditCard size={19} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="font-semibold text-foreground truncate">{payment.label}</p>
          {payment.isShared && <Badge label="compartilhado" tone="info" />}
        </div>
        <p className="text-xs text-muted mt-0.5 line-clamp-2">
          Vence {payment.dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · {payment.subLabel}
        </p>
      </div>

      <div className="flex flex-col items-end shrink-0">
        {payment.amountPending ? (
          <Badge label="Valor a definir" tone="warning" />
        ) : showTotalAndPart ? (
          <>
            <p className="font-semibold text-foreground">{money(payment.totalAmount ?? 0, hideValues)}</p>
            <p className="text-[11px] text-subtle">
              Sua parte: <span className="font-medium text-muted">{money(payment.unpaidAmount, hideValues)}</span>
            </p>
          </>
        ) : (
          <>
            {payment.isShared && <p className="text-[11px] text-subtle">Sua parte</p>}
            <p className="font-semibold text-foreground">{money(payment.unpaidAmount, hideValues)}</p>
          </>
        )}
        <span className={cn('text-[11px] font-semibold mt-0.5', urgency.className)}>{urgency.label}</span>
      </div>
    </button>
  )
}
