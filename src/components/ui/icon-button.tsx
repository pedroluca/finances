import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

type Variant = 'ghost' | 'surface' | 'primary' | 'soft'
type Tone = 'default' | 'muted' | 'danger' | 'warning' | 'success'

const variantClass: Record<Variant, string> = {
  ghost: 'hover:bg-surface-2',
  surface: 'bg-surface-2 hover:bg-surface-3',
  primary: 'bg-primary text-on-primary hover:bg-primary-strong',
  soft: 'bg-primary/10 text-primary hover:bg-primary/20',
}

// Cor do ícone nas variantes ghost e surface
const toneClass: Record<Tone, string> = {
  default: 'text-foreground',
  muted: 'text-muted hover:text-foreground',
  danger: 'text-danger',
  warning: 'text-warning',
  success: 'text-success',
}

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: LucideIcon
  label: string
  variant?: Variant
  tone?: Tone
  /** Lado do botão em px */
  size?: number
  iconSize?: number
  /** Contador no canto (ex.: notificações não lidas) */
  badge?: number
}

/** Botão redondo só com ícone (olho, "+", editar, excluir...) */
export function IconButton({ icon: Icon, label, variant = 'ghost', tone = 'default', size = 40, iconSize = 20, badge, className, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      style={{ width: size, height: size }}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full transition-colors active:opacity-80 disabled:opacity-40 disabled:pointer-events-none',
        variantClass[variant],
        (variant === 'ghost' || variant === 'surface') && toneClass[tone],
        className,
      )}
      {...props}
    >
      <Icon size={iconSize} strokeWidth={2} />
      {!!badge && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-none font-bold flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  )
}
