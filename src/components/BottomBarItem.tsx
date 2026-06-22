import { NavLink } from 'react-router-dom'

interface BottomBarItemProps {
  to: string
  label: string
  children: React.ReactNode
}

export function BottomBarItem({ to, label, children }: BottomBarItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `cursor-pointer flex flex-col items-center justify-center gap-1 w-20 py-1 rounded-2xl transition-all duration-300 relative z-10 ${
          isActive ? 'text-white' : 'text-white/50 hover:text-white/80'
        }`
      }
    >
      {children}
      <span className="text-[10px] leading-none text-center break-words px-1">{label}</span>
    </NavLink>
  )
}
