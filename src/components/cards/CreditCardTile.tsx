import { useId, type CSSProperties, type ReactNode } from 'react'
import { Nfc, UsersRound } from 'lucide-react'
import type { CardWithBalance } from '../../types/database'
import { AnimatedCurrency } from '../ui/animated-currency'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'
import { cn } from '../../lib/cn'
import { CARD_RATIO, cardInk, DARK_INK, shade, withAlpha } from '../../lib/colors'

/** Chip EMV desenhado (dourado com os contatos) */
export function CardChip({ size = 38 }: { size?: number }) {
  const id = `chip${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 40 30" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F7E7B0" />
          <stop offset="0.45" stopColor="#DDBB66" />
          <stop offset="1" stopColor="#B38B36" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="39" height="29" rx="6" fill={`url(#${id})`} stroke="#7A5C1E" strokeOpacity={0.35} />
      <path
        d="M0.5 10.5H12.5M0.5 19.5H12.5M27.5 10.5H39.5M27.5 19.5H39.5M12.5 0.5V7M12.5 23V29.5M27.5 0.5V7M27.5 23V29.5"
        stroke="#7A5C1E"
        strokeOpacity={0.45}
        strokeWidth={1}
        fill="none"
      />
      <rect x="12.5" y="7" width="15" height="16" rx="3.5" fill="none" stroke="#7A5C1E" strokeOpacity={0.45} strokeWidth={1} />
    </svg>
  )
}

/** Fundo do cartão: degradê da cor escolhida, brilho de vidro e os arcos decorativos */
export function CardSurface({ color, children, className, style, radius = 20 }: {
  color: string
  children: ReactNode
  className?: string
  style?: CSSProperties
  radius?: number
}) {
  const decor = cardInk(color) === DARK_INK ? '#000000' : '#ffffff'
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{
        borderRadius: radius,
        background: `linear-gradient(to bottom right, ${shade(color, 0.14)} 0%, ${color} 45%, ${shade(color, -0.3)} 100%)`,
        boxShadow: `0 12px 24px -12px ${withAlpha(shade(color, -0.2), 0.75)}`,
        ...style,
      }}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 160 101" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <circle cx="150" cy="6" r="74" stroke={decor} strokeOpacity={0.09} strokeWidth={1} fill="none" />
        <circle cx="150" cy="6" r="56" stroke={decor} strokeOpacity={0.07} strokeWidth={1} fill="none" />
        <circle cx="168" cy="104" r="62" fill={decor} fillOpacity={0.05} />
      </svg>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 55%)' }} />
      {/* Borda fina de luz, como a de um cartão físico */}
      <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: radius, border: `1px solid ${withAlpha(decor, 0.14)}` }} />
      <div className="relative h-full">{children}</div>
    </div>
  )
}

interface CreditCardTileProps {
  card: CardWithBalance
  hideValues: boolean
  animateOnMount: boolean
  totalLimit: number
  currentInvoiceAmount: number
  otherInvoices: number
  availableLimit: number
  percCurrent: number
  percOther: number
  onClick: () => void
  className?: string
  style?: CSSProperties
}

export function CreditCardTile({
  card,
  hideValues,
  animateOnMount,
  totalLimit,
  currentInvoiceAmount,
  otherInvoices,
  availableLimit,
  percCurrent,
  percOther,
  onClick,
  className,
  style,
}: CreditCardTileProps) {
  const ink = cardInk(card.color)
  const widthCurrent = useAnimatedNumber(percCurrent, { animateOnMount })
  const widthOther = useAnimatedNumber(percOther, { animateOnMount })

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Cartão ${card.card_name}`}
      className={cn('block text-left transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.985]', className)}
      style={{ aspectRatio: CARD_RATIO, ...style }}
    >
      <CardSurface color={card.color} className="h-full">
        <div className="h-full flex flex-col p-[18px]" style={{ color: ink }}>
          <div className="flex items-start justify-between gap-3">
            <p className="flex-1 min-w-0 truncate text-[17px] font-bold tracking-[0.2px]">{card.card_name}</p>
            <Nfc size={24} strokeWidth={1.8} className="shrink-0" style={{ color: withAlpha(ink, 0.85) }} />
          </div>

          <div className="mt-2">
            <CardChip />
          </div>

          <div className="mt-auto">
            {card.is_shared ? (
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5" style={{ color: withAlpha(ink, 0.75) }}>
                  <UsersRound size={12} />
                  <span className="text-[10px] font-semibold uppercase tracking-[1px]">Compartilhado com</span>
                </div>
                <p className="text-lg font-bold truncate">{card.owner_name}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-end justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[1px]" style={{ color: withAlpha(ink, 0.75) }}>
                    Limite total
                  </span>
                  <span className="text-[15px] font-bold">
                    <AnimatedCurrency value={totalLimit} hide={hideValues} animateOnMount={animateOnMount} />
                  </span>
                </div>

                {/* Barra de uso do limite: fatura atual, outras faturas e o restante disponível */}
                <div className="h-1.5 rounded-full flex overflow-hidden" style={{ backgroundColor: withAlpha(ink, 0.2) }}>
                  <div style={{ width: `${widthCurrent}%`, backgroundColor: ink }} />
                  <div style={{ width: `${widthOther}%`, backgroundColor: withAlpha(ink, 0.5) }} />
                </div>

                <div className="flex justify-between">
                  <Legend label="Atual" ink={ink} dot={1} value={currentInvoiceAmount} hide={hideValues} animateOnMount={animateOnMount} />
                  <Legend label="Outras" ink={ink} dot={0.5} value={otherInvoices} hide={hideValues} animateOnMount={animateOnMount} align="center" />
                  <Legend label="Disponível" ink={ink} dot={0.2} value={availableLimit} hide={hideValues} animateOnMount={animateOnMount} align="end" />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardSurface>
    </button>
  )
}

function Legend({ label, ink, dot, value, hide, animateOnMount, align = 'start' }: {
  label: string
  ink: string
  dot: number
  value: number
  hide: boolean
  animateOnMount: boolean
  align?: 'start' | 'center' | 'end'
}) {
  return (
    <div className={cn('flex-1 flex flex-col', align === 'start' ? 'items-start' : align === 'end' ? 'items-end' : 'items-center')}>
      <div className="flex items-center gap-1">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: withAlpha(ink, dot), border: dot < 0.3 ? `1px solid ${withAlpha(ink, 0.5)}` : undefined }}
        />
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.6px]" style={{ color: withAlpha(ink, 0.75) }}>{label}</span>
      </div>
      <span className="text-xs font-bold mt-0.5">
        <AnimatedCurrency value={value} hide={hide} animateOnMount={animateOnMount} hiddenText="••••" />
      </span>
    </div>
  )
}
