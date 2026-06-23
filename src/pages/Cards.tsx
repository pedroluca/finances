import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Nfc, Plus, Star } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import { useAppStore } from '../store/app.store'
import type { CardWithBalance, MonthlyTotal } from '../types/database'
import { phpApiRequest } from '../lib/api'
import { DashboardHeader } from '../components/dashboard/d-header'
import { StatCard } from '../components/dashboard/d-stat-card'

function getCurrentInvoiceAmount(card: CardWithBalance, monthlyTotals: MonthlyTotal[]): number {
  const cardId = card.card_id ?? card.id
  if (!card.closing_day || !cardId || !monthlyTotals?.length) return 0

  const today = new Date()
  const todayDay = today.getDate()
  let currentInvoiceMonth = today.getMonth() + 1
  let currentInvoiceYear = today.getFullYear()

  if (todayDay > card.closing_day) {
    if (currentInvoiceMonth === 12) {
      currentInvoiceMonth = 1
      currentInvoiceYear += 1
    } else {
      currentInvoiceMonth += 1
    }
  }

  const invoiceTotal = monthlyTotals.find(
    (t) => t.card_id === cardId && t.reference_month === currentInvoiceMonth && t.reference_year === currentInvoiceYear,
  )

  return invoiceTotal?.user_unpaid_amount != null ? Number(invoiceTotal.user_unpaid_amount) : 0
}

