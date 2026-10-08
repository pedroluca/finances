import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ExternalLink,
  EyeOff,
  GripVertical,
  LogOut,
  Moon,
  Repeat,
  ShieldCheck,
  Sun,
  Tag,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import { useAuthStore } from '../store/auth.store'
import { useAppStore } from '../store/app.store'
import { usePrefsStore } from '../store/prefs.store'
import type { ThemeMode } from '../contexts/ThemeContext'
import type { BillingCycle } from '../types/database'
import { LogoMark, StackContent, StackHeader } from '../components/app-header'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { IconTile, ListRow, ListSection, SwitchRow } from '../components/ui/list'
import { SegmentedControl } from '../components/ui/misc'
import ConfirmModal from '../components/ConfirmModal'
import { accents } from '../lib/colors'
import { money, plural } from '../lib/format'
import { version } from '../../package.json'

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Automático' },
]

function toMonthlyEquivalent(amount: number, cycle?: BillingCycle): number {
  if (cycle === 'annual') return amount / 12
  if (cycle === 'semiannual') return amount / 6
  return amount
}

const openExternal = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')

export default function Settings() {
  const navigate = useNavigate()
  const { theme, themeMode, setThemeMode } = useTheme()
  const { user, logout } = useAuthStore()
  const { cards, authors, categories, subscriptions } = useAppStore()
  const hideValues = usePrefsStore((state) => state.hideValues)
  const setHideValues = usePrefsStore((state) => state.setHideValues)
  const [confirmLogout, setConfirmLogout] = useState(false)

  const people = authors.filter((author) => !author.is_owner)
  const linkedPeople = people.filter((author) => !!author.linked_user_email).length
  const personalCategories = categories.filter((category) => !category.is_default).length
  const activeSubscriptions = subscriptions.filter((sub) => sub.active && !sub.paused)
  const subscriptionsMonthly = activeSubscriptions.reduce((sum, sub) => sum + toMonthlyEquivalent(sub.amount, sub.billing_cycle), 0)
  const initial = user?.name?.trim().charAt(0).toUpperCase() || '?'

  const external = <ExternalLink size={16} className="text-subtle shrink-0" />

  return (
    <div className="min-h-screen bg-background">
      <StackHeader title="Configurações" onBack={() => navigate('/dashboard')} />

      <StackContent className="space-y-6">
        {/* Perfil */}
        <Card className="p-4 md:p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center text-[22px] font-bold">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold text-foreground truncate">{user?.name}</p>
              <p className="text-sm text-muted truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <ProfileStat label={plural(cards.length, 'Cartão', 'Cartões')} value={cards.length} />
            <ProfileStat label={plural(people.length, 'Pessoa', 'Pessoas')} value={people.length} />
            <ProfileStat label={plural(activeSubscriptions.length, 'Assinatura', 'Assinaturas')} value={activeSubscriptions.length} />
          </div>
        </Card>

        <ListSection title="Gerenciar">
          <ListRow
            title="Pessoas"
            description={people.length
              ? `${people.length} ${plural(people.length, 'pessoa', 'pessoas')}${linkedPeople ? ` · ${linkedPeople} ${plural(linkedPeople, 'vinculada', 'vinculadas')}` : ''}`
              : 'Quem divide gastos com você'}
            icon={Users}
            iconColor={accents.violet}
            onClick={() => navigate('/settings/manage-authors')}
          />
          <ListRow
            title="Ordem dos cartões"
            description="Como os cartões aparecem no Início"
            icon={GripVertical}
            iconColor={accents.blue}
            onClick={() => navigate('/settings/card-order')}
          />
          <ListRow
            title="Categorias"
            description={personalCategories
              ? `${personalCategories} ${plural(personalCategories, 'personalizada', 'personalizadas')}`
              : 'Crie e organize suas categorias'}
            icon={Tag}
            iconColor={accents.emerald}
            onClick={() => navigate('/settings/categories')}
          />
          <ListRow
            title="Assinaturas"
            description={activeSubscriptions.length ? `${money(subscriptionsMonthly, hideValues)} por mês` : 'Cobranças recorrentes e renovações'}
            icon={Repeat}
            iconColor={accents.amber}
            onClick={() => navigate('/settings/subscriptions')}
          />
        </ListSection>

        <ListSection title="Preferências">
          <div className="px-4 py-3.5 space-y-3">
            <div className="flex items-center gap-3">
              <IconTile icon={theme === 'dark' ? Moon : Sun} color={accents.amber} />
              <div className="flex-1 min-w-0">
                <p className="text-base text-foreground">Aparência</p>
                <p className="text-xs text-muted mt-0.5">O automático segue o tema do aparelho</p>
              </div>
            </div>
            <SegmentedControl options={THEME_OPTIONS} value={themeMode} onChange={setThemeMode} />
          </div>
          <SwitchRow
            title="Ocultar valores"
            description="Esconde os valores no Início, em Contas e em Cartões"
            icon={EyeOff}
            iconColor={accents.gray}
            checked={hideValues}
            onChange={setHideValues}
          />
        </ListSection>

        <ListSection title="Sobre">
          <ListRow title="Política de privacidade" icon={ShieldCheck} iconColor={accents.blue} onClick={() => navigate('/privacy')} />
          <ListRow
            title="Desenvolvedor"
            description="Pedro Luca Prates"
            icon={UserRound}
            iconColor={accents.violet}
            accessory={external}
            onClick={() => openExternal('https://pedroluca.dev.br')}
          />
          <ListRow title="Excluir minha conta" icon={Trash2} destructive onClick={() => navigate('/delete-account')} />
        </ListSection>

        <Button label="Sair da conta" icon={LogOut} variant="danger-soft" fullWidth onClick={() => setConfirmLogout(true)} />

        <div className="flex flex-col items-center gap-2 pb-2">
          <LogoMark size={36} />
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Finances</p>
            <p className="text-xs text-subtle">Versão {version}</p>
          </div>
        </div>
      </StackContent>

      <ConfirmModal
        isOpen={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={logout}
        title="Sair da conta"
        message="Você precisará entrar de novo para ver seus cartões e faturas."
        confirmText="Sair"
        icon={LogOut}
        isDestructive
      />
    </div>
  )
}

function ProfileStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 min-w-0 bg-surface-2 rounded-xl px-3 py-2.5">
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted truncate">{label}</p>
    </div>
  )
}
