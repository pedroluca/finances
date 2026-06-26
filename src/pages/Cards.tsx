import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Plus, Star } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import { useAppStore } from '../store/app.store'
import type { CardWithBalance, MonthlyTotal } from '../types/database'
import { phpApiRequest } from '../lib/api'
import { DashboardHeader } from '../components/dashboard/d-header'
import { StatCard } from '../components/dashboard/d-stat-card'
import { Skeleton } from '../components/ui/skeleton'
import { AnimatedCurrency } from '../components/ui/animated-currency'
import { CreditCardTile } from '../components/cards/CreditCardTile'
import { useIsFirstVisitThisSession } from '../hooks/useFirstVisitThisSession'

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

  const hadCacheRef = useRef(cards.length > 0)
  const animateOnMount = useIsFirstVisitThisSession('cards')

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
        if (!hadCacheRef.current) setIsLoading(true)
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cartões</h1>

          {isLoading ? (
            <Skeleton className="h-9 w-24 rounded-lg" />
          ) : (
            <button
              onClick={() => navigate('/cards/new')}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Novo
            </button>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="rounded-2xl p-6 h-[104px]" />
        ) : activeCards.length > 0 && (
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-1">
              <CreditCard className="w-5 h-5 opacity-80" />
              <span className="text-purple-200 text-sm font-medium">Total gasto em cartões</span>
            </div>
            <p className="text-3xl font-bold"><AnimatedCurrency value={totalSpent} hide={hideValues} animateOnMount={animateOnMount} /></p>
            <p className="text-purple-300 text-sm mt-1">{activeCards.length} cart{activeCards.length !== 1 ? 'ões' : 'ão'} ativo{activeCards.length !== 1 ? 's' : ''}</p>
          </div>
        )}

        {isLoading && (
          <Skeleton className="h-[68px] rounded-xl" />
        )}

        {!isLoading && activeCards.length > 0 && (
          <StatCard
            label="Cartão mais usado"
            value={mostUsedCard?.card_name ?? '—'}
            icon={Star}
            iconBgClassName="bg-purple-100 dark:bg-purple-900"
            iconColorClassName="text-purple-600 dark:text-purple-400"
          />
        )}

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="w-full aspect-[2/1] sm:aspect-[2.2/1] rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && (activeCards.length === 0 ? (
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
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ativas</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <CreditCardTile
                    key={card.card_id}
                    card={card}
                    hideValues={hideValues}
                    animateOnMount={animateOnMount}
                    totalLimit={totalLimit}
                    currentInvoiceAmount={currentInvoiceAmount}
                    otherInvoices={otherInvoices}
                    availableLimit={availableLimit}
                    percCurrent={percCurrent}
                    percOther={percOther}
                    percAvailable={percAvailable}
                    onClick={() => navigate(`/cards/${card.card_id}`)}
                    className="w-full hover:scale-[1.01]"
                  />
                )
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
