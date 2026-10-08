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
}

/** Botão redondo só com ícone (olho, "+", editar, excluir...) */
export function IconButton({ icon: Icon, label, variant = 'ghost', tone = 'default', size = 40, iconSize = 20, className, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      style={{ width: size, height: size }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-colors active:opacity-80 disabled:opacity-40 disabled:pointer-events-none',
        variantClass[variant],
        (variant === 'ghost' || variant === 'surface') && toneClass[tone],
        className,
      )}
      {...props}
    >
      <Icon size={iconSize} strokeWidth={2} />
    </button>
  )
}
