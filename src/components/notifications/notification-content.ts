import type { TFunction } from 'i18next'
import { Bell, CalendarClock, CreditCard, ReceiptText, type LucideIcon } from 'lucide-react'
import { accents } from '../../lib/colors'
import { parseLocalDateTime, shortDate, timeLabel } from '../../lib/format'
import type { AppNotification, NotificationType } from '../../types/database'

const APPEARANCE: Record<NotificationType, { icon: LucideIcon; color: string }> = {
  closing_today: { icon: CreditCard, color: accents.violet },
  due_in_7_days: { icon: CalendarClock, color: accents.amber },
  bill_due_today: { icon: ReceiptText, color: accents.red },
  bill_due_in_7_days: { icon: CalendarClock, color: accents.blue },
}

function isKnownType(type: string): type is NotificationType {
  return type in APPEARANCE
}

export function notificationAppearance(notification: AppNotification) {
  return isKnownType(notification.type) ? APPEARANCE[notification.type] : { icon: Bell, color: accents.gray }
}

/** Título e corpo no idioma atual; tipo que esta versão não conhece usa o texto do servidor */
export function notificationText(notification: AppNotification, t: TFunction) {
  const { type } = notification
  if (!isKnownType(type)) return { title: notification.title, body: notification.body }
  return {
    title: t(`notifications.types.${type}.title`),
    body: t(`notifications.types.${type}.body`, { count: notification.data.count ?? 1 }),
  }
}

/** Para onde o aviso leva: a fatura (quando é um cartão só), Cartões ou Contas */
export function notificationHref(notification: AppNotification): string {
  const { type, data } = notification
  if (type.startsWith('bill')) return '/billings'
  if (type !== 'closing_today' && type !== 'due_in_7_days') return '/dashboard'
  const cardIds = data.card_ids ?? []
  return cardIds.length === 1 ? `/cards/${cardIds[0]}` : '/cards'
}

export type NotificationGroup = 'today' | 'yesterday' | 'lastWeek' | 'older'

function groupOf(notification: AppNotification): NotificationGroup {
  const created = parseLocalDateTime(notification.created_at)
  const day = new Date(created.getFullYear(), created.getMonth(), created.getDate())
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((day.getTime() - today.getTime()) / 86400000)
  if (days >= 0) return 'today'
  if (days === -1) return 'yesterday'
  if (days >= -7) return 'lastWeek'
  return 'older'
}

/** Separa a lista (já em ordem) em Hoje, Ontem, Últimos 7 dias e Anteriores */
export function groupNotifications(items: AppNotification[]) {
  const groups: { key: NotificationGroup; items: AppNotification[] }[] = []
  for (const item of items) {
    const key = groupOf(item)
    const last = groups[groups.length - 1]
    if (last?.key === key) last.items.push(item)
    else groups.push({ key, items: [item] })
  }
  return groups
}

/** Hora nos avisos de hoje e de ontem (o grupo já diz o dia); data nos mais antigos */
export function notificationWhen(notification: AppNotification, group: NotificationGroup): string {
  const date = parseLocalDateTime(notification.created_at)
  return group === 'today' || group === 'yesterday' ? timeLabel(date) : shortDate(date)
}
