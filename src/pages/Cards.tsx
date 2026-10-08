import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Plus, Star } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import { useAppStore } from '../store/app.store'
import type { CardWithBalance, MonthlyTotal } from '../types/database'
import { phpApiRequest } from '../lib/api'
import { HeaderAddButton, HideValuesButton, SectionTitle, TabContent, TabHeader } from '../components/app-header'
import { StatCard } from '../components/dashboard/d-stat-card'
import { SummaryCard } from '../components/summary-card'
import { Skeleton } from '../components/ui/skeleton'
import { Card } from '../components/ui/card'
import { EmptyState } from '../components/ui/misc'
import { AnimatedCurrency } from '../components/ui/animated-currency'
import { CreditCardTile } from '../components/cards/CreditCardTile'
import { useIsFirstVisitThisSession } from '../hooks/useFirstVisitThisSession'
import { usePrefsStore } from '../store/prefs.store'
import { CARD_RATIO } from '../lib/colors'
import { plural } from '../lib/format'

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
  const { user, isAuthenticated } = useAuthStore()
  const { setCards, monthlyTotals, setMonthlyTotals, orderedCards, cards } = useAppStore()

  const hadCacheRef = useRef(cards.length > 0)
  const animateOnMount = useIsFirstVisitThisSession('cards')

  const [isLoading, setIsLoading] = useState(cards.length === 0)
  const hideValues = usePrefsStore((state) => state.hideValues)

  const activeCards = orderedCards() as CardWithBalance[]

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
    <div className="min-h-screen bg-background">
      <TabHeader
        title="Cartões"
        right={(
          <>
            <HideValuesButton />
            <HeaderAddButton label="Novo cartão" onClick={() => navigate('/cards/new')} />
          </>
        )}
      />

      <TabContent>
        {isLoading ? (
          <>
            <div className="grid gap-3 md:gap-4 md:grid-cols-[2fr_1fr]">
              <Skeleton className="h-[116px] rounded-2xl" />
              <Skeleton className="h-[72px] md:h-[116px] rounded-2xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="w-full rounded-[20px]" style={{ aspectRatio: CARD_RATIO }} />
              ))}
            </div>
          </>
        ) : activeCards.length === 0 ? (
          <Card>
            <EmptyState
              icon={CreditCard}
              title="Você ainda não tem cartões cadastrados"
              actionLabel="Adicionar Primeiro Cartão"
              actionIcon={Plus}
              onAction={() => navigate('/cards/new')}
            />
          </Card>
        ) : (
          <>
            <div className="grid gap-3 md:gap-4 md:grid-cols-[2fr_1fr]">
              <SummaryCard
                icon={CreditCard}
                label="Total gasto em cartões"
                value={<AnimatedCurrency value={totalSpent} hide={hideValues} animateOnMount={animateOnMount} />}
                caption={`${activeCards.length} ${plural(activeCards.length, 'cartão ativo', 'cartões ativos')}`}
              />
              <StatCard label="Cartão mais usado" value={mostUsedCard?.card_name ?? '—'} icon={Star} color="var(--color-primary)" />
            </div>

            <SectionTitle title="Ativos" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeCards.map((card) => {
                const availableLimit = Number(card.available_balance) || 0
                const totalLimit = Number(card.card_limit) || 0
                const currentInvoiceAmount = getCurrentInvoiceAmount(card, monthlyTotals)

                const otherInvoices = Math.max(0, totalLimit - availableLimit - currentInvoiceAmount)
                const totalReference = Math.max(totalLimit, availableLimit + currentInvoiceAmount + otherInvoices) || 1

                const percCurrent = (currentInvoiceAmount / totalReference) * 100
                const percOther = (otherInvoices / totalReference) * 100

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
                    onClick={() => navigate(`/cards/${card.card_id}`)}
                    className="w-full"
                  />
                )
              })}
            </div>
          </>
        )}
      </TabContent>
    </div>
  )
}
