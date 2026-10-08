import type { ButtonHTMLAttributes } from 'react'
import { Loader2, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'danger-soft'
type Size = 'sm' | 'md' | 'lg'

const variantClass: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-strong',
  secondary: 'bg-surface-2 text-foreground hover:bg-surface-3',
  outline: 'border border-border text-foreground hover:bg-surface-2',
  ghost: 'text-primary hover:bg-primary/10',
  // Vermelho fixo: o token danger fica claro no tema escuro e perde contraste com o texto branco
  danger: 'bg-red-600 text-white hover:bg-red-700',
  'danger-soft': 'bg-danger/10 text-danger hover:bg-danger/15',
}

const sizeClass: Record<Size, string> = {
  sm: 'h-9 px-3.5 rounded-lg gap-1.5 text-sm',
  md: 'h-12 px-5 rounded-xl gap-2 text-base',
  lg: 'h-14 px-6 rounded-2xl gap-2.5 text-[17px]',
}

const iconSize: Record<Size, number> = { sm: 16, md: 18, lg: 20 }

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  fullWidth = false,
  disabled,
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-colors active:opacity-80 disabled:opacity-50 disabled:pointer-events-none',
        variantClass[variant],
        sizeClass[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 size={iconSize[size]} className="animate-spin" />
      ) : (
        Icon && <Icon size={iconSize[size]} strokeWidth={2.2} />
      )}
      <span className="truncate">{label}</span>
    </button>
  )
}
