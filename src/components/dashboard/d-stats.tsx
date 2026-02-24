import { CreditCard, DollarSign, TrendingDown } from 'lucide-react'

interface DashboardStatsProps {
  totalCards: number
  totalLimit: number
  currentMonthExpense: number
}

export function DashboardStats({ totalCards, totalLimit, currentMonthExpense }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-3 md:mb-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl col-span-full md:col-span-1 shadow-sm p-4 md:p-6 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total de Cartões
            </p>
            <p className="text-lg md:text-3xl font-bold text-gray-900 dark:text-white mt-1 md:mt-2">
              {totalCards}
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
              R$ {totalLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-10 md:w-12 h-10 md:h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
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
              R${' '}
              {currentMonthExpense.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="w-10 md:w-12 h-10 md:h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>
    </div>
  )
}
