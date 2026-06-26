import { useEffect, useRef, useState } from 'react'

interface UseAnimatedNumberOptions {
  duration?: number
  animateOnMount?: boolean
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/** Anima de um número pro outro sempre que `value` muda. Sem mudança, sem animação. */
export function useAnimatedNumber(value: number, options?: UseAnimatedNumberOptions): number {
  const { duration = 1700, animateOnMount = false } = options ?? {}

  const [display, setDisplay] = useState(animateOnMount ? 0 : value)
  const settledRef = useRef(animateOnMount ? 0 : value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = settledRef.current
    const to = value
    if (from === to) return

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)

    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = easeOutCubic(progress)
      setDisplay(from + (to - from) * eased)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        settledRef.current = to
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration])

  return display
}
