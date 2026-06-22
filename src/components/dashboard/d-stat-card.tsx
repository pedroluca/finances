import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: ReactNode
  icon: LucideIcon
  iconBgClassName: string
  iconColorClassName: string
  onClick?: () => void
}

export function StatCard({ label, value, icon: Icon, iconBgClassName, iconColorClassName, onClick }: StatCardProps) {
  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm px-2.5 py-4 md:px-3 transition-colors ${
        onClick ? 'transition-all hover:shadow-md text-left cursor-pointer group' : ''
      }`}
    >
      <div className="flex items-center gap-2 h-full">
        <div
          className={`w-10 md:w-12 h-10 md:h-12 rounded-lg flex items-center justify-center shrink-0 transition-colors ${iconBgClassName}`}
        >
          <Icon className={`w-6 h-6 ${iconColorClassName}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {label}
          </p>
          {typeof value === 'string' || typeof value === 'number' ? (
            <p className="text-base md:text-xl font-bold text-gray-900 dark:text-white truncate">
              {value}
            </p>
          ) : (
            value
          )}
        </div>
      </div>
    </Wrapper>
  )
}
