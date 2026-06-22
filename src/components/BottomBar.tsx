import { CreditCard, LayoutDashboard, ReceiptText } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { BottomBarItem } from './BottomBarItem'

// TODO: ajustar lista final de itens
const navItems = [
  { to: '/dashboard', index: 0 },
  { to: '/billings', index: 1 },
  { to: '/cards', index: 2 },
]

const itemWidth = 80
const itemHeight = 54
const gap = 8

export function BottomBar() {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()

  const activeIndex = navItems.find((item) => location.pathname.startsWith(item.to))?.index ?? -1
  const translateX = activeIndex * (itemWidth + gap)

  return (
    <nav
      className={`${
        isAuthenticated ? 'fixed' : 'hidden'
      } bottom-6 md:bottom-12 left-0 right-0 flex items-center justify-center px-6 z-10 lg:hidden`}
    >
      <div className="bg-primary-700/80 backdrop-blur-2xl rounded-full p-0.5 py-1.5 shadow-[0_8px_30px_rgba(87,63,236,0.45)] border border-white/20 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-full" />

        <div className="relative flex items-center gap-2">
          {/* Sliding active indicator */}
          <div
            className="absolute rounded-full transition-all duration-500 ease-out pointer-events-none"
            style={{
              width: `${itemWidth}px`,
              height: `${itemHeight}px`,
              transform: `translateX(${translateX}px)`,
              left: 0,
              top: '50%',
              marginTop: `-${(itemHeight / 2) + 0.75}px`,
            }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-white/10 blur-[1px] p-[2px]">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-primary-400 to-primary-600" />
            </div>
            <div className="absolute inset-[2px] rounded-full bg-gradient-to-br from-primary-500 to-primary-700 shadow-[0_0_20px_rgba(87,63,236,0.6)]" />
          </div>

          <BottomBarItem to="/dashboard" label="Início">
            <LayoutDashboard size={22} />
          </BottomBarItem>
          <BottomBarItem to="/billings" label="Contas">
            <ReceiptText size={22} />
          </BottomBarItem>
          <BottomBarItem to="/cards" label="Cartões">
            <CreditCard size={22} />
          </BottomBarItem>
        </div>
      </div>
    </nav>
  )
}
