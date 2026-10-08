import { Children, Fragment, isValidElement, type ReactNode } from 'react'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { AppSwitch } from './misc'

/** Grupo de linhas no estilo das configurações nativas (cartão com divisórias) */
export function ListSection({ title, footer, children, className }: { title?: string; footer?: string; children: ReactNode; className?: string }) {
  const items = Children.toArray(children).filter(isValidElement)
  return (
    <section className={cn('space-y-2', className)}>
      {title && <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.6px] text-subtle">{title}</h2>}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        {items.map((child, index) => (
          <Fragment key={child.key ?? index}>
            {index > 0 && <div className="h-px bg-border ml-14" />}
            {child}
          </Fragment>
        ))}
      </div>
      {footer && <p className="px-1 text-xs text-subtle">{footer}</p>}
    </section>
  )
}

/** Ícone num quadrado tingido com a cor dele (aceita hex ou var(--color-...)) */
export function IconTile({ icon: Icon, color, size = 'md' }: { icon: LucideIcon; color: string; size?: 'md' | 'lg' }) {
  return (
    <div
      className={cn('shrink-0 flex items-center justify-center', size === 'lg' ? 'w-11 h-11 rounded-xl' : 'w-8 h-8 rounded-lg')}
      style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
    >
      <Icon size={size === 'lg' ? 22 : 18} strokeWidth={2.2} />
    </div>
  )
}

type RowProps = {
  title: string
  description?: string
  icon?: LucideIcon
  iconColor?: string
  value?: string
  onClick?: () => void
  accessory?: ReactNode
  showChevron?: boolean
  destructive?: boolean
  disabled?: boolean
}

export function ListRow({ title, description, icon, iconColor = '#573fec', value, onClick, accessory, showChevron, destructive, disabled }: RowProps) {
  const chevron = showChevron ?? (!!onClick && !accessory)
  const content = (
    <>
      {icon && <IconTile icon={icon} color={destructive ? '#ef4444' : iconColor} />}
      <div className="flex-1 min-w-0 text-left">
        <p className={cn('text-base', destructive ? 'text-danger font-medium' : 'text-foreground')}>{title}</p>
        {description && <p className="text-xs text-muted leading-4 mt-0.5">{description}</p>}
      </div>
      {value && <span className="text-sm text-subtle">{value}</span>}
      {accessory}
      {chevron && <ChevronRight size={18} className="text-subtle shrink-0" />}
    </>
  )
  const className = cn('w-full flex items-center gap-3 px-4 py-3.5 min-h-14', disabled && 'opacity-50')

  if (!onClick) return <div className={className}>{content}</div>
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn(className, 'hover:bg-surface-2 transition-colors')}>
      {content}
    </button>
  )
}

export function SwitchRow({ checked, onChange, title, description, icon, iconColor, disabled }: Omit<RowProps, 'onClick' | 'accessory' | 'value' | 'showChevron' | 'destructive'> & {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  // div clicável (e não <button>) porque o switch dentro já é um botão
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={cn('w-full flex items-center gap-3 px-4 py-3.5 min-h-14 cursor-pointer hover:bg-surface-2 transition-colors', disabled && 'opacity-50')}
    >
      {icon && <IconTile icon={icon} color={iconColor ?? '#573fec'} />}
      <div className="flex-1 min-w-0">
        <p className="text-base text-foreground">{title}</p>
        {description && <p className="text-xs text-muted leading-4 mt-0.5">{description}</p>}
      </div>
      <AppSwitch checked={checked} onChange={onChange} disabled={disabled} label={title} />
    </div>
  )
}
