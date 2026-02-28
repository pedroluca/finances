import { useNavigate } from 'react-router-dom'
import { Repeat, ChevronRight, RefreshCw } from 'lucide-react'
import type { Subscription } from '../../types/database'
import type { BillingCycle } from '../../types/database'

function toMonthlyEquivalent(amount: number, cycle?: BillingCycle): number {
  if (cycle === 'annual')     return amount / 12;
  if (cycle === 'semiannual') return amount / 6;
  return amount;
}

interface DashboardSubscriptionsProps {
  subscriptions: Subscription[]
  hideValues: boolean
}

export function DashboardSubscriptions({ subscriptions, hideValues }: DashboardSubscriptionsProps) {
  const navigate = useNavigate()

  const active = subscriptions.filter((s) => s.active)
  const hasSubscriptions = active.length > 0
  const monthlyTotal = active.reduce((sum, s) => sum + toMonthlyEquivalent(s.amount, s.billing_cycle), 0)

  // Pega a próxima renovação mais próxima
  const nextRenewal = hasSubscriptions
    ? active
        .map((s) => ({ ...s, ts: new Date(s.next_billing_date + 'T00:00:00').getTime() }))
        .sort((a, b) => a.ts - b.ts)[0]
    : null

  const daysUntil = nextRenewal
    ? Math.ceil((nextRenewal.ts - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <button
      onClick={() => navigate('/settings/subscriptions')}
      className="w-full text-left bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-6 transition-all hover:shadow-md cursor-pointer group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 md:w-12 h-10 md:h-12 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/60 transition-colors">
            <Repeat className="w-5 md:w-6 h-5 md:h-6 text-purple-600 dark:text-purple-400" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Assinaturas
            </p>

            {hasSubscriptions ? (
              <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white mt-0.5 leading-tight">
                {hideValues
                  ? 'R$ ••••'
                  : `R$ ${monthlyTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                <span className="text-xs font-normal text-gray-400 ml-1">/mês</span>
              </p>
            ) : (
              <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mt-0.5">
                Gerencie suas assinaturas →
              </p>
            )}

            {hasSubscriptions && nextRenewal && (
              <div className="flex items-center gap-1 mt-1">
                <RefreshCw className="w-3 h-3 text-gray-400" />
                <p className="text-xs text-gray-400 truncate">
                  {daysUntil !== null && daysUntil <= 0
                    ? `${nextRenewal.description} - hoje`
                    : daysUntil === 1
                    ? `${nextRenewal.description} - amanhã`
                    : `${nextRenewal.description} - em ${daysUntil}d`}
                </p>
              </div>
            )}
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors shrink-0 ml-2" />
      </div>
    </button>
  )
}
