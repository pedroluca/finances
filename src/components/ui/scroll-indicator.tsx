import { cn } from '../../lib/cn'

interface ScrollIndicatorProps {
  total: number
  current: number
  visibleCount?: number
  className?: string
  onSelect?: (index: number) => void
}

// Largura de cada posição (pílula ativa + espaçamento), em px
const SLOT_WIDTH = 22

/**
 * Pontos de paginação: um por item, mostrando só `visibleCount` por vez numa janela que desliza
 * (o ativo sempre se move a cada passo). As pontas com itens escondidos aparecem menores.
 */
export function ScrollIndicator({ total, current, visibleCount = 3, className, onSelect }: ScrollIndicatorProps) {
  if (total <= 1) return null

  const halfWindow = Math.floor(visibleCount / 2)
  const maxStart = Math.max(0, total - visibleCount)
  const start = Math.min(maxStart, Math.max(0, current - halfWindow))

  const windowSize = Math.min(total, visibleCount)
  const hasHiddenBefore = start > 0
  const hasHiddenAfter = start + windowSize < total

  return (
    <div className={cn('overflow-hidden', className)} style={{ width: windowSize * SLOT_WIDTH }}>
      <div className="flex transition-transform duration-300 ease-in-out" style={{ transform: `translateX(-${start * SLOT_WIDTH}px)` }}>
        {Array.from({ length: total }, (_, index) => {
          const isActive = index === current
          const isPhantom = (hasHiddenBefore && index === start) || (hasHiddenAfter && index === start + windowSize - 1)

          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelect?.(index)}
              style={{ width: SLOT_WIDTH }}
              className="shrink-0 h-3 flex items-center justify-center outline-none"
              aria-label={`Ir para o item ${index + 1}`}
              aria-current={isActive || undefined}
            >
              <span
                className={cn(
                  'rounded-full transition-all duration-300 ease-in-out',
                  isActive ? 'h-2 w-5 bg-primary' : isPhantom ? 'h-1.5 w-1.5 bg-primary/20' : 'h-2 w-2 bg-primary/30 hover:bg-primary/50',
                )}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
