import { CreditCard, LayoutDashboard, Plus, ReceiptText, Settings } from 'lucide-react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import logoMark from '../assets/logo-mark.png'
import { cn } from '../lib/cn'
import { useAuthStore } from '../store/auth.store'
import { useQuickExpense } from '../store/quick-expense.store'
import { Button } from './ui/button'
import { IconButton } from './ui/icon-button'

const TABS = [
  { to: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { to: '/billings', label: 'Contas', icon: ReceiptText },
  { to: '/cards', label: 'Cartões', icon: CreditCard },
]

const TAB_ROUTES = TABS.map((tab) => tab.to)

// Vidro da tab bar: preenchimento translúcido com desfoque, borda clara e sombra suave
const glass = cn(
  'border backdrop-blur-xl backdrop-saturate-150',
  'bg-surface/80 border-foreground/[0.07] shadow-[0_12px_32px_rgba(16,18,20,0.14),0_2px_6px_rgba(16,18,20,0.06)]',
  'dark:bg-surface/75 dark:border-white/10 dark:shadow-[0_12px_32px_rgba(0,0,0,0.55),0_2px_6px_rgba(0,0,0,0.35)]',
)

// Halo da aba ativa
const indicator = 'border bg-primary/[0.13] border-primary/20 dark:bg-primary/20 dark:border-primary/30'

function useActiveIndex() {
  const { pathname } = useLocation()
  return TAB_ROUTES.findIndex((route) => pathname === route || pathname.startsWith(`${route}/`))
}

/** Reflexo do vidro: mais claro em cima, sumindo até o meio, e um fio de luz na borda de cima */
function GlassSheen({ rimClassName = 'left-8 right-8' }: { rimClassName?: string }) {
  return (
    <>
      <span className="pointer-events-none absolute inset-0 rounded-full overflow-hidden">
        <span className="absolute inset-0 bg-linear-to-b from-white/75 to-white/0 to-60% dark:from-white/10" />
      </span>
      <span className={cn('pointer-events-none absolute top-0 h-px bg-linear-to-r from-white/0 via-white to-white/0 dark:via-white/35', rimClassName)} />
    </>
  )
}

/**
 * Tab bar flutuante em cápsula, com acabamento de vidro e um indicador que desliza até a aba
 * ativa (a mesma do app nativo), e ao lado o "+" de nova despesa no mesmo vidro.
 * Só no celular/tablet e só nas três abas.
 */
export function FloatingTabBar() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const showQuickExpense = useQuickExpense((state) => state.show)
  const activeIndex = useActiveIndex()
  const { pathname } = useLocation()

  if (!isAuthenticated || !TAB_ROUTES.includes(pathname)) return null

  return (
    <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 pointer-events-none px-5 pt-7 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      {/* Faixa acima da cápsula em que o conteúdo vai sumindo */}
      <div className="absolute inset-0 bg-linear-to-b from-background/0 to-background/90 to-55%" />

      <div className="pointer-events-auto relative mx-auto w-full max-w-[520px] flex items-center gap-2.5">
        <div className={cn('relative flex-1 min-w-0 h-16 rounded-full', glass)}>
          <GlassSheen />
          <div className="relative h-full flex p-1.5">
            {activeIndex >= 0 && (
              <div
                className={cn('absolute top-1.5 bottom-1.5 left-1.5 rounded-full transition-transform duration-500 ease-[cubic-bezier(0.34,1.36,0.64,1)]', indicator)}
                style={{ width: `calc((100% - 12px) / ${TABS.length})`, transform: `translateX(${activeIndex * 100}%)` }}
              />
            )}
            {TABS.map(({ to, label, icon: Icon }, index) => {
              const active = index === activeIndex
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={cn(
                    'relative flex-1 flex flex-col items-center justify-center gap-0.5 rounded-full transition-colors',
                    active ? 'text-primary' : 'text-muted hover:text-foreground',
                  )}
                >
                  <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                  <span className={cn('text-[11px] leading-tight', active ? 'font-semibold' : 'font-medium')}>{label}</span>
                </NavLink>
              )
            })}
          </div>
        </div>

        {/* Nova despesa: pílula um pouco mais larga que alta, com o mesmo halo da aba ativa */}
        <button
          type="button"
          onClick={showQuickExpense}
          aria-label="Nova despesa"
          title="Nova despesa"
          className={cn('relative shrink-0 w-[84px] h-16 rounded-full flex items-center justify-center transition-transform active:scale-[0.93]', glass)}
        >
          {/* No botão o fio de luz vira só um ponto de reflexo */}
          <GlassSheen rimClassName="left-1/2 -translate-x-1/2 w-[18px]" />
          <span className={cn('relative w-[72px] h-[52px] rounded-full flex items-center justify-center text-primary', indicator)}>
            <Plus size={26} strokeWidth={2.4} />
          </span>
        </button>
      </div>
    </nav>
  )
}

/**
 * Navegação do desktop (a partir de 1024px): barra lateral fixa com as mesmas abas da cápsula
 * do celular e o perfil no rodapé (como no Tractus web).
 */
export function Sidebar() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const showQuickExpense = useQuickExpense((state) => state.show)
  const activeIndex = useActiveIndex()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  if (!isAuthenticated) return null

  const initial = user?.name?.trim().charAt(0).toUpperCase() || '?'
  const onSettings = pathname.startsWith('/settings')

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-border bg-surface px-3 py-5">
      <Link to="/dashboard" className="flex items-center gap-2.5 px-3 pb-6 rounded-xl">
        <img src={logoMark} alt="" width={36} height={36} className="shrink-0 rounded-[10px]" />
        <span className="text-lg font-bold tracking-tight text-foreground">Finances</span>
      </Link>

      <Button label="Nova despesa" icon={Plus} fullWidth onClick={showQuickExpense} className="mb-5" />

      <nav aria-label="Navegação principal" className="flex flex-col gap-1">
        {TABS.map(({ to, label, icon: Icon }, index) => {
          const active = index === activeIndex
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 h-11 px-3 rounded-xl text-[15px] transition-colors',
                active ? 'bg-primary/10 text-primary font-semibold' : 'text-muted font-medium hover:bg-surface-2 hover:text-foreground',
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} aria-hidden />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto flex items-center gap-1 border-t border-border pt-4">
        <Link
          to="/settings"
          className={cn('flex flex-1 min-w-0 items-center gap-3 rounded-xl p-2 transition-colors', onSettings ? 'bg-primary/10' : 'hover:bg-surface-2')}
        >
          <span className="w-9 h-9 shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-bold">{initial}</span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-foreground">{user?.name}</span>
            <span className="truncate text-xs text-muted">{user?.email}</span>
          </span>
        </Link>
        <IconButton icon={Settings} label="Configurações" tone="muted" onClick={() => navigate('/settings')} />
      </div>
    </aside>
  )
}
