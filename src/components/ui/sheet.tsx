import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

let openOverlays = 0

/** Trava a rolagem da página e fecha com Esc enquanto o overlay está aberto */
function useOverlay(open: boolean, onClose?: () => void) {
  useEffect(() => {
    if (!open) return
    openOverlays++
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      openOverlays--
      if (openOverlays === 0) document.body.style.overflow = ''
    }
  }, [open, onClose])
}

type SheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  description?: ReactNode
  children: ReactNode
  /** Rodapé fixo (botões) abaixo da área rolável */
  footer?: ReactNode
  /** Largura máxima no desktop */
  size?: 'md' | 'lg'
  dismissable?: boolean
  contentClassName?: string
}

/**
 * Folha que sobe da parte de baixo da tela no celular (com a alça, como no app) e vira um
 * diálogo central no desktop. Formulários, filtros e ações rápidas.
 */
export function Sheet({ open, onClose, title, description, children, footer, size = 'md', dismissable = true, contentClassName }: SheetProps) {
  const close = dismissable ? onClose : undefined
  useOverlay(open, close)
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={close} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'sheet-panel relative w-full flex flex-col bg-surface shadow-2xl max-h-[90dvh] animate-sheet-in',
          'rounded-t-3xl sm:rounded-3xl sm:border sm:border-border',
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-surface-3" />
        </div>
        {(title || description) && (
          <div className="flex items-start gap-3 px-5 pt-2 pb-3 sm:px-6 sm:pt-6">
            <div className="flex-1 min-w-0 space-y-1">
              {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
              {description && <div className="text-sm text-muted leading-5">{description}</div>}
            </div>
            {close && (
              <button
                type="button"
                onClick={close}
                aria-label="Fechar"
                className="hidden sm:flex -mr-2 -mt-1 w-9 h-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className={cn('flex-1 overflow-y-auto custom-scrollbar px-5 sm:px-6', footer ? 'pb-2' : 'pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6', contentClassName)}>
          {children}
        </div>
        {footer && <div className="px-5 sm:px-6 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/** Caixa centralizada para avisos, confirmações e a apresentação inicial */
export function Dialog({ open, onClose, children, className }: { open: boolean; onClose?: () => void; children: ReactNode; className?: string }) {
  useOverlay(open, onClose)
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/55 animate-fade-in" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" className={cn('relative w-full max-w-sm bg-surface rounded-3xl p-6 shadow-2xl border border-border animate-dialog-in', className)}>
        {children}
      </div>
    </div>,
    document.body,
  )
}
