import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { IconTile } from '../ui/list'

interface StatCardProps {
  label: string
  /** Texto/número simples ou um nó já formatado (ex.: valor animado) */
  value: ReactNode
  icon: LucideIcon
  color: string
  onClick?: () => void
  className?: string
}

/** Card de resumo: ícone num quadrado tingido, rótulo e valor */
export function StatCard({ label, value, icon, color, onClick, className }: StatCardProps) {
  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'flex items-center gap-3 min-w-0 bg-surface rounded-2xl border border-border px-3 py-3.5 md:px-4 md:py-4 text-left',
        onClick && 'hover:bg-surface-2 transition-colors',
        className,
      )}
    >
      <IconTile icon={icon} color={color} size="lg" />
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-[13px] font-medium text-muted truncate">{label}</p>
        {typeof value === 'string' || typeof value === 'number' ? <StatValue>{value}</StatValue> : value}
      </div>
    </Wrapper>
  )
}

export function StatValue({ children }: { children: ReactNode }) {
  return <p className="text-base md:text-lg font-bold text-foreground truncate">{children}</p>
}
