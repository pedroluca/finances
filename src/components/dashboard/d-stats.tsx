import { useNavigate } from 'react-router-dom'
import { CreditCard, DollarSign, TrendingDown, Repeat } from 'lucide-react'
import type { Subscription, BillingCycle } from '../../types/database'
import { StatCard, StatValue } from './d-stat-card'
import { accents } from '../../lib/colors'
import { AnimatedCurrency } from '../ui/animated-currency'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'

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
  animateOnMount: boolean
}

export function DashboardStats({ totalCards, totalLimit, currentMonthExpense, hideValues, subscriptions, ownerAuthorId, animateOnMount }: DashboardStatsProps) {
  const navigate = useNavigate()
  const animatedTotalCards = Math.round(useAnimatedNumber(totalCards, { animateOnMount }))

  const activeSubscriptions = subscriptions.filter((s) =>
    s.active &&
    !s.paused &&
    (ownerAuthorId == null || s.author_id === ownerAuthorId)
  )
  const monthlySubTotal = activeSubscriptions.reduce((sum, s) => sum + toMonthlyEquivalent(s.amount, s.billing_cycle), 0)
  const hasSubscriptions = activeSubscriptions.length > 0

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
      <StatCard label="Cartões" value={animatedTotalCards} icon={CreditCard} color="var(--color-primary)" onClick={() => navigate('/cards')} />

      <StatCard
        label="Limite Total"
        value={<StatValue><AnimatedCurrency value={totalLimit} hide={hideValues} animateOnMount={animateOnMount} /></StatValue>}
        icon={DollarSign}
        color={accents.green}
      />

      <StatCard
        label="Gasto do Mês"
        value={<StatValue><AnimatedCurrency value={currentMonthExpense} hide={hideValues} animateOnMount={animateOnMount} /></StatValue>}
        icon={TrendingDown}
        color={accents.red}
      />

      <StatCard
        label="Assinaturas"
        value={
          hasSubscriptions ? (
            <StatValue><AnimatedCurrency value={monthlySubTotal} hide={hideValues} animateOnMount={animateOnMount} /></StatValue>
          ) : (
            <p className="text-sm font-semibold text-primary">Gerenciar →</p>
          )
        }
        icon={Repeat}
        color={accents.violet}
        onClick={() => navigate('/settings/subscriptions')}
      />
    </div>
  )
}
