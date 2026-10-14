import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { StackContent, StackHeader } from '../components/app-header'
import { NotificationList } from '../components/notifications/NotificationList'
import { notificationHref } from '../components/notifications/notification-content'
import { useNotificationsInbox } from '../components/notifications/useNotificationsInbox'
import { Button } from '../components/ui/button'

/** Histórico completo (no celular o sino abre aqui; no desktop, pelo "Ver todas" do menu) */
export default function Notifications() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const inbox = useNotificationsInbox()

  // Aberta por link direto não há para onde voltar: vai para o Início
  const back = () => (window.history.state?.idx ? navigate(-1) : navigate('/dashboard'))

  return (
    <div className="min-h-screen bg-background">
      <StackHeader title={t('notifications.title')} onBack={back} />

      <StackContent className="space-y-6">
        <NotificationList inbox={inbox} variant="page" onSelect={(notification) => navigate(notificationHref(notification))} />

        {inbox.hasMore && inbox.items.length > 0 && (
          <Button label={t('notifications.loadMore')} variant="outline" fullWidth loading={inbox.loadingMore} onClick={inbox.loadMore} />
        )}
      </StackContent>
    </div>
  )
}
