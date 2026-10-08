import type { CSSProperties } from 'react'
import { cn } from '../../lib/cn'

interface SkeletonProps {
  className?: string
  style?: CSSProperties
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  // Fundo e cantos padrão só quando a classe não traz os seus (sem merge de classes, os dois brigariam)
  return (
    <div
      style={style}
      className={cn('animate-pulse', !/\bbg-/.test(className) && 'bg-surface-2', !/\brounded/.test(className) && 'rounded-xl', className)}
    />
  )
}
