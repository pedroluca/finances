
interface ScrollIndicatorProps {
  total: number
  current: number
  className?: string
  onSelect?: (index: number) => void
}

export function ScrollIndicator({ total, current, className = '', onSelect }: ScrollIndicatorProps) {
  // Se tiver 5 ou menos, mostra todos
  // Se tiver mais, mostra uma janela deslizante de 5
  // A janela deve tentar centralizar o ativo
  
  const windowSize = 5
  const halfWindow = Math.floor(windowSize / 2)
  
  let start = Math.max(0, current - halfWindow)
  let end = Math.min(total, start + windowSize)
  
  if (end - start < windowSize) {
    if (start === 0) {
        end = Math.min(total, windowSize)
    } else {
        start = Math.max(0, end - windowSize)
    }
  }

  // Gera array de indices visíveis
  const visibleIndices = Array.from({ length: end - start }, (_, i) => start + i)

  if (total <= 1) return null

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {visibleIndices.map((index) => {
        const isActive = index === current
        
        return (
          <button
            key={index}
            onClick={() => onSelect?.(index)}
            className={`
              h-3 transition-all duration-300 ease-in-out cursor-pointer rounded-sm outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0
              ${isActive ? 'w-6 bg-purple-600 opacity-100' : 'w-3 bg-purple-200/50 hover:bg-purple-300/50'}
            `}
            aria-label={`Go to card ${index + 1}`}
          />
        )
      })}
    </div>
  )
}

