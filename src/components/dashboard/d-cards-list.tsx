import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CreditCard, Plus } from 'lucide-react'
import type { CardWithBalance, MonthlyTotal } from '../../types/database'
import { ScrollIndicator } from '../ui/scroll-indicator'
import { CreditCardTile } from '../cards/CreditCardTile'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { IconButton } from '../ui/icon-button'
import { EmptyState } from '../ui/misc'
import { cn } from '../../lib/cn'

interface DashboardCardsListProps {
  cards: CardWithBalance[]
  monthlyTotals: MonthlyTotal[]
  hideValues: boolean
  animateOnMount: boolean
}

/** Medidas do carrossel: largura de um passo (cartão + espaço) e quantos cabem por vez */
function measure(container: HTMLDivElement) {
  const gap = parseFloat(getComputedStyle(container).columnGap) || 0
  const step = (container.children[0]?.clientWidth || 0) + gap
  const perPage = step ? Math.max(1, Math.round((container.clientWidth + gap) / step)) : 1
  return { step, perPage }
}

/**
 * "Meus Cartões": carrossel com encaixe por cartão. No celular o próximo aparece na borda
 * (indicando que dá para arrastar); no tablet/desktop cabem 2 ou 3 por vez, com setas.
 */
export function DashboardCardsList({ cards, monthlyTotals, hideValues, animateOnMount }: DashboardCardsListProps) {
  const navigate = useNavigate()
  // Índice do primeiro cartão visível
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [perPage, setPerPage] = useState(1)
  const cardsContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = cardsContainerRef.current
    if (!container) return
    const update = () => setPerPage(measure(container).perPage)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(container)
    return () => observer.disconnect()
  }, [cards.length])

  const scrollToCard = useCallback((index: number) => {
    const container = cardsContainerRef.current
    if (!container) return
    container.scrollTo({ left: index * measure(container).step, behavior: 'smooth' })
    setCurrentCardIndex(index)
  }, [])

  const maxStart = Math.max(0, cards.length - perPage)
  const canGoPrev = currentCardIndex > 0
  const canGoNext = currentCardIndex < maxStart
  const visibleEnd = Math.min(currentCardIndex + perPage - 1, cards.length - 1)

  return (
    <Card className="pt-4 pb-2 md:pt-5 md:pb-3 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 md:px-5 mb-3">
        <h2 className="text-lg font-semibold text-foreground">Meus Cartões</h2>
        <div className="flex items-center gap-2">
          {perPage > 1 && cards.length > perPage && (
            <div className="flex items-center gap-1">
              <IconButton icon={ChevronLeft} label="Cartões anteriores" variant="surface" size={36} iconSize={18} disabled={!canGoPrev} onClick={() => scrollToCard(Math.max(0, currentCardIndex - perPage))} />
              <IconButton icon={ChevronRight} label="Próximos cartões" variant="surface" size={36} iconSize={18} disabled={!canGoNext} onClick={() => scrollToCard(Math.min(maxStart, currentCardIndex + perPage))} />
            </div>
          )}
          <Button label="Ver todos" variant="outline" size="sm" onClick={() => navigate('/cards')} />
        </div>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Você ainda não tem cartões cadastrados"
          actionLabel="Adicionar Primeiro Cartão"
          actionIcon={Plus}
          onAction={() => navigate('/cards/new')}
          className="py-6"
        />
      ) : (
        <>
          <div
            ref={cardsContainerRef}
            onScroll={(event) => {
              const container = event.currentTarget
              const { step } = measure(container)
              if (!step) return
              const index = Math.round(container.scrollLeft / step)
              setCurrentCardIndex(Math.min(cards.length - 1, Math.max(0, index)))
            }}
            className="flex overflow-x-auto snap-x snap-mandatory scroll-px-4 md:scroll-px-0 gap-3.5 md:gap-4 px-4 md:px-0 md:mx-5 pt-1 pb-7 scrollbar-hide"
          >
            {cards.map((card) => {
              const availableLimit = Number(card.available_balance) || 0
              const totalLimit = Number(card.card_limit) || 0

              let currentInvoiceAmount = 0
              const today = new Date()
              const todayDay = today.getDate()
              const todayMonth = today.getMonth() + 1
              const todayYear = today.getFullYear()

              const cardId = card.card_id ?? card.id

              if (card.closing_day && cardId && monthlyTotals?.length > 0) {
                let currentInvoiceMonth = todayMonth
                let currentInvoiceYear = todayYear

                if (todayDay > card.closing_day) {
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

                if (invoiceTotal && invoiceTotal.unpaid_amount != null) {
                  currentInvoiceAmount = Number(invoiceTotal.unpaid_amount)
                }
              }

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
                  className={cn(
                    'shrink-0 snap-start',
                    // Celular: o próximo cartão aparece na borda; tablet: 2 por vez; desktop: 3
                    cards.length > 1 ? 'w-[calc(100%-18px)]' : 'w-full',
                    'max-w-[400px] md:max-w-none md:w-[calc((100%-1rem)/2)] xl:w-[calc((100%-2rem)/3)]',
                  )}
                />
              )
            })}
          </div>

          {perPage === 1 ? (
            <div className="flex justify-center -mt-2">
              <ScrollIndicator total={cards.length} current={currentCardIndex} onSelect={scrollToCard} />
            </div>
          ) : cards.length > perPage && (
            // Tablet/desktop: um ponto por cartão, com os visíveis destacados juntos
            <div className="flex justify-center items-center -mt-2">
              {cards.map((card, index) => {
                const isVisible = index >= currentCardIndex && index <= visibleEnd
                return (
                  <button
                    key={card.card_id}
                    type="button"
                    onClick={() => scrollToCard(Math.min(maxStart, index))}
                    className="w-[22px] h-3 flex items-center justify-center"
                    aria-label={`Ir para o cartão ${index + 1}`}
                  >
                    <span className={cn('h-2 rounded-full transition-all duration-300', isVisible ? 'w-5 bg-primary' : 'w-2 bg-primary/30 hover:bg-primary/50')} />
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </Card>
  )
}
