import { useState } from 'react'

/**
 * True só na primeira vez que essa `key` é visitada desde que o app foi aberto
 * (sessionStorage zera quando a aba/app é fechado de verdade, mas sobrevive a
 * navegação interna e a F5). Usado para disparar a animação de entrada dos
 * números só na 1ª visita da sessão, mesmo que o valor já venha do cache.
 */
export function useIsFirstVisitThisSession(key: string): boolean {
  const [isFirst] = useState(() => {
    const flagKey = `visited:${key}`
    if (sessionStorage.getItem(flagKey)) return false
    sessionStorage.setItem(flagKey, '1')
    return true
  })

  return isFirst
}
