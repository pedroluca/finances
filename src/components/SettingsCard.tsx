import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

type SettingsCardAction =
  | { type: 'link'; to: string }
  | { type: 'toggle'; checked: boolean; onChange: () => void; ariaLabel?: string }
  | { type: 'button'; icon: ReactNode; onClick: () => void; ariaLabel?: string }
  | { type: 'none' }

interface SettingsCardProps {
  icon: ReactNode
  iconBgClassName: string
  iconShape?: 'box' | 'circle'
  title: string
  description?: ReactNode
  truncateText?: boolean
  footer?: ReactNode
  action: SettingsCardAction
  largeCard?: boolean
}

export default function SettingsCard({
  icon,
  iconBgClassName,
  iconShape = 'box',
  title,
  description,
  truncateText = false,
  footer,
  action,
  largeCard = false,
}: SettingsCardProps) {
  const content = (
    <div className={`flex items-center justify-between gap-4`}>
      <div className="flex items-center gap-4 min-w-0">
        <div
          className={`w-12 h-12 flex items-center justify-center shrink-0 ${
            iconShape === 'circle' ? 'rounded-full' : 'rounded-lg p-3'
          } ${iconBgClassName}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${truncateText ? 'truncate' : ''}`}>
            {title}
          </h3>
          {description && (
            <p className={`text-sm text-gray-500 dark:text-gray-400 mt-1 ${truncateText ? 'truncate' : ''}`}>
              {description}
            </p>
          )}
        </div>
      </div>

      {action.type === 'link' && (
        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
      )}

      {action.type === 'toggle' && (
        <button
          onClick={action.onChange}
          aria-label={action.ariaLabel}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
            action.checked ? 'bg-purple-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              action.checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      )}

      {action.type === 'button' && (
        <button
          onClick={action.onClick}
          aria-label={action.ariaLabel}
          className="cursor-pointer p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition shrink-0"
        >
          {action.icon}
        </button>
      )}
    </div>
  )

  if (action.type === 'link') {
    return (
      <Link
        to={action.to}
        className="block w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-colors p-4 md:p-6 hover:shadow-md cursor-pointer"
      >
        {content}
        {footer}
      </Link>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-colors p-4 md:p-6 ${largeCard ? 'col-span-full' : ''}`}>
      {content}
      {footer && <div className="mt-4">{footer}</div>}
    </div>
  )
}
