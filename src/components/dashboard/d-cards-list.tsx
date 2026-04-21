import { useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Plus, Nfc, ChevronLeft, ChevronRight } from 'lucide-react'
import type { CardWithBalance, MonthlyTotal } from '../../types/database'
import { ScrollIndicator } from '../ui/scroll-indicator'

interface DashboardCardsListProps {
  cards: CardWithBalance[]
  monthlyTotals: MonthlyTotal[]
  hideValues: boolean
}

const DESKTOP_CARDS_PER_PAGE = 3

export function DashboardCardsList({ cards, monthlyTotals, hideValues }: DashboardCardsListProps) {
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
          onClick={() => navigate('/cards/new')}
          className="flex cursor-pointer items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          <span>Novo Cartão</span>
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
            className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide"
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
                <button
                  key={card.card_id}
                  onClick={() => navigate(`/cards/${card.card_id}`)}
                  className="relative w-[85vw] sm:w-[350px] md:w-[calc((100%-2rem)/3)] shrink-0 snap-center cursor-pointer aspect-[1.586/1] rounded-2xl p-5 md:p-6 text-white shadow-xl transition-transform hover:scale-[1.02] hover:shadow-2xl overflow-hidden group text-left block"
                  style={{
                    background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}dd 100%)`,
                    boxShadow: `0 4px 24px -8px ${card.color}80`,
                  }}
                >
                  {/* Decorative Background Circles */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-12 -mb-12 blur-2xl pointer-events-none" />

                  <div className="relative h-full flex flex-col justify-between z-10 w-full">
                    {/* Header */}
                    <div className="flex justify-between items-start w-full gap-2">
                      <h3 className="font-bold text-lg md:text-xl tracking-wide drop-shadow-md truncate">
                        {card.card_name}
                      </h3>
                      <Nfc className="w-6 h-6 md:w-8 md:h-8 opacity-80 shrink-0" />
                    </div>

                    {/* Chip */}
                    <div className="w-10 h-7 md:w-12 md:h-9 bg-yellow-200/80 rounded-md border border-yellow-400/50 flex items-center justify-center overflow-hidden relative shadow-sm my-1 md:my-auto shrink-0">
                      <div className="absolute w-full h-[1px] bg-yellow-600/40 top-1/2 -translate-y-1/2" />
                      <div className="absolute h-full w-[1px] bg-yellow-600/40 left-1/2 -translate-x-1/2" />
                      <div className="w-6 h-4 md:w-8 md:h-6 border border-yellow-600/40 rounded-sm" />
                    </div>

                    {/* Footer / Limits */}
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
                          {/* Top Legend: Total Limit */}
                          <div className="flex justify-between items-end w-full">
                            <p className="text-[10px] md:text-[11px] uppercase tracking-wider opacity-90 font-medium">Limite Total</p>
                            <p className="font-bold text-sm md:text-base tracking-tight drop-shadow-sm">
                              {hideValues ? 'R$ ••••' : `R$ ${totalLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </p>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-1.5 md:h-2 rounded-full border border-gray-300/60 drop-shadow-md flex overflow-hidden bg-black/20 shadow-inner">
                            <div style={{ width: `${percCurrent}%` }} className="bg-sky-400 h-full transition-all" />
                            <div style={{ width: `${percOther}%` }} className="bg-orange-400 h-full transition-all" />
                            <div style={{ width: `${percAvailable}%` }} className="bg-emerald-400 h-full transition-all" />
                          </div>

                          {/* Values Legend */}
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

          {/* Mobile: 1 dot por cartão */}
          <div className="md:hidden mt-4 flex justify-center">
            <ScrollIndicator
              total={cards.length}
              current={currentCardIndex}
              onSelect={scrollToCard}
            />
          </div>

          {/* Desktop: todos os dots, os 3 visíveis ficam destacados simultaneamente */}
          {cards.length > DESKTOP_CARDS_PER_PAGE && (
            <div className="hidden md:flex mt-4 justify-center items-center gap-2">
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
