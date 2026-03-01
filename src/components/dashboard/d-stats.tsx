import { useNavigate } from 'react-router-dom'
import { CreditCard, DollarSign, TrendingDown, Repeat } from 'lucide-react'
import type { Subscription, BillingCycle } from '../../types/database'

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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-6 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total de Cartões
            </p>
            <p className="text-lg md:text-3xl font-bold text-gray-900 dark:text-white mt-1 md:mt-2">
              {totalCards}
            </p>
          </div>
          <div className="w-10 md:w-12 h-10 md:h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <CreditCard className="w-5 md:w-6 h-5 md:h-6 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-6 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Limite Total
            </p>
            <p className="text-lg md:text-3xl font-bold text-gray-900 dark:text-white mt-1 md:mt-2">
              {hideValues ? 'R$ ••••' : `R$ ${totalLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
          </div>
          <div className="w-10 md:w-12 h-10 md:h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
            <DollarSign className="w-5 md:w-6 h-5 md:h-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-6 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Gasto do Mês
            </p>
            <p className="text-lg md:text-3xl font-bold text-gray-900 dark:text-white mt-1 md:mt-2">
              {hideValues
                ? 'R$ ••••'
                : `R$ ${currentMonthExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
          </div>
          <div className="w-10 md:w-12 h-10 md:h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
            <TrendingDown className="w-5 md:w-6 h-5 md:h-6 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>

      {/* Card de Assinaturas */}
      <button
        onClick={() => navigate('/settings/subscriptions')}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-6 transition-all hover:shadow-md text-left cursor-pointer group"
      >
        <div className="flex items-center justify-between h-full">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Gasto em Assinaturas
            </p>
            {hasSubscriptions ? (
              <p className="text-lg md:text-3xl font-bold text-gray-900 dark:text-white mt-1 md:mt-2 truncate">
                {hideValues
                  ? 'R$ ••••'
                  : `R$ ${monthlySubTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </p>
            ) : (
              <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mt-1 md:mt-2">
                Gerenciar →
              </p>
            )}
          </div>
          <div className="w-10 md:w-12 h-10 md:h-12 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center shrink-0 ml-2 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/70 transition-colors">
            <Repeat className="w-5 md:w-6 h-5 md:h-6 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </button>
    </div>
  )
}
