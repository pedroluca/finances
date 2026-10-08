import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Plus } from 'lucide-react'
import logoMark from '../assets/logo-mark.png'
import { cn } from '../lib/cn'
import { useAuthStore } from '../store/auth.store'
import { usePrefsStore } from '../store/prefs.store'
import { IconButton } from './ui/icon-button'

/** Logo do app (degradê da marca com o símbolo branco) */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <img
      src={logoMark}
      alt="Finances"
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
      className="shrink-0"
    />
  )
}

/**
 * Cabeçalho das abas: título (ou saudação) à esquerda e ações redondas à direita.
 * A navegação fica na tab bar flutuante (celular) ou na barra lateral (desktop).
 */
export function TabHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-2 lg:pt-8 lg:pb-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-[26px] leading-8 lg:text-3xl lg:leading-9 font-bold text-foreground truncate">{title}</h1>
          {subtitle && <p className="text-[13px] text-muted mt-0.5 truncate">{subtitle}</p>}
        </div>
        {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
      </div>
    </header>
  )
}

/** Cabeçalho das telas internas (Configurações, Adicionar Cartão...): voltar + título */
export function StackHeader({ title, onBack, right, className }: { title: ReactNode; onBack?: () => void; right?: ReactNode; className?: string }) {
  const navigate = useNavigate()
  return (
    <header className={cn('sticky top-0 z-20 bg-background/85 backdrop-blur-xl pt-[env(safe-area-inset-top)]', className)}>
      <div className="max-w-3xl mx-auto h-14 lg:h-24 lg:pt-4 px-2 sm:px-4 lg:px-6 flex items-center gap-1 lg:gap-3">
        <IconButton icon={ArrowLeft} label="Voltar" onClick={onBack ?? (() => navigate(-1))} className="lg:bg-surface-2 lg:hover:bg-surface-3" />
        <h1 className="flex-1 min-w-0 text-lg lg:text-2xl font-semibold lg:font-bold text-foreground truncate pl-1">{title}</h1>
        {right && <div className="flex items-center gap-1 shrink-0">{right}</div>}
      </div>
    </header>
  )
}

/** Olho para mostrar/ocultar os valores (a preferência vale para todas as telas) */
export function HideValuesButton() {
  const hideValues = usePrefsStore((state) => state.hideValues)
  const toggleHideValues = usePrefsStore((state) => state.toggleHideValues)
  return (
    <IconButton
      icon={hideValues ? EyeOff : Eye}
      variant="surface"
      label={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
      onClick={toggleHideValues}
    />
  )
}

/** Avatar com a inicial do usuário; abre o perfil e as configurações */
export function ProfileButton() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const initial = user?.name?.trim().charAt(0).toUpperCase() || '?'
  return (
    <button
      type="button"
      onClick={() => navigate('/settings')}
      aria-label="Perfil e configurações"
      title="Perfil e configurações"
      className="lg:hidden w-10 h-10 shrink-0 rounded-full bg-primary text-on-primary text-base font-bold flex items-center justify-center hover:bg-primary-strong transition-colors"
    >
      {initial}
    </button>
  )
}

/** Botão "+" do cabeçalho (nova conta, novo cartão) */
export function HeaderAddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <IconButton icon={Plus} variant="primary" label={label} onClick={onClick} />
}

/** Conteúdo das abas: largura máxima, espaçamento e o espaço da tab bar no fim (celular) */
export function TabContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className={cn('max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 lg:pt-4 pb-36 lg:pb-12 space-y-3 md:space-y-4', className)}>
      {children}
    </main>
  )
}

/** Conteúdo das telas internas: coluna mais estreita, sem tab bar */
export function StackContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className={cn('max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-[max(2rem,env(safe-area-inset-bottom))] lg:pb-12 space-y-3', className)}>
      {children}
    </main>
  )
}

/** Título de seção em caixa alta ("ATIVAS") com ação opcional à direita */
export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 min-h-9">
      <h2 className="text-xs font-semibold uppercase tracking-[0.6px] text-subtle">{title}</h2>
      {action}
    </div>
  )
}
