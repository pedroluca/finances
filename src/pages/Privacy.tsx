import { useTranslation } from 'react-i18next'
import { StackHeader } from '../components/app-header'

// Seções da política: título e texto em privacy.<seção>, e as chaves dos itens da lista (quando há)
const SECTIONS = [
  { key: 'collect', items: ['privacy.collect.item1', 'privacy.collect.item2', 'privacy.collect.item3'] },
  { key: 'use', items: ['privacy.use.item1', 'privacy.use.item2', 'privacy.use.item3', 'privacy.use.item4'] },
  {
    key: 'notifications',
    items: [
      'privacy.notifications.item1',
      'privacy.notifications.item2',
      'privacy.notifications.item3',
      'privacy.notifications.item4',
      'privacy.notifications.item5',
    ],
  },
  { key: 'sharing', items: [] },
  { key: 'security', items: [] },
  { key: 'rights', items: ['privacy.rights.item1', 'privacy.rights.item2', 'privacy.rights.item3'] },
  { key: 'retention', items: [] },
  { key: 'changes', items: [] },
] as const

export default function Privacy() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-background">
      <StackHeader title={t('privacy.title')} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-12">
        <div className="bg-surface rounded-2xl border border-border p-6 md:p-8 space-y-6 text-muted leading-relaxed">

          <p className="text-sm text-subtle">
            {t('privacy.updated')}
          </p>

          <p>
            {t('privacy.introBefore')} <strong className="text-foreground">Finances</strong>{t('privacy.introAfter')}
          </p>

          {SECTIONS.map(({ key, items }, index) => (
            <section key={key} className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">{index + 1}. {t(`privacy.${key}.title`)}</h2>
              <p>{t(`privacy.${key}.body`)}</p>
              {items.length > 0 && (
                <ul className="list-disc list-inside space-y-1 pl-2">
                  {items.map((item) => <li key={item}>{t(item)}</li>)}
                </ul>
              )}
            </section>
          ))}

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{SECTIONS.length + 1}. {t('privacy.contact.title')}</h2>
            <p>
              {t('privacy.contact.body')}{' '}
              <a
                href="mailto:pedrolucadev@outlook.com"
                className="text-primary hover:underline"
              >
                pedrolucadev@outlook.com
              </a>
            </p>
          </section>

        </div>
      </main>
    </div>
  )
}
