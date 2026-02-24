import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Plus, Nfc } from 'lucide-react'
import type { CardWithBalance } from '../../types/database'
import { ScrollIndicator } from '../ui/scroll-indicator'

interface DashboardCardsListProps {
  cards: CardWithBalance[]
}

export function DashboardCardsList({ cards }: DashboardCardsListProps) {
  const navigate = useNavigate()
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const cardsContainerRef = useRef<HTMLDivElement>(null)

  const scrollToCard = (index: number) => {
    if (!cardsContainerRef.current) return
    const container = cardsContainerRef.current
    const cardWidth = container.children[0]?.clientWidth || 0
    const gap = 16

    container.scrollTo({
      left: index * (cardWidth + gap),
      behavior: 'smooth',
    })
    setCurrentCardIndex(index)
  }

  return (
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
            className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-4 px-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:pb-0 md:mx-0 md:px-0 md:overflow-visible scrollbar-hide"
          >
            {cards.map((card) => {
              const availableLimit = Number(card.available_balance)
              return (
                <button
                  key={card.card_id}
                  onClick={() => navigate(`/cards/${card.card_id}`)}
                  className="relative w-[85vw] sm:w-[350px] md:w-full shrink-0 snap-center cursor-pointer aspect-[1.586/1] rounded-2xl p-6 text-white shadow-xl transition-transform hover:scale-[1.02] hover:shadow-2xl overflow-hidden group text-left"
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
              total={cards.length}
              current={currentCardIndex}
              onSelect={scrollToCard}
            />
          </div>
        </div>
      )}
    </div>
  )
}
