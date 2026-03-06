import { useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Plus, Nfc, ChevronLeft, ChevronRight } from 'lucide-react'
import type { CardWithBalance } from '../../types/database'
import { ScrollIndicator } from '../ui/scroll-indicator'

interface DashboardCardsListProps {
  cards: CardWithBalance[]
  hideValues: boolean
}

const DESKTOP_CARDS_PER_PAGE = 3

export function DashboardCardsList({ cards, hideValues }: DashboardCardsListProps) {
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
              const availableLimit = Number(card.available_balance)
              return (
                <button
                  key={card.card_id}
                  onClick={() => navigate(`/cards/${card.card_id}`)}
                  className="relative w-[85vw] sm:w-[350px] md:w-[calc((100%-2rem)/3)] shrink-0 snap-center cursor-pointer aspect-[1.586/1] rounded-2xl p-6 text-white shadow-xl transition-transform hover:scale-[1.02] hover:shadow-2xl overflow-hidden group text-left"
                  style={{
                    background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}dd 100%)`,
                    boxShadow: `0 4px 24px -8px ${card.color}80`,
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
                      <div className="absolute w-full h-[1px] bg-yellow-600/40 top-1/2 -translate-y-1/2" />
                      <div className="absolute h-full w-[1px] bg-yellow-600/40 left-1/2 -translate-x-1/2" />
                      <div className="w-8 h-6 border border-yellow-600/40 rounded-sm" />
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
                              {hideValues ? 'R$ ••••' : `R$ ${Number(card.card_limit).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider opacity-80 font-medium mb-0.5">Disponível</p>
                            <p className="font-bold text-lg tracking-tight drop-shadow-sm">
                              {hideValues ? 'R$ ••••' : `R$ ${availableLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
