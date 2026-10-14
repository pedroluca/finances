import { Bell, BellOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/cn'
import type { AppNotification } from '../../types/database'
import { IconTile, ListSection } from '../ui/list'
import { EmptyState, LoadingState } from '../ui/misc'
import {
  groupNotifications,
  notificationAppearance,
  notificationText,
  notificationWhen,
  type NotificationGroup,
} from './notification-content'
import type { useNotificationsInbox } from './useNotificationsInbox'

type Inbox = ReturnType<typeof useNotificationsInbox>

type NotificationListProps = {
  inbox: Inbox
  onSelect: (notification: AppNotification) => void
  /** "page": grupos em cartões, como as outras telas; "menu": lista corrida do menu do sino */
  variant: 'page' | 'menu'
  /** Quantos avisos mostrar (o menu mostra só os mais recentes) */
  limit?: number
}

/** Lista de avisos agrupada por dia, com os estados de carregando, vazio e erro */
export function NotificationList({ inbox, onSelect, variant, limit }: NotificationListProps) {
  const { t } = useTranslation()
  const { items, status, highlighted, load } = inbox

  if (status === 'loading') return <LoadingState className={variant === 'menu' ? 'py-10' : undefined} />

  if (items.length === 0) {
    return status === 'error'
      ? <EmptyState icon={BellOff} title={t('notifications.loadError')} actionLabel={t('notifications.retry')} onAction={load} />
      : <EmptyState icon={Bell} title={t('notifications.emptyTitle')} description={t('notifications.emptyDescription')} />
  }

  const groups = groupNotifications(limit ? items.slice(0, limit) : items)

  if (variant === 'menu') {
    return (
      <div className="pb-1">
        {groups.map((group) => (
          <section key={group.key}>
            <h3 className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-[0.6px] text-subtle">{t(`notifications.groups.${group.key}`)}</h3>
            {group.items.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                group={group.key}
                highlighted={highlighted.has(notification.id)}
                onClick={() => onSelect(notification)}
              />
            ))}
          </section>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <ListSection key={group.key} title={t(`notifications.groups.${group.key}`)}>
          {group.items.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              group={group.key}
              highlighted={highlighted.has(notification.id)}
              onClick={() => onSelect(notification)}
            />
          ))}
        </ListSection>
      ))}
    </div>
  )
}

type NotificationRowProps = {
  notification: AppNotification
  group: NotificationGroup
  /** Chegou sem ler: fundo tingido e bolinha, mesmo depois de a abertura da lista marcar como lido */
  highlighted: boolean
  onClick: () => void
}

function NotificationRow({ notification, group, highlighted, onClick }: NotificationRowProps) {
  const { t } = useTranslation()
  const { icon, color } = notificationAppearance(notification)
  const { title, body } = notificationText(notification, t)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2', highlighted && 'bg-primary/[0.07]')}
    >
      <span className="mt-0.5">
        <IconTile icon={icon} color={color} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="flex-1 min-w-0 truncate text-[15px] font-semibold text-foreground">{title}</span>
          {highlighted && <span aria-hidden className="w-2 h-2 shrink-0 rounded-full bg-primary" />}
          <span className="shrink-0 text-xs text-subtle">{notificationWhen(notification, group)}</span>
        </span>
        <span className="block mt-0.5 text-sm leading-5 text-muted">{body}</span>
      </span>
    </button>
  )
}