export default function Cards() {
  const navigate = useNavigate()
  const { user, logout, isAuthenticated } = useAuthStore()
  const { setCards, monthlyTotals, setMonthlyTotals, orderedCards, cards } = useAppStore()

  const [isLoading, setIsLoading] = useState(cards.length === 0)
  const [hideValues, setHideValues] = useState(localStorage.getItem('hideValues') === 'true')

  const activeCards = orderedCards() as CardWithBalance[]

  const toggleHideValues = () => {
    setHideValues((prev) => !prev)
    localStorage.setItem('hideValues', String(!hideValues))
  }

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login')
      return
    }

    const loadData = async () => {
      try {
        setIsLoading(true)
        const [cardsData, monthlyTotalsData] = await Promise.all([
          phpApiRequest('cards.php', { method: 'GET' }),
          phpApiRequest('invoices.php?action=monthlyTotals', { method: 'GET' }),
        ])
        setCards(cardsData)
        setMonthlyTotals(monthlyTotalsData)
      } catch (error) {
        console.error('Erro ao carregar cartões:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isAuthenticated, user, navigate, setCards, setMonthlyTotals])

  const totalSpent = useMemo(
    () => activeCards.reduce((sum, card) => sum + getCurrentInvoiceAmount(card, monthlyTotals), 0),
    [activeCards, monthlyTotals],
  )

  const mostUsedCard = useMemo(() => {
    if (activeCards.length === 0) return null
    return [...activeCards].sort((a, b) => Number(b.current_debt ?? 0) - Number(a.current_debt ?? 0))[0]
  }, [activeCards])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors pb-16 lg:pb-0">
      <DashboardHeader
        userName={user?.name || ''}
        userEmail={user?.email || ''}
        onLogout={logout}
        hideValues={hideValues}
        onToggleHideValues={toggleHideValues}
      />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cartões</h1>

          <button
            onClick={() => navigate('/cards/new')}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Novo
          </button>
        </div>

        {!isLoading && activeCards.length > 0 && (
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-1">
              <CreditCard className="w-5 h-5 opacity-80" />
              <span className="text-purple-200 text-sm font-medium">Total gasto em cartões</span>
            </div>
            <p className="text-3xl font-bold">{hideValues ? 'R$ ••••' : `R$ ${totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p>
            <p className="text-purple-300 text-sm mt-1">{activeCards.length} cart{activeCards.length !== 1 ? 'ões' : 'ão'} ativo{activeCards.length !== 1 ? 's' : ''}</p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        )}

        {activeCards.length > 0 && (
          <StatCard
            label="Cartão mais usado"
            value={mostUsedCard?.card_name ?? '—'}
            icon={Star}
            iconBgClassName="bg-purple-100 dark:bg-purple-900"
            iconColorClassName="text-purple-600 dark:text-purple-400"
          />
        )}

        {activeCards.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ativas</h2>
            </div>
            {activeCards.map((card) => {
              const availableLimit = Number(card.available_balance) || 0
              const totalLimit = Number(card.card_limit) || 0
              const currentInvoiceAmount = getCurrentInvoiceAmount(card, monthlyTotals)

              const otherInvoices = Math.max(0, totalLimit - availableLimit - currentInvoiceAmount)
              const totalReference = Math.max(totalLimit, availableLimit + currentInvoiceAmount + otherInvoices) || 1

              const percCurrent = (currentInvoiceAmount / totalReference) * 100
              const percOther = (otherInvoices / totalReference) * 100
              const percAvailable = (availableLimit / totalReference) * 100

              return (
                <button
                  key={card.card_id}
                  onClick={() => navigate(`/cards/${card.card_id}`)}
                  className="relative w-full cursor-pointer aspect-[2/1] sm:aspect-[2.2/1] rounded-2xl p-5 md:p-6 text-white shadow-xl transition-transform hover:scale-[1.01] hover:shadow-2xl overflow-hidden group text-left block"
                  style={{
                    background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}dd 100%)`,
                    boxShadow: `0 4px 24px -8px ${card.color}80`,
                  }}
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-12 -mb-12 blur-2xl pointer-events-none" />

                  <div className="relative h-full flex flex-col justify-between z-10 w-full">
                    <div className="flex justify-between items-start w-full gap-2">
                      <h3 className="font-bold text-lg md:text-xl tracking-wide drop-shadow-md truncate">
                        {card.card_name}
                      </h3>
                      <Nfc className="w-6 h-6 md:w-8 md:h-8 opacity-80 shrink-0" />
                    </div>

                    <div className="w-10 h-7 md:w-12 md:h-9 bg-yellow-200/80 rounded-md border border-yellow-400/50 flex items-center justify-center overflow-hidden relative shadow-sm my-1 md:my-auto shrink-0">
                      <div className="absolute w-full h-[1px] bg-yellow-600/40 top-1/2 -translate-y-1/2" />
                      <div className="absolute h-full w-[1px] bg-yellow-600/40 left-1/2 -translate-x-1/2" />
                      <div className="w-6 h-4 md:w-8 md:h-6 border border-yellow-600/40 rounded-sm" />
                    </div>

                    <div className="mt-auto w-full">
                      {card.is_shared ? (
                        <div className="flex flex-col w-full">
                          <p className="text-[10px] uppercase tracking-wider opacity-80 font-medium mb-0.5">Compartilhado com</p>
                          <p className="font-bold text-lg tracking-tight drop-shadow-sm truncate w-full">
                            {card.owner_name}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 md:gap-2.5 mt-2 md:mt-0 w-full">
                          <div className="flex justify-between items-end w-full">
                            <p className="text-[10px] md:text-[11px] uppercase tracking-wider opacity-90 font-medium">Limite Total</p>
                            <p className="font-bold text-sm md:text-base tracking-tight drop-shadow-sm">
                              {hideValues ? 'R$ ••••' : `R$ ${totalLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </p>
                          </div>

                          <div className="w-full h-1.5 md:h-2 rounded-full border border-gray-300/60 drop-shadow-md flex overflow-hidden bg-black/20 shadow-inner">
                            <div style={{ width: `${percCurrent}%` }} className="bg-sky-400 h-full transition-all" />
                            <div style={{ width: `${percOther}%` }} className="bg-orange-400 h-full transition-all" />
                            <div style={{ width: `${percAvailable}%` }} className="bg-emerald-400 h-full transition-all" />
                          </div>

                          <div className="flex justify-between items-start text-[9px] md:text-[10px] uppercase tracking-wider opacity-100 font-medium w-full">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-sky-400 shadow-sm shrink-0" />
                                <span className="opacity-90">Atual</span>
                              </div>
                              <span className="font-bold text-[10px] md:text-xs normal-case drop-shadow-sm ml-[10px] md:ml-[12px]">
                                {hideValues ? '••••' : `R$ ${currentInvoiceAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                              </span>
                            </div>

                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1 justify-center">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-orange-400 shadow-sm shrink-0" />
                                <span className="opacity-90">Outras</span>
                              </div>
                              <span className="font-bold text-[10px] md:text-xs normal-case drop-shadow-sm ml-[10px] md:ml-[12px]">
                                {hideValues ? '••••' : `R$ ${otherInvoices.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                              </span>
                            </div>

                            <div className="flex flex-col gap-0.5 items-end">
                              <div className="flex items-center gap-1">
                                <span className="opacity-90">Disp.</span>
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-400 shadow-sm shrink-0" />
                              </div>
                              <span className="font-bold text-[10px] md:text-xs normal-case drop-shadow-sm mr-[10px] md:mr-[12px]">
                                {hideValues ? '••••' : `R$ ${availableLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
