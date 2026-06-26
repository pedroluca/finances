import { useNavigate } from 'react-router-dom'
import { CreditCard, DollarSign, TrendingDown, Repeat } from 'lucide-react'
import type { Subscription, BillingCycle } from '../../types/database'
import { StatCard } from './d-stat-card'
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-3 md:mb-6">
      <StatCard
        label="Cartões"
        value={animatedTotalCards}
        icon={CreditCard}
        iconBgClassName="bg-purple-100 dark:bg-purple-900"
        iconColorClassName="text-purple-600 dark:text-purple-400"
        onClick={() => navigate('/cards')}
      />

      <StatCard
        label="Limite Total"
        value={
          <p className="text-base md:text-xl font-bold text-gray-900 dark:text-white truncate">
            <AnimatedCurrency value={totalLimit} hide={hideValues} animateOnMount={animateOnMount} />
          </p>
        }
        icon={DollarSign}
        iconBgClassName="bg-green-100 dark:bg-green-900"
        iconColorClassName="text-green-600 dark:text-green-400"
      />

      <StatCard
        label="Gasto do Mês"
        value={
          <p className="text-base md:text-xl font-bold text-gray-900 dark:text-white truncate">
            <AnimatedCurrency value={currentMonthExpense} hide={hideValues} animateOnMount={animateOnMount} />
          </p>
        }
        icon={TrendingDown}
        iconBgClassName="bg-red-100 dark:bg-red-900"
        iconColorClassName="text-red-600 dark:text-red-400"
      />

      <StatCard
        label="Assinaturas"
        value={
          hasSubscriptions ? (
            <p className="text-base md:text-xl font-bold text-gray-900 dark:text-white truncate">
              <AnimatedCurrency value={monthlySubTotal} hide={hideValues} animateOnMount={animateOnMount} />
            </p>
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
