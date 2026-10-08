import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { ChevronDown, Eye, EyeOff, Minus, Plus, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { fieldClass } from '../../lib/formStyles'

/** Rótulo dos campos: texto pequeno cinza com o ícone na frente e, opcionalmente, algo à direita */
export function FieldLabel({ label, icon: Icon, right, htmlFor }: { label: ReactNode; icon?: LucideIcon; right?: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-1.5">
      <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-[13px] font-medium text-muted min-w-0">
        {Icon && <Icon size={14} className="shrink-0" />}
        <span className="truncate">{label}</span>
      </label>
      {right}
    </div>
  )
}

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  /** Ícone do rótulo */
  icon?: LucideIcon
  /** Ícone dentro do campo, à esquerda (login e cadastro) */
  leadingIcon?: LucideIcon
  hint?: ReactNode
  error?: string | null
  secureToggle?: boolean
  containerClassName?: string
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, icon, leadingIcon: LeadingIcon, hint, error, secureToggle, type, containerClassName, className, id, ...props },
  ref,
) {
  const [hidden, setHidden] = useState(true)
  const inputType = secureToggle ? (hidden ? 'password' : 'text') : type
  const inputId = id ?? props.name

  return (
    <div className={containerClassName}>
      {label && <FieldLabel label={label} icon={icon} htmlFor={inputId} />}
      <div className="relative group">
        {LeadingIcon && (
          <LeadingIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle group-focus-within:text-primary pointer-events-none transition-colors" />
        )}
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          className={cn(fieldClass, LeadingIcon && 'pl-10', secureToggle && 'pr-12', className)}
          {...props}
        />
        {secureToggle && (
          <button
            type="button"
            onClick={() => setHidden((value) => !value)}
            aria-label={hidden ? 'Mostrar senha' : 'Ocultar senha'}
            className="absolute right-0 top-0 h-12 px-4 flex items-center text-subtle hover:text-foreground"
          >
            {hidden ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
        )}
      </div>
      {error ? (
        <p className="text-xs text-danger mt-1.5">{error}</p>
      ) : hint ? (
        <div className="text-xs text-subtle mt-1.5">{hint}</div>
      ) : null}
    </div>
  )
})

/** Campo numérico com botões − e + (parcelas, dia de vencimento, limite) */
export function StepperField({ label, icon, value, onChange, min = 0, max = 9999, step = 1, hint }: {
  label?: string
  icon?: LucideIcon
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  hint?: ReactNode
}) {
  // Rascunho só enquanto o campo está em foco (permite apagar tudo antes de digitar)
  const [draft, setDraft] = useState<string | null>(null)
  const clamp = (next: number) => Math.min(max, Math.max(min, next))
  const text = draft ?? String(value)
  const buttonClass = 'w-12 h-12 shrink-0 flex items-center justify-center rounded-xl bg-surface-2 text-foreground hover:bg-surface-3 transition-colors disabled:opacity-40'

  return (
    <div>
      {label && <FieldLabel label={label} icon={icon} />}
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`Diminuir ${label ?? ''}`} disabled={value <= min} onClick={() => onChange(clamp(value - step))} className={buttonClass}>
          <Minus size={18} />
        </button>
        <input
          inputMode="numeric"
          value={text}
          aria-label={label}
          onFocus={(event) => {
            setDraft(String(value))
            event.currentTarget.select()
          }}
          onChange={(event) => {
            // Já aplica o valor a cada tecla, para o Enter do formulário enviar o número digitado
            const digits = event.target.value.replace(/\D/g, '')
            setDraft(digits)
            if (digits) onChange(clamp(Number(digits)))
          }}
          onBlur={() => setDraft(null)}
          className={cn(fieldClass, 'text-center font-semibold min-w-0')}
        />
        <button type="button" aria-label={`Aumentar ${label ?? ''}`} disabled={value >= max} onClick={() => onChange(clamp(value + step))} className={buttonClass}>
          <Plus size={18} />
        </button>
      </div>
      {hint && <div className="text-xs text-subtle mt-1.5">{hint}</div>}
    </div>
  )
}

/** <select> no estilo dos campos, com a setinha do app */
export function SelectField({ label, icon, value, onChange, children, id, required, disabled }: {
  label?: string
  icon?: LucideIcon
  value: string
  onChange: (value: string) => void
  children: ReactNode
  id?: string
  required?: boolean
  disabled?: boolean
}) {
  return (
    <div>
      {label && <FieldLabel label={label} icon={icon} htmlFor={id} />}
      <div className="relative">
        <select
          id={id}
          value={value}
          required={required}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={cn(fieldClass, 'appearance-none pr-10 cursor-pointer')}
        >
          {children}
        </select>
        <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
      </div>
    </div>
  )
}
