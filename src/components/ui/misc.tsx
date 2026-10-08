import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from './button'

// ─── Chip ────────────────────────────────────────────────────────────────────

/** Pílula selecionável (categorias, pessoas, filtros) */
export function Chip({ label, selected, onClick, icon: Icon, emoji, size = 'md', className }: {
  label: string
  selected?: boolean
  onClick?: () => void
  icon?: LucideIcon
  /** Ícone da categoria (emoji escolhido pelo usuário) */
  emoji?: string | null
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={!!selected}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium transition-colors',
        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-3.5 text-sm',
        selected ? 'bg-primary border-primary text-on-primary' : 'bg-surface border-border text-foreground hover:bg-surface-2',
        className,
      )}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 15} className={selected ? 'text-on-primary' : 'text-muted'} />}
      {!!emoji && <span className="text-sm">{emoji}</span>}
      {label}
    </button>
  )
}

// ─── Segmented control ───────────────────────────────────────────────────────

export function SegmentedControl<T extends string>({ options, value, onChange, compact, className }: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  compact?: boolean
  className?: string
}) {
  return (
    <div role="tablist" className={cn('flex bg-surface-2 rounded-xl p-1', compact ? 'self-start w-fit' : 'w-full', className)}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-center justify-center rounded-lg text-[13px] font-semibold transition-all',
              compact ? 'h-8 px-3.5' : 'flex-1 h-9',
              selected ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Estados de tela ─────────────────────────────────────────────────────────

export function EmptyState({ icon: Icon, title, description, actionLabel, actionIcon, onAction, className, tint = 'primary' }: {
  icon: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  actionIcon?: LucideIcon
  onAction?: () => void
  className?: string
  /** Cor do ícone */
  tint?: 'primary' | 'subtle'
}) {
  return (
    <div className={cn('flex flex-col items-center text-center px-6 py-10 gap-3', className)}>
      <div
        className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center mb-1',
          tint === 'primary' ? 'bg-primary/10 text-primary' : 'bg-subtle/10 text-subtle',
        )}
      >
        <Icon size={26} />
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description && <p className="text-sm text-muted leading-5 max-w-xs">{description}</p>}
      {actionLabel && onAction && <Button label={actionLabel} icon={actionIcon} onClick={onAction} className="mt-2" />}
    </div>
  )
}

export function LoadingState({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-16', className)}>
      <div className="w-7 h-7 rounded-full border-[3px] border-primary/25 border-t-primary animate-spin" />
    </div>
  )
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px bg-border', className)} />
}

// ─── Selos ───────────────────────────────────────────────────────────────────

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

const badgeTone: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-muted',
  primary: 'bg-primary/12 text-primary',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/12 text-warning',
  danger: 'bg-danger/12 text-danger',
  info: 'bg-info/12 text-info',
}

/** Selo pequeno de status (Pausada, Recorrente, compartilhado, Padrão...) */
export function Badge({ label, tone = 'neutral', icon: Icon, className }: { label: string; tone?: BadgeTone; icon?: LucideIcon; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold', badgeTone[tone], className)}>
      {Icon && <Icon size={11} strokeWidth={2.4} />}
      {label}
    </span>
  )
}

const calloutTone = {
  info: 'bg-info/8 text-info',
  warning: 'bg-warning/8 text-warning',
  danger: 'bg-danger/8 text-danger',
  success: 'bg-success/8 text-success',
}

/** Aviso destacado (erros de formulário, avisos de limite...) */
export function Callout({ tone = 'info', icon: Icon, title, children, className }: {
  tone?: keyof typeof calloutTone
  icon?: LucideIcon
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div role={tone === 'danger' ? 'alert' : undefined} className={cn('flex gap-3 rounded-2xl p-3.5', calloutTone[tone], className)}>
      {Icon && <Icon size={18} className="shrink-0 mt-px" />}
      <div className="flex-1 min-w-0 space-y-0.5">
        {title && <p className="text-sm font-semibold">{title}</p>}
        <div className="text-sm leading-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Switch ──────────────────────────────────────────────────────────────────

export function AppSwitch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onChange(!checked)
      }}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-surface-3',
      )}
    >
      <span className={cn('inline-block h-6 w-6 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  )
}

/** Linha de formulário com título, descrição e switch (ex.: "Conta recorrente") */
export function SwitchField({ title, description, checked, onChange }: { title: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 py-1 cursor-pointer" onClick={() => onChange(!checked)}>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-foreground">{title}</p>
        {description && <p className="text-xs text-subtle leading-4 mt-0.5">{description}</p>}
      </div>
      <AppSwitch checked={checked} onChange={onChange} label={title} />
    </div>
  )
}
