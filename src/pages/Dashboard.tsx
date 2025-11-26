import { useEffect, useState, CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { useAppStore } from '../store/app.store'
import LogoImg from '../assets/logo.png'
import type { CardWithBalance } from '../types/database'
import {
  CreditCard,
  Plus,
  LogOut,
  Settings,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiHigh,
  Nfc,
} from 'lucide-react'
import { phpApiRequest } from '../lib/api'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout, isAuthenticated } = useAuthStore()
  const {
    cards,
    setCards,
    setCategories,
    setAuthors,
  } = useAppStore()
  const { monthlyTotals, setMonthlyTotals } = useAppStore()

  const [isLoading, setIsLoading] = useState(true)
  // cards agora vem da view card_available_balance
  const activeCards = (cards as CardWithBalance[]) // todos já são ativos na view

  const totalLimit = activeCards.reduce((sum, card) => sum + Number(card.card_limit ?? 0), 0)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login')
      return
    }

    const loadInitialData = async () => {
      if (!user) return
      try {
        setIsLoading(true)
        // Carregar dados em paralelo da nova API PHP
        const [cardsData, categoriesData, authorsData, monthlyTotalsData] = await Promise.all([
          phpApiRequest('cards.php', { method: 'GET' }),
          phpApiRequest('categories.php', { method: 'GET' }),
          phpApiRequest('authors.php', { method: 'GET' }),
          phpApiRequest('invoices.php?action=monthlyTotals', { method: 'GET' }),
        ])
        setCards(cardsData)
        setCategories(categoriesData)
        setAuthors(authorsData)
        setMonthlyTotals(monthlyTotalsData) // Set monthly totals correctly

        // Calcular total de faturas por cartão (simples)
        const totals: Record<number, number> = {}
        monthlyTotalsData.forEach((invoice: { cardId: number; total?: number; value?: number }) => {
          if (!totals[invoice.cardId]) {
            totals[invoice.cardId] = 0
          }
        })
  // totalLimit já é usado diretamente na renderização
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [isAuthenticated, user, navigate, setCards, setCategories, setAuthors, setMonthlyTotals])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Calcula o "Gasto do Mês" como a soma dos itens não pagos das faturas atuais
  const getCurrentMonthExpense = () => {
    if (!monthlyTotals || monthlyTotals.length === 0) return 0
    
    const today = new Date()
    const todayDay = today.getDate()
    const todayMonth = today.getMonth() + 1
    const todayYear = today.getFullYear()

    let totalExpense = 0

    activeCards.forEach((card) => {
      const closingDay = card.closing_day
      const cardId = card.card_id ?? card.id
      if (!closingDay || !cardId) return

      // Determina qual é o mês/ano da fatura atual deste cartão
      let currentInvoiceMonth = todayMonth
      let currentInvoiceYear = todayYear

      // Se já passou do dia de fechamento, a fatura atual é do próximo mês
      if (todayDay > closingDay) {
        if (todayMonth === 12) {
          currentInvoiceMonth = 1
          currentInvoiceYear = todayYear + 1
        } else {
          currentInvoiceMonth = todayMonth + 1
        }
      }

      // Busca o total não pago desta fatura específica (card_id + mês + ano)
      const invoiceTotal = monthlyTotals.find(
        (t) =>
          t.card_id === cardId &&
          t.reference_month === currentInvoiceMonth &&
          t.reference_year === currentInvoiceYear
      )

      if (invoiceTotal && invoiceTotal.unpaid_amount != null) {
        totalExpense += Number(invoiceTotal.unpaid_amount)
      }
    })

    return totalExpense
  }

  const currentMonthExpense = isLoading ? 0 : getCurrentMonthExpense()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg flex items-center justify-center">
                <img src={LogoImg} alt="Finances" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Finances
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Olá, {user?.name}!</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 text-gray-600 cursor-pointer dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center cursor-pointer gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total de Cartões
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {activeCards.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Limite Total
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  R$ {totalLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Gasto do Mês
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  R${' '}
                  {currentMonthExpense.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Cards List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Meus Cartões
            </h2>
            <button
              onClick={() => navigate('/cards/new')}
              className="flex cursor-pointer items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
            >
              <Plus className="w-5 h-5" />
              <span>Novo Cartão</span>
            </button>
          </div>

          {activeCards.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Você ainda não tem cartões cadastrados
              </p>
              <button
                onClick={() => navigate('/cards/new')}
                className="inline-flex cursor-pointer items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <Plus className="w-5 h-5" />
                <span>Adicionar Primeiro Cartão</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeCards.map((card) => {
                // card vem da view card_available_balance
                const availableLimit = Number(card.available_balance)
                return (
                  <button
                    key={card.card_id}
                    onClick={() => navigate(`/cards/${card.card_id}`)}
                    className="relative w-full cursor-pointer aspect-[1.586/1] rounded-2xl p-6 text-white shadow-xl transition-transform hover:scale-[1.02] hover:shadow-2xl overflow-hidden group text-left"
                    style={{
                      background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}dd 100%)`,
                      boxShadow: `0 4px 24px -8px ${card.color}80`
                    }}
                  >
                    {/* Decorative Background Circles */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-12 -mb-12 blur-2xl pointer-events-none" />

                    <div className="relative h-full flex flex-col justify-between z-10">
                      {/* Header */}
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-xl tracking-wide drop-shadow-md">
                          {card.card_name}
                        </h3>
                        <Nfc className="w-8 h-8 opacity-80" />
                      </div>

                      {/* Chip */}
                      <div className="w-12 h-9 bg-yellow-200/80 rounded-md border border-yellow-400/50 flex items-center justify-center overflow-hidden relative shadow-sm">
                          <div className="absolute w-full h-[1px] bg-yellow-600/40 top-1/2 -translate-y-1/2"></div>
                          <div className="absolute h-full w-[1px] bg-yellow-600/40 left-1/2 -translate-x-1/2"></div>
                          <div className="w-8 h-6 border border-yellow-600/40 rounded-sm"></div>
                      </div>

                      {/* Footer / Limits */}
                      <div className="grid grid-cols-2 gap-4 mt-auto">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider opacity-80 font-medium mb-0.5">Limite Total</p>
                          <p className="font-bold text-lg tracking-tight drop-shadow-sm">
                            R$ {Number(card.card_limit).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider opacity-80 font-medium mb-0.5">Disponível</p>
                          <p className="font-bold text-lg tracking-tight drop-shadow-sm">
                            R$ {availableLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Months */}
        {monthlyTotals.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Últimos Meses
            </h2>
            <div className="space-y-3">
              {monthlyTotals.map((total, idx) => (
                <div
                  key={`${total.reference_year}-${total.reference_month}-${idx}`}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900 capitalize dark:text-white">
                      {new Date(
                        total.reference_year,
                        total.reference_month - 1
                      ).toLocaleDateString('pt-BR', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Cartão {total.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      R${' '}
                      {(total.total_amount || 0).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Pago: R${' '}
                      {(total.paid_amount || 0).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
