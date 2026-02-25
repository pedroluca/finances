import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { useAppStore } from '../store/app.store'
import type { CardWithBalance } from '../types/database'
import { phpApiRequest } from '../lib/api'
import { DashboardHeader } from '../components/dashboard/d-header'
import { DashboardStats } from '../components/dashboard/d-stats'
import { DashboardCardsList } from '../components/dashboard/d-cards-list'
import { DashboardUpcomingPayments } from '../components/dashboard/d-upcoming-payments'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout, isAuthenticated } = useAuthStore()
  const { setCards, setCategories, setAuthors, monthlyTotals, setMonthlyTotals, setCardOrder, orderedCards } = useAppStore()

  const [isLoading, setIsLoading] = useState(true)
  const [hideValues, setHideValues] = useState(localStorage.getItem('hideValues') === 'true')

  const activeCards = orderedCards() as CardWithBalance[]

  const totalLimit = activeCards
    .filter((card) => !card.is_shared)
    .reduce((sum, card) => sum + Number(card.card_limit ?? 0), 0)

  const toggleHideValues = () => {
    setHideValues((prev) => !prev)
    localStorage.setItem('hideValues', String(!hideValues))
  }

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login')
      return
    }

    const loadInitialData = async () => {
      if (!user?.id) return
      try {
        setIsLoading(true)
        const [cardsData, categoriesData, authorsData, monthlyTotalsData, cardOrderData] = await Promise.all([
          phpApiRequest('cards.php', { method: 'GET' }),
          phpApiRequest('categories.php', { method: 'GET' }),
          phpApiRequest('authors.php', { method: 'GET' }),
          phpApiRequest('invoices.php?action=monthlyTotals', { method: 'GET' }),
          phpApiRequest(`card_order.php?user_id=${user?.id}`, { method: 'GET' }),
        ])
        setCards(cardsData)
        setCategories(categoriesData)
        setAuthors(authorsData)
        setMonthlyTotals(monthlyTotalsData)
        // cardOrderData = [{ card_id, position }]
        if (Array.isArray(cardOrderData) && cardOrderData.length > 0) {
          setCardOrder(cardOrderData.map((o: { card_id: number }) => o.card_id))
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [isAuthenticated, user?.id, navigate, setCards, setCategories, setAuthors, setMonthlyTotals])

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

      let currentInvoiceMonth = todayMonth
      let currentInvoiceYear = todayYear

      if (todayDay > closingDay) {
        if (todayMonth === 12) {
          currentInvoiceMonth = 1
          currentInvoiceYear = todayYear + 1
        } else {
          currentInvoiceMonth = todayMonth + 1
        }
      }

      const invoiceTotal = monthlyTotals.find(
        (t) =>
          t.card_id === cardId &&
          t.reference_month === currentInvoiceMonth &&
          t.reference_year === currentInvoiceYear,
      )

      // Usa a porção do usuário (user_unpaid_amount) para incluir compartilhados corretamente
      if (invoiceTotal && invoiceTotal.user_unpaid_amount != null) {
        totalExpense += Number(invoiceTotal.user_unpaid_amount)
      }

    })

    return totalExpense
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <DashboardHeader
        userName={user?.name || ''}
        userEmail={user?.email || ''}
        onLogout={logout}
        hideValues={hideValues}
        onToggleHideValues={toggleHideValues}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardStats
          totalCards={activeCards.length}
          totalLimit={totalLimit}
          currentMonthExpense={getCurrentMonthExpense()}
          hideValues={hideValues}
        />

        <DashboardCardsList cards={activeCards} hideValues={hideValues} />

        <DashboardUpcomingPayments
          cards={activeCards}
          monthlyTotals={monthlyTotals}
          hideValues={hideValues}
        />
      </main>
    </div>
  )
}
