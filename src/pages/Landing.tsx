import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  Check,
  CreditCard,
  EyeOff,
  Fingerprint,
  Layers,
  Megaphone,
  Repeat,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tags,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { LogoMark } from '../components/app-header'
import { PhoneFrame } from '../components/landing/phone-frame'
import { currentLanguage } from '../i18n'
import { cn } from '../lib/cn'
import { accents } from '../lib/colors'
import { usePrefsStore } from '../store/prefs.store'

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=br.dev.pedroluca.finances'
const DEVELOPER_URL = 'https://pedroluca.dev.br'

// Prints do app nativo em JPG (1080×2340, a mesma proporção da tela do iPhone)
const screen = (name: string) => `/landing/screens/${name}.jpg`

// O degradê do logo; no escuro, um tom mais claro para o texto não sumir no fundo
const GRADIENT_TEXT = 'bg-gradient-to-r from-[#9710FA] to-[#155DFC] dark:from-[#b45cff] dark:to-[#5b8dff] bg-clip-text text-transparent'

/**
 * Página de apresentação, em "/" para quem não está logado (no navegador; o app instalado vai direto
 * para o login). Os prints ficam em public/landing/screens.
 */
export default function Landing() {
  const { t } = useTranslation()

  const features: { icon: LucideIcon; color: string; key: 'cards' | 'installments' | 'split' | 'subscriptions' | 'upcoming' | 'categories' }[] = [
    { icon: CreditCard, color: accents.violet, key: 'cards' },
    { icon: Layers, color: accents.blue, key: 'installments' },
    { icon: Users, color: accents.emerald, key: 'split' },
    { icon: Repeat, color: accents.amber, key: 'subscriptions' },
    { icon: CalendarClock, color: accents.red, key: 'upcoming' },
    { icon: Tags, color: accents.gray, key: 'categories' },
  ]

  const privacy: { icon: LucideIcon; key: 'lock' | 'hide' | 'device' | 'noAds' }[] = [
    { icon: Fingerprint, key: 'lock' },
    { icon: EyeOff, key: 'hide' },
    { icon: Smartphone, key: 'device' },
    { icon: Megaphone, key: 'noAds' },
  ]

  return (
    <div className="min-h-dvh overflow-x-clip bg-background text-foreground">
      <Header />

      {/* Abertura */}
      <section className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-16 h-[560px] bg-[radial-gradient(60%_60%_at_70%_30%,rgba(151,16,250,0.18),transparent_70%),radial-gradient(50%_50%_at_20%_10%,rgba(21,93,252,0.14),transparent_70%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-24">
          <div className="text-center lg:text-left">
            <a
              href="#sugestoes"
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-[13px] font-medium text-primary transition-colors hover:bg-primary/15"
            >
              <Sparkles size={14} />
              {t('landing.hero.badge')}
            </a>
            <h1 className="mt-5 text-[40px] font-extrabold leading-[1.06] tracking-tight sm:text-5xl lg:text-[64px]">
              {t('landing.hero.titleStart')} <span className={GRADIENT_TEXT}>{t('landing.hero.titleHighlight')}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted lg:mx-0">{t('landing.hero.subtitle')}</p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <PlayStoreButton />
              <WebAppLink />
            </div>
            <p className="mt-4 text-sm text-subtle">{t('landing.hero.note')}</p>
          </div>

          <div className="relative mx-auto w-full max-w-[440px]">
            <div aria-hidden className="absolute inset-x-8 top-16 bottom-4 rounded-full bg-gradient-to-br from-[#9710FA]/45 to-[#155DFC]/45 blur-3xl" />
            <PhoneFrame src={screen('card')} alt={t('landing.screens.card')} className="absolute left-[3%] top-14 w-[46%] -rotate-[7deg]" />
            <PhoneFrame src={screen('home')} alt={t('landing.screens.home')} priority className="relative ml-auto mr-[4%] w-[58%] rotate-[3deg]" />
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <SectionHeading kicker={t('landing.features.kicker')} title={t('landing.features.title')} subtitle={t('landing.features.subtitle')} />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, color, key }) => (
            <div key={key} className="rounded-2xl border border-border bg-surface p-6 transition-transform hover:-translate-y-0.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1F` }}>
                <Icon size={22} color={color} strokeWidth={2.2} />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{t(`landing.features.${key}.title`)}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{t(`landing.features.${key}.text`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* O app em detalhes */}
      <section className="mx-auto max-w-6xl space-y-24 px-4 py-16 sm:px-6 lg:space-y-32 lg:py-24">
        <Showcase section="quick" image="new-expense" alt={t('landing.screens.newExpense')} />
        <Showcase id="sugestoes" section="suggestions" image="suggestion" alt={t('landing.screens.suggestion')} reverse highlight />
        <Showcase section="widgets" image="widgets" alt={t('landing.screens.widgets')} />
        <Showcase section="split" image="split" alt={t('landing.screens.split')} reverse />
      </section>

      {/* Privacidade */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8 sm:p-12">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
                <ShieldCheck size={24} className="text-primary" />
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight">{t('landing.privacy.title')}</h2>
              <p className="mt-3 text-lg leading-relaxed text-muted">{t('landing.privacy.text')}</p>
              <Link to="/privacy" className="mt-5 inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
                {t('landing.privacy.link')}
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {privacy.map(({ icon: Icon, key }) => (
                <div key={key} className="rounded-2xl bg-surface-2 p-5">
                  <Icon size={20} className="text-primary" />
                  <h3 className="mt-3 font-semibold">{t(`landing.privacy.${key}.title`)}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{t(`landing.privacy.${key}.text`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Chamada final */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#9710FA] to-[#155DFC] px-6 py-14 text-center text-white sm:px-12 sm:py-16">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.22),transparent_45%),radial-gradient(circle_at_90%_100%,rgba(255,255,255,0.12),transparent_40%)]" />
          <div className="relative flex flex-col items-center">
            <div className="rounded-[18px] bg-white/15 p-1.5 ring-1 ring-white/25">
              <LogoMark size={56} />
            </div>
            <h2 className="mt-6 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">{t('landing.cta.title')}</h2>
            <p className="mt-3 max-w-xl text-lg text-white/85">{t('landing.cta.text')}</p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <PlayStoreButton inverted />
              <WebAppLink inverted />
            </div>
            <p className="mt-5 max-w-md text-sm text-white/75">{t('landing.iphone')}</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5">
            <LogoMark size={24} />
            <span>© {new Date().getFullYear()} Finances · Pedro Luca Prates</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            <Link to="/privacy" className="hover:text-foreground">{t('landing.footer.privacy')}</Link>
            <Link to="/delete-account" className="hover:text-foreground">{t('landing.footer.deleteAccount')}</Link>
            <a href={DEVELOPER_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">{t('landing.footer.developer')}</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}

function Header() {
  const { t } = useTranslation()
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 text-lg font-bold">
          <LogoMark size={34} />
          Finances
        </Link>
        <div className="flex-1" />
        <LanguageToggle />
        <Link to="/login" className="inline-flex h-9 items-center rounded-lg bg-surface-2 px-4 text-sm font-semibold transition-colors hover:bg-surface-3">
          {t('landing.signIn')}
        </Link>
      </div>
    </header>
  )
}

/** PT/EN para quem chega pela primeira vez (o padrão segue o idioma do navegador) */
function LanguageToggle() {
  const setLanguage = usePrefsStore((state) => state.setLanguage)
  const active = currentLanguage()
  const options = [
    { value: 'pt-BR', label: 'PT' },
    { value: 'en', label: 'EN' },
  ] as const
  return (
    <div className="flex rounded-lg bg-surface-2 p-0.5 text-xs font-semibold">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLanguage(option.value)}
          aria-pressed={active === option.value}
          className={cn('rounded-md px-2.5 py-1.5 transition-colors', active === option.value ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground')}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function SectionHeading({ kicker, title, subtitle }: { kicker: string; title: string; subtitle: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="text-sm font-semibold uppercase tracking-wider text-primary">{kicker}</span>
      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-4 text-lg leading-relaxed text-muted">{subtitle}</p>
    </div>
  )
}

type ShowcaseProps = {
  id?: string
  section: 'quick' | 'suggestions' | 'widgets' | 'split'
  image: string
  alt: string
  /** Print à direita no desktop */
  reverse?: boolean
  /** O recurso novo ganha o selo no título */
  highlight?: boolean
}

function Showcase({ id, section, image, alt, reverse, highlight }: ShowcaseProps) {
  const { t } = useTranslation()
  const points = [t(`landing.showcase.${section}.point1`), t(`landing.showcase.${section}.point2`), t(`landing.showcase.${section}.point3`)]
  return (
    <div id={id} className="grid scroll-mt-24 items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={cn('relative mx-auto w-full max-w-[300px]', reverse && 'lg:order-2')}>
        <div aria-hidden className="absolute inset-8 rounded-full bg-gradient-to-br from-[#9710FA]/35 to-[#155DFC]/35 blur-3xl" />
        <PhoneFrame src={screen(image)} alt={alt} className="relative mx-auto w-[250px] sm:w-[280px]" />
      </div>
      <div className="text-center lg:text-left">
        <span className={cn('inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-primary', highlight && 'rounded-full bg-primary/10 px-3 py-1')}>
          {highlight && <Sparkles size={14} />}
          {t(`landing.showcase.${section}.kicker`)}
        </span>
        <h3 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{t(`landing.showcase.${section}.title`)}</h3>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted lg:mx-0">{t(`landing.showcase.${section}.text`)}</p>
        <ul className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
          {points.map((point) => (
            <li key={point} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-medium">
              <Check size={14} className="text-primary" strokeWidth={3} />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function PlayStoreButton({ inverted }: { inverted?: boolean }) {
  const { t } = useTranslation()
  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex h-14 items-center gap-3 rounded-2xl px-5 transition-transform hover:-translate-y-0.5',
        inverted ? 'bg-white text-gray-900' : 'bg-gray-950 text-white ring-1 ring-white/10 dark:bg-white dark:text-gray-900',
      )}
    >
      <GooglePlayIcon />
      <span className="flex flex-col items-start leading-none">
        <span className="text-[11px] font-medium opacity-75">{t('landing.store')}</span>
        <span className="mt-1 text-lg font-semibold">Google Play</span>
      </span>
    </a>
  )
}

function WebAppLink({ inverted }: { inverted?: boolean }) {
  const { t } = useTranslation()
  return (
    <Link
      to="/login"
      className={cn(
        'inline-flex h-14 items-center gap-2 rounded-2xl px-6 font-semibold transition-colors',
        inverted ? 'text-white ring-1 ring-white/40 hover:bg-white/10' : 'border border-border hover:bg-surface-2',
      )}
    >
      {t('landing.useWeb')}
      <ArrowRight size={18} />
    </Link>
  )
}

function GooglePlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
      <path fill="#00A0FF" d="M3.5 2.2 13.4 12l-9.9 9.8c-.3-.3-.5-.8-.5-1.4V3.6c0-.6.2-1.1.5-1.4Z" />
      <path fill="#00E676" d="M3.5 2.2c.4-.4 1.1-.4 1.8 0l11.5 6.5-3.4 3.3-9.9-9.8Z" />
      <path fill="#FFC107" d="m16.8 8.7 3.6 2.1c1 .6 1 1.8 0 2.4l-3.6 2.1-3.4-3.3 3.4-3.3Z" />
      <path fill="#FF3D00" d="m13.4 12 3.4 3.3-11.5 6.5c-.7.4-1.4.4-1.8 0l9.9-9.8Z" />
    </svg>
  )
}
