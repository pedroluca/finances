import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useNotificationsStore } from '../../store/notifications.store'
import { IconButton } from '../ui/icon-button'
import { NotificationList } from './NotificationList'
import { notificationHref } from './notification-content'
import { useNotificationsInbox } from './useNotificationsInbox'

// O menu mostra os mais recentes; o resto fica em "Ver todas"
const MENU_LIMIT = 10
// Mesmo ponto em que a barra lateral aparece (lg)
const DESKTOP_QUERY = '(min-width: 1024px)'

/** Sino do cabeçalho: no desktop abre o menu de avisos, no celular a página de notificações */
export function NotificationsButton() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const unreadCount = useNotificationsStore((state) => state.unreadCount)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora, no Esc ou se a janela encolher para o tamanho de celular
  useEffect(() => {
    if (!open) return
    const media = window.matchMedia(DESKTOP_QUERY)
    const close = () => setOpen(false)
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    media.addEventListener('change', close)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      media.removeEventListener('change', close)
    }
  }, [open])

  const toggle = () => {
    if (!window.matchMedia(DESKTOP_QUERY).matches) {
      navigate('/notifications')
      return
    }
    setOpen((current) => !current)
  }

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        icon={Bell}
        variant="surface"
        badge={unreadCount}
        label={unreadCount ? t('notifications.buttonUnread', { count: unreadCount }) : t('notifications.button')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
      />
      {open && <NotificationsMenu onClose={() => setOpen(false)} />}
    </div>
  )
}

/** Montado só com o menu aberto: abrir carrega a lista e zera o sino */
function NotificationsMenu({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const inbox = useNotificationsInbox()

  const go = (href: string) => {
    onClose()
    navigate(href)
  }

  return (
    <div
      role="dialog"
      aria-label={t('notifications.title')}
      className="absolute right-0 top-full mt-2 z-40 w-[400px] flex flex-col rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden animate-fade-in"
    >
      <p className="px-4 pt-4 pb-1 text-base font-semibold text-foreground">{t('notifications.title')}</p>
      <div className="max-h-[min(480px,calc(100vh-12rem))] overflow-y-auto">
        <NotificationList inbox={inbox} variant="menu" limit={MENU_LIMIT} onSelect={(notification) => go(notificationHref(notification))} />
      </div>
      {inbox.items.length > 0 && (
        <button
          type="button"
          onClick={() => go('/notifications')}
          className="h-11 shrink-0 border-t border-border text-sm font-semibold text-primary hover:bg-surface-2 transition-colors"
        >
          {t('notifications.seeAll')}
        </button>
      )}
    </div>
  )
}
