import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'

interface AnimatedCurrencyProps {
  value: number
  hide?: boolean
  animateOnMount?: boolean
  hiddenText?: string
}

export function AnimatedCurrency({ value, hide = false, animateOnMount = false, hiddenText = 'R$ ••••' }: AnimatedCurrencyProps) {
  const display = useAnimatedNumber(value, { animateOnMount })

  if (hide) return <>{hiddenText}</>

  return <>{`R$ ${display.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</>
}
