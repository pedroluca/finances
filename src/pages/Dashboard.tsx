import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { useAppStore } from '../store/app.store'
import type { CardWithBalance } from '../types/database'
import { phpApiRequest } from '../lib/api'
import { HideValuesButton, ProfileButton, TabContent, TabHeader } from '../components/app-header'
import { DashboardStats } from '../components/dashboard/d-stats'
import { DashboardCardsList } from '../components/dashboard/d-cards-list'
import { DashboardUpcomingPayments } from '../components/dashboard/d-upcoming-payments'
import { DashboardSkeleton } from '../components/dashboard/d-skeleton'
import { InstallAppBanner } from '../components/InstallAppBanner'
import { OnboardingModal } from '../components/OnboardingModal'
import { useIsFirstVisitThisSession } from '../hooks/useFirstVisitThisSession'
import { usePrefsStore } from '../store/prefs.store'
import { weekdayLabel } from '../lib/format'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, isAuthenticated, completeOnboarding } = useAuthStore()
  const showOnboarding = isAuthenticated && user?.onboarding_completed === false
  const {
    cards, setCards, setCategories, setAuthors, monthlyTotals, setMonthlyTotals, setCardOrder, orderedCards, authors,
    bills, setBills, subscriptions, setSubscriptions,
  } = useAppStore()

  const hadCacheRef = useRef(cards.length > 0)
  const animateOnMount = useIsFirstVisitThisSession('dashboard')

  const [isLoading, setIsLoading] = useState(cards.length === 0)
  const hideValues = usePrefsStore((state) => state.hideValues)

  const activeCards = orderedCards() as CardWithBalance[]
  const ownerAuthor = authors.find((a) => a.is_owner)
  const ownerAuthorId = ownerAuthor?.id

  const totalLimit = activeCards
    .filter((card) => !card.is_shared)
    .reduce((sum, card) => sum + Number(card.card_limit ?? 0), 0)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login')
      return
    }

    const loadInitialData = async () => {
      if (!user?.id) return
      try {
        if (!hadCacheRef.current) setIsLoading(true)
        const [cardsData, categoriesData, authorsData, monthlyTotalsData, cardOrderData, subsData, billsData] = await Promise.all([
          phpApiRequest('cards.php', { method: 'GET' }),
          phpApiRequest('categories.php', { method: 'GET' }),
          phpApiRequest('authors.php', { method: 'GET' }),
          phpApiRequest('invoices.php?action=monthlyTotals', { method: 'GET' }),
          phpApiRequest(`card_order.php?user_id=${user?.id}`, { method: 'GET' }),
          phpApiRequest(`subscriptions.php?user_id=${user?.id}`, { method: 'GET' }),
          phpApiRequest(`bills.php?user_id=${user?.id}`, { method: 'GET' }),
        ])
        setCards(cardsData)
        setCategories(categoriesData)
        setAuthors(authorsData)
        setMonthlyTotals(monthlyTotalsData)
        if (subsData?.success) setSubscriptions(subsData.data ?? [])
        if (billsData?.success) setBills(billsData.data ?? [])
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
  }, [isAuthenticated, user, navigate, setCards, setCategories, setAuthors, setMonthlyTotals, setCardOrder, setSubscriptions, setBills])

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

    bills.forEach((bill) => {
      if (!bill.active) return
      if (ownerAuthorId != null && bill.author_id != null && bill.author_id !== ownerAuthorId) return

      // Mesma regra de ciclo vigente usada no backend (recurring_lib.php): se o
      // vencimento deste mês já passou, a cobrança relevante é a do mês seguinte.
      let cycleMonth = todayMonth
      let cycleYear = todayYear
      if (todayDay > bill.due_day) {
        if (cycleMonth === 12) {
          cycleMonth = 1
          cycleYear += 1
        } else {
          cycleMonth += 1
        }
      }

      const charge = (bill.charges ?? []).find(
        (c) => c.reference_month === cycleMonth && c.reference_year === cycleYear,
      )
      if (!charge) return

      const amount = charge.is_paid ? charge.paid_amount : charge.amount
      if (amount != null) totalExpense += Number(amount)
    })

    return totalExpense
  }

  const firstName = user?.name?.trim().split(' ')[0] ?? ''

  return (
    <div className="min-h-screen bg-background">
      <TabHeader
        title={firstName ? `Olá, ${firstName}` : 'Olá!'}
        subtitle={weekdayLabel()}
        right={(
          <>
            <HideValuesButton />
            <ProfileButton />
          </>
        )}
      />

      <TabContent>
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <DashboardStats
              totalCards={activeCards.length}
              totalLimit={totalLimit}
              currentMonthExpense={getCurrentMonthExpense()}
              hideValues={hideValues}
              subscriptions={subscriptions}
              ownerAuthorId={ownerAuthorId}
              animateOnMount={animateOnMount}
            />

            <DashboardCardsList cards={activeCards} hideValues={hideValues} monthlyTotals={monthlyTotals} animateOnMount={animateOnMount} />

            <DashboardUpcomingPayments
              cards={activeCards}
              monthlyTotals={monthlyTotals}
              bills={bills}
              hideValues={hideValues}
            />
          </>
        )}
      </TabContent>

      {showOnboarding && <OnboardingModal onComplete={completeOnboarding} />}

      {!showOnboarding && <InstallAppBanner />}
    </div>
  )
}
