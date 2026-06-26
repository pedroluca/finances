import { Nfc } from 'lucide-react'
import type { CardWithBalance } from '../../types/database'
import { AnimatedCurrency } from '../ui/animated-currency'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'

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
  percAvailable: number
  onClick: () => void
  className?: string
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
  percAvailable,
  onClick,
  className = '',
}: CreditCardTileProps) {
  const widthCurrent = useAnimatedNumber(percCurrent, { animateOnMount })
  const widthOther = useAnimatedNumber(percOther, { animateOnMount })
  const widthAvailable = useAnimatedNumber(percAvailable, { animateOnMount })

  return (
    <button
      onClick={onClick}
      className={`relative cursor-pointer rounded-2xl p-5 md:p-6 text-white shadow-xl transition-transform hover:shadow-2xl overflow-hidden group text-left block ${className}`}
      style={{
        background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}dd 100%)`,
        boxShadow: `0 4px 24px -8px ${card.color}80`,
      }}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-12 -mb-12 blur-2xl pointer-events-none" />

      <div className="relative h-full flex flex-col justify-between z-10 w-full">
        <div className="flex justify-between items-start w-full gap-2">
          <h3 className="font-bold text-lg md:text-xl tracking-wide drop-shadow-md truncate">
            {card.card_name}
          </h3>
          <Nfc className="w-6 h-6 md:w-8 md:h-8 opacity-80 shrink-0" />
        </div>

        <div className="w-10 h-7 md:w-12 md:h-9 bg-yellow-200/80 rounded-md border border-yellow-400/50 flex items-center justify-center overflow-hidden relative shadow-sm my-1 md:my-auto shrink-0">
          <div className="absolute w-full h-[1px] bg-yellow-600/40 top-1/2 -translate-y-1/2" />
          <div className="absolute h-full w-[1px] bg-yellow-600/40 left-1/2 -translate-x-1/2" />
          <div className="w-6 h-4 md:w-8 md:h-6 border border-yellow-600/40 rounded-sm" />
        </div>

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
              <div className="flex justify-between items-end w-full">
                <p className="text-[10px] md:text-[11px] uppercase tracking-wider opacity-90 font-medium">Limite Total</p>
                <p className="font-bold text-sm md:text-base tracking-tight drop-shadow-sm">
                  <AnimatedCurrency value={totalLimit} hide={hideValues} animateOnMount={animateOnMount} />
                </p>
              </div>

              <div className="w-full h-1.5 md:h-2 rounded-full border border-gray-300/60 drop-shadow-md flex overflow-hidden bg-black/20 shadow-inner">
                <div style={{ width: `${widthCurrent}%` }} className="bg-sky-400 h-full" />
                <div style={{ width: `${widthOther}%` }} className="bg-orange-400 h-full" />
                <div style={{ width: `${widthAvailable}%` }} className="bg-emerald-400 h-full" />
              </div>

              <div className="flex justify-between items-start text-[9px] md:text-[10px] uppercase tracking-wider opacity-100 font-medium w-full">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-sky-400 shadow-sm shrink-0" />
                    <span className="opacity-90">Atual</span>
                  </div>
                  <span className="font-bold text-[10px] md:text-xs normal-case drop-shadow-sm ml-[10px] md:ml-[12px]">
                    <AnimatedCurrency value={currentInvoiceAmount} hide={hideValues} animateOnMount={animateOnMount} hiddenText="••••" />
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1 justify-center">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-orange-400 shadow-sm shrink-0" />
                    <span className="opacity-90">Outras</span>
                  </div>
                  <span className="font-bold text-[10px] md:text-xs normal-case drop-shadow-sm ml-[10px] md:ml-[12px]">
                    <AnimatedCurrency value={otherInvoices} hide={hideValues} animateOnMount={animateOnMount} hiddenText="••••" />
                  </span>
                </div>

                <div className="flex flex-col gap-0.5 items-end">
                  <div className="flex items-center gap-1">
                    <span className="opacity-90">Disp.</span>
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-400 shadow-sm shrink-0" />
                  </div>
                  <span className="font-bold text-[10px] md:text-xs normal-case drop-shadow-sm mr-[10px] md:mr-[12px]">
                    <AnimatedCurrency value={availableLimit} hide={hideValues} animateOnMount={animateOnMount} hiddenText="••••" />
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
