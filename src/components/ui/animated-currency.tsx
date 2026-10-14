import { formatCurrency, HIDDEN_VALUE } from '../../lib/format'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'

interface AnimatedCurrencyProps {
  value: number
  hide?: boolean
  animateOnMount?: boolean
  hiddenText?: string
}

export function AnimatedCurrency({ value, hide = false, animateOnMount = false, hiddenText = HIDDEN_VALUE }: AnimatedCurrencyProps) {
  const display = useAnimatedNumber(value, { animateOnMount })

  if (hide) return <>{hiddenText}</>

  return <>{formatCurrency(display)}</>
}
