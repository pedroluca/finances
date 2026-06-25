import { useNavigate } from 'react-router-dom'
import { CreditCard, DollarSign, TrendingDown, Repeat } from 'lucide-react'
import type { Subscription, BillingCycle } from '../../types/database'
import { StatCard } from './d-stat-card'

function toMonthlyEquivalent(amount: number, cycle?: BillingCycle): number {
  if (cycle === 'annual')     return amount / 12
  if (cycle === 'semiannual') return amount / 6
  return amount
}

interface DashboardStatsProps {
  totalCards: number
  totalLimit: number
  currentMonthExpense: number
  hideValues: boolean
  subscriptions: Subscription[]
  ownerAuthorId?: number
}

export function DashboardStats({ totalCards, totalLimit, currentMonthExpense, hideValues, subscriptions, ownerAuthorId }: DashboardStatsProps) {
  const navigate = useNavigate()

  const activeSubscriptions = subscriptions.filter((s) =>
    s.active &&
    !s.paused &&
    (ownerAuthorId == null || s.author_id === ownerAuthorId)
  )
  const monthlySubTotal = activeSubscriptions.reduce((sum, s) => sum + toMonthlyEquivalent(s.amount, s.billing_cycle), 0)
  const hasSubscriptions = activeSubscriptions.length > 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-3 md:mb-6">
      <StatCard
        label="Cartões"
        value={totalCards}
        icon={CreditCard}
        iconBgClassName="bg-purple-100 dark:bg-purple-900"
        iconColorClassName="text-purple-600 dark:text-purple-400"
        onClick={() => navigate('/cards')}
      />

      <StatCard
        label="Limite Total"
        value={hideValues ? 'R$ ••••' : `R$ ${totalLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={DollarSign}
        iconBgClassName="bg-green-100 dark:bg-green-900"
        iconColorClassName="text-green-600 dark:text-green-400"
      />

      <StatCard
        label="Gasto do Mês"
        value={hideValues ? 'R$ ••••' : `R$ ${currentMonthExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={TrendingDown}
        iconBgClassName="bg-red-100 dark:bg-red-900"
        iconColorClassName="text-red-600 dark:text-red-400"
      />

      <StatCard
        label="Assinaturas"
        value={
          hasSubscriptions ? (
            hideValues
              ? 'R$ ••••'
              : `R$ ${monthlySubTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          ) : (
            <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mt-1 md:mt-2">
              Gerenciar →
            </p>
          )
        }
        icon={Repeat}
        iconBgClassName="bg-purple-100 dark:bg-purple-900/40 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/70"
        iconColorClassName="text-purple-600 dark:text-purple-400"
        onClick={() => navigate('/settings/subscriptions')}
      />
    </div>
  )
}
