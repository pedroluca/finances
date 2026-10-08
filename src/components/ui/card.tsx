import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

/** Superfície padrão: fundo do tema, borda fina e cantos de 16px */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('bg-surface rounded-2xl border border-border', className)} {...props} />
}
