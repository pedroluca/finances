
interface ScrollIndicatorProps {
  total: number
  current: number
  visibleCount?: number
  className?: string
  onSelect?: (index: number) => void
}

// Largura de cada "slot" (pill ativo + espaçamento), em px
const SLOT_WIDTH = 24

export function ScrollIndicator({ total, current, visibleCount = 3, className = '', onSelect }: ScrollIndicatorProps) {
  if (total <= 1) return null

  // Renderiza um dot por item, mas exibe só `visibleCount` por vez através de uma
  // janela que desliza (translateX) — assim o ativo sempre se move na tela a cada
  // passo, em vez de dots aparecerem/sumirem de repente.
  const halfWindow = Math.floor(visibleCount / 2)
  const maxStart = Math.max(0, total - visibleCount)
  const start = Math.min(maxStart, Math.max(0, current - halfWindow))

  const windowSize = Math.min(total, visibleCount)
  const hasHiddenBefore = start > 0
  const hasHiddenAfter = start + windowSize < total

  const viewportWidth = windowSize * SLOT_WIDTH

  return (
    <div className={`overflow-hidden ${className}`} style={{ width: viewportWidth }}>
      <div
        className="flex transition-transform duration-300 ease-in-out"
        style={{ transform: `translateX(-${start * SLOT_WIDTH}px)` }}
      >
        {Array.from({ length: total }, (_, index) => {
          const isActive = index === current
          // Ponta da janela com mais itens escondidos atrás: "espia" como um dot fantasma
          const isPhantom = (hasHiddenBefore && index === start) || (hasHiddenAfter && index === start + windowSize - 1)

          return (
            <button
              key={index}
              onClick={() => onSelect?.(index)}
              style={{ width: SLOT_WIDTH }}
              className="shrink-0 h-3 flex items-center justify-center cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              aria-label={`Go to card ${index + 1}`}
            >
              <span
                className={`rounded-full transition-all duration-300 ease-in-out ${
                  isActive
                    ? 'h-3 w-6 rounded-sm bg-purple-600 opacity-100'
                    : isPhantom
                      ? 'h-1.5 w-1.5 bg-purple-200/30'
                      : 'h-3 w-3 rounded-sm bg-purple-200/50 hover:bg-purple-300/50'
                }`}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
