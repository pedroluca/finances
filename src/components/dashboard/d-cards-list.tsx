import { useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import type { CardWithBalance, MonthlyTotal } from '../../types/database'
import { ScrollIndicator } from '../ui/scroll-indicator'
import { CreditCardTile } from '../cards/CreditCardTile'

interface DashboardCardsListProps {
  cards: CardWithBalance[]
  monthlyTotals: MonthlyTotal[]
  hideValues: boolean
  animateOnMount: boolean
}

const DESKTOP_CARDS_PER_PAGE = 3

export function DashboardCardsList({ cards, monthlyTotals, hideValues, animateOnMount }: DashboardCardsListProps) {
  const navigate = useNavigate()
  // mobile: índice do cartão atual | desktop: índice do primeiro cartão da página
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const cardsContainerRef = useRef<HTMLDivElement>(null)

  const scrollToCard = useCallback((index: number) => {
    if (!cardsContainerRef.current) return
    const container = cardsContainerRef.current
    const cardWidth = container.children[0]?.clientWidth || 0
    const gap = 16

    container.scrollTo({
      left: index * (cardWidth + gap),
      behavior: 'smooth',
    })
    setCurrentCardIndex(index)
  }, [])

  // Índices dos 3 cartões atualmente visíveis no desktop
  const visibleStart = currentCardIndex
  const visibleEnd = Math.min(currentCardIndex + DESKTOP_CARDS_PER_PAGE - 1, cards.length - 1)

  const canGoPrev = currentCardIndex > 0
  const canGoNext = currentCardIndex + DESKTOP_CARDS_PER_PAGE < cards.length

  const goToPrevPage = () => {
    scrollToCard(Math.max(0, currentCardIndex - DESKTOP_CARDS_PER_PAGE))
  }

  const goToNextPage = () => {
    // Garante que o último grupo sempre mostra exatamente 3 cartões
    const maxStart = Math.max(0, cards.length - DESKTOP_CARDS_PER_PAGE)
    scrollToCard(Math.min(maxStart, currentCardIndex + DESKTOP_CARDS_PER_PAGE))
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-6 mb-3 md:mb-6 transition-colors">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Meus Cartões
        </h2>
        <button
          onClick={() => navigate('/cards')}
          className="flex cursor-pointer items-center gap-2 px-4 py-1 text-sm border border-purple-700 bg-purple-700/10 text-purple-500 rounded-md transition"
        >
          <span>Ver todos</span>
        </button>
      </div>

      {cards.length === 0 ? (
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
          {/* Botões de seta — visíveis apenas no desktop e se tiver mais de 3 cartões */}
          {cards.length > DESKTOP_CARDS_PER_PAGE && (
            <>
              <button
                onClick={goToPrevPage}
                disabled={!canGoPrev}
                className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-gray-700 shadow-md border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Cartões anteriores"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goToNextPage}
                disabled={!canGoNext}
                className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-gray-700 shadow-md border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Próximos cartões"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Container de cartões */}
          <div
            ref={cardsContainerRef}
            onScroll={(e) => {
              const container = e.currentTarget
              const scrollLeft = container.scrollLeft
              const cardWidth = container.children[0]?.clientWidth || 0
              const gap = 16
              const index = Math.round(scrollLeft / (cardWidth + gap))
              setCurrentCardIndex(Math.min(cards.length - 1, Math.max(0, index)))
            }}
            className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide"
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
                  className="w-[85vw] sm:w-[350px] md:w-[calc((100%-2rem)/3)] shrink-0 snap-center aspect-[1.586/1] hover:scale-[1.02]"
                />
              )
            })}
          </div>

          {/* Mobile: 1 dot por cartão */}
          <div className="md:hidden flex justify-center">
            <ScrollIndicator
              total={cards.length}
              current={currentCardIndex}
              onSelect={scrollToCard}
            />
          </div>

          {/* Desktop: todos os dots, os 3 visíveis ficam destacados simultaneamente */}
          {cards.length > DESKTOP_CARDS_PER_PAGE && (
            <div className="hidden md:flex justify-center items-center gap-2">
              {Array.from({ length: cards.length }, (_, i) => {
                const isActive = i >= visibleStart && i <= visibleEnd
                return (
                  <button
                    key={i}
                    onClick={() => scrollToCard(i)}
                    className={`h-3 transition-all duration-300 ease-in-out cursor-pointer rounded-sm outline-none focus:outline-none ${
                      isActive
                        ? 'w-6 bg-purple-600 opacity-100'
                        : 'w-3 bg-purple-200/50 hover:bg-purple-300/50'
                    }`}
                    aria-label={`Ir para cartão ${i + 1}`}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
