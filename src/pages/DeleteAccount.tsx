import { Mail, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/auth.store'
import { StackHeader } from '../components/app-header'

export default function DeleteAccount() {
  const { t } = useTranslation()
  const { user } = useAuthStore()

  const supportEmail = 'pedrolucadev@outlook.com'
  const subject = encodeURIComponent(t('deleteAccount.emailSubject'))
  const body = encodeURIComponent(t('deleteAccount.emailBody', { name: user?.name ?? '', email: user?.email ?? '' }))

  const mailtoLink = `mailto:${supportEmail}?subject=${subject}&body=${body}`

  return (
    <div className="min-h-screen bg-background">
      <StackHeader title={t('deleteAccount.title')} />

      <main className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-12 space-y-4">

        {/* Aviso */}
        <div className="bg-danger/8 rounded-2xl p-5 flex gap-4 text-danger">
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="font-semibold">{t('deleteAccount.warningTitle')}</h2>
            <p className="text-sm leading-5">
              {t('deleteAccount.warning')}
            </p>
          </div>
        </div>

        {/* Card principal */}
        <div className="bg-surface rounded-2xl border border-border p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">
              {t('deleteAccount.howTitle')}
            </h2>
            <p className="text-sm text-muted">
              {t('deleteAccount.how')}
            </p>
          </div>

          <div className="bg-surface-2 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <Mail className="w-4 h-4 text-subtle" />
              <span className="font-medium">{t('deleteAccount.support')}</span>
              <span>{supportEmail}</span>
            </div>
            <p className="text-muted pl-6">
              {t('deleteAccount.processingBefore')} <strong className="text-foreground">{t('deleteAccount.processingDays')}</strong>.
            </p>
          </div>

          <a
            href={mailtoLink}
            className="flex items-center justify-center gap-2 w-full h-12 bg-red-600 hover:bg-red-700 active:opacity-80 text-white font-semibold px-5 rounded-xl transition-colors"
          >
            <Mail className="w-5 h-5" />
            {t('deleteAccount.send')}
          </a>
        </div>

        {/* Aviso LGPD */}
        <p className="text-xs text-center text-subtle px-4">
          {t('deleteAccount.lgpd')}
        </p>
      </main>
    </div>
  )
}
