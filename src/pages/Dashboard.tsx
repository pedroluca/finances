import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { useAppStore } from '../store/app.store'
import type { CardWithBalance } from '../types/database'
import {
  CreditCard,
  Plus,
  DollarSign,
  TrendingDown,
  Nfc,
  CalendarClock,
  CheckCircle2,
} from 'lucide-react'
import { phpApiRequest } from '../lib/api'
import { DashboardHeader } from '../components/dashboard/d-header'
import { ScrollIndicator } from '../components/ui/scroll-indicator'
import { useRef } from 'react'

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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [paymentFilter, setPaymentFilter] = useState<number | null>(15)
  const cardsContainerRef = useRef<HTMLDivElement>(null)

  const scrollToCard = (index: number) => {
    if (!cardsContainerRef.current) return
    const container = cardsContainerRef.current
    const cardWidth = container.children[0]?.clientWidth || 0
    const gap = 16 // gap-4 is 1rem (16px) inside flex
    
    container.scrollTo({
        left: index * (cardWidth + gap),
        behavior: 'smooth'
    })
    setCurrentCardIndex(index)
  }

  // cards agora vem da view card_available_balance
  const activeCards = (cards as CardWithBalance[]) // todos já são ativos na view

  const totalLimit = activeCards
    .filter((card) => !card.is_shared)
    .reduce((sum, card) => sum + Number(card.card_limit ?? 0), 0)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login')
      return
    }

    const loadInitialData = async () => {
      if (!user?.id) return // Garantir que temos o user.id correto
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

        const totals: Record<number, number> = {}
        monthlyTotalsData.forEach((invoice: { cardId: number; total?: number; value?: number }) => {
          if (!totals[invoice.cardId]) {
            totals[invoice.cardId] = 0
          }
        })
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [isAuthenticated, user?.id, navigate, setCards, setCategories, setAuthors, setMonthlyTotals]) // Mudado: user -> user?.id para evitar recarregar quando verifyAuth atualiza

  const handleLogout = () => {
    logout()
  }

  const getUpcomingPayments = (maxDays: number | null) => {
    if (!monthlyTotals || monthlyTotals.length === 0) return []

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const results: {
      cardId: number
      cardName: string
      cardColor: string
      unpaidAmount: number
      dueDate: Date
      isOverdue: boolean
      isDueToday: boolean
      isDueSoon: boolean
      diffDays: number
      referenceMonth: number
      referenceYear: number
    }[] = []

    activeCards.forEach((card) => {
      const cardId = card.card_id ?? card.id
      if (!cardId || !card.due_day) return

      // Pega todas as faturas deste cartão com valor pendente, ordena da mais antiga pra mais recente
      const pendingInvoices = monthlyTotals
        .filter((t) => t.card_id === cardId && Number(t.unpaid_amount) > 0)
        .sort((a, b) => {
          if (a.reference_year !== b.reference_year) return a.reference_year - b.reference_year
          return a.reference_month - b.reference_month
        })

      if (pendingInvoices.length === 0) return

      // Mostra a mais antiga com saldo devedor (prioridade de pagamento)
      const invoice = pendingInvoices[0]

      // Calcula data de vencimento: due_day do cartão no mês/ano da fatura
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

      // Filtro de período: vencidas sempre aparecem; futuras só se dentro do range
      if (maxDays !== null && diffDays > maxDays) return

      results.push({
        cardId,
        cardName: card.card_name,
        cardColor: card.color,
        unpaidAmount: Number(invoice.unpaid_amount),
        dueDate,
        isOverdue: diffDays < 0,
        isDueToday: diffDays === 0,
        isDueSoon: diffDays > 0 && diffDays <= 7,
        diffDays,
        referenceMonth: invoice.reference_month,
        referenceYear: invoice.reference_year,
      })
    })

    // Ordena: vencidas primeiro, depois por data de vencimento mais próxima
    return results.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
  }

  const upcomingPayments = isLoading ? [] : getUpcomingPayments(paymentFilter)

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
      <DashboardHeader
        userName={user?.name || ''}
        userEmail={user?.email || ''}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-3 md:mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl col-span-full md:col-span-1 shadow-sm p-4 md:p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total de Cartões
                </p>
                <p className="text-lg md:text-3xl font-bold text-gray-900 dark:text-white mt-1 md:mt-2">
                  {activeCards.length}
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

        {/* Cards List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-6 mb-4 md:mb-8 transition-colors">
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
            <div className="relative">
              <div 
                ref={cardsContainerRef}
                onScroll={(e) => {
                  const container = e.currentTarget
                  const scrollLeft = container.scrollLeft
                  const cardWidth = container.children[0]?.clientWidth || 0
                  const gap = 16 // gap-4 is 1rem (16px) inside flex
                  
                  // Calculate index based on scroll position + half card width for better snapping feel
                  const index = Math.round(scrollLeft / (cardWidth + gap))
                  setCurrentCardIndex(Math.min(activeCards.length - 1, Math.max(0, index)))
                }}
                className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-4 px-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:pb-0 md:mx-0 md:px-0 md:overflow-visible scrollbar-hide"
              >
              {activeCards.map((card) => {
                // card vem da view card_available_balance
                const availableLimit = Number(card.available_balance)
                return (
                  <button
                    key={card.card_id}
                    onClick={() => navigate(`/cards/${card.card_id}`)}
                    className="relative w-[85vw] sm:w-[350px] md:w-full shrink-0 snap-center cursor-pointer aspect-[1.586/1] rounded-2xl p-6 text-white shadow-xl transition-transform hover:scale-[1.02] hover:shadow-2xl overflow-hidden group text-left"
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
                        {card.is_shared ? (
                          <div className="col-span-2">
                            <p className="text-[10px] uppercase tracking-wider opacity-80 font-medium mb-0.5">Compartilhado com</p>
                            <p className="font-bold text-lg tracking-tight drop-shadow-sm truncate">
                              {card.owner_name}
                            </p>
                          </div>
                        ) : (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Scroll Indicator for Mobile */}
            <div className="md:hidden mt-4 flex justify-center">
              <ScrollIndicator 
                total={activeCards.length} 
                current={currentCardIndex}
                onSelect={scrollToCard}
              />
            </div>
          </div>
          )}
        </div>

        {/* Upcoming Payments */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-6 transition-colors">
          <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Próximos Pagamentos
            </h2>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {([{ label: 'Todos', value: null }, { label: '7d', value: 7 }, { label: '15d', value: 15 }, { label: '30d', value: 30 }] as { label: string; value: number | null }[]).map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => setPaymentFilter(value)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    paymentFilter === value
                      ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {upcomingPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
              <p className="font-medium text-gray-900 dark:text-white">Tudo em dia!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma pagamento pendente no momento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingPayments.map((payment) => {
                const diffDays = payment.diffDays
                return (
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
                        <p className="font-medium text-gray-900 dark:text-white leading-tight">
                          {payment.cardName}
                        </p>
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
                        <p className="font-semibold text-gray-900 dark:text-white">
                          R$ {payment.unpaidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        {payment.isOverdue && (
                          <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">Vencida</span>
                        )}
                        {payment.isDueToday && (
                          <span className="text-[11px] font-semibold text-orange-500 dark:text-orange-400">Vence hoje</span>
                        )}
                        {payment.isDueSoon && !payment.isDueToday && (
                          <span className="text-[11px] font-semibold text-yellow-600 dark:text-yellow-400">
                            {diffDays === 1 ? 'Amanhã' : `Em ${diffDays} dias`}
                          </span>
                        )}
                        {!payment.isOverdue && !payment.isDueToday && !payment.isDueSoon && (
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">
                            {diffDays === 1 ? 'Em 1 dia' : `Em ${diffDays} dias`}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
