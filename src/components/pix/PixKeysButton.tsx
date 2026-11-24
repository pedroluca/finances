import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, KeyRound, Plus, Settings2 } from 'lucide-react'
import { IconButton } from '../ui/icon-button'
import { Button } from '../ui/button'
import { EmptyState } from '../ui/misc'
import { Sheet } from '../ui/sheet'
import { useToast } from '../Toast'
import { BankBadge } from './BankBadge'
import { phpApiRequest } from '../../lib/api'
import { formatPixKey, groupByBank, normalizePixKeyRow, pixKeyClipboardValue, type PixKey } from '../../lib/pix'
import { useAppStore } from '../../store/app.store'

/** Botão de chave do cabeçalho do painel: abre a lista para copiar uma chave Pix com um clique */
export function PixKeysButton() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const pixKeys = useAppStore((state) => state.pixKeys)
  const [open, setOpen] = useState(false)
  const groups = useMemo(() => groupByBank(pixKeys), [pixKeys])

  const show = () => {
    setOpen(true)
    // Abre na hora com o cache e atualiza por trás
    phpApiRequest('pix_keys.php', { method: 'GET' })
      .then((response) => {
        if (response?.success) useAppStore.getState().setPixKeys((response.data ?? []).map(normalizePixKeyRow))
      })
      .catch(() => {})
  }

  const manage = () => {
    setOpen(false)
    navigate('/settings/pix-keys')
  }

  const copy = async (key: PixKey) => {
    try {
      await navigator.clipboard.writeText(pixKeyClipboardValue(key))
      setOpen(false)
      showToast(t('pix.copied'), 'success')
    } catch {
      showToast(t('pix.copyError'), 'error')
    }
  }

  return (
    <>
      <IconButton icon={KeyRound} variant="surface" label={t('screens.pixKeys')} onClick={show} />

      <Sheet open={open} onClose={() => setOpen(false)} title={t('screens.pixKeys')} description={pixKeys.length ? t('pix.copyHint') : undefined}>
        {pixKeys.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title={t('pix.emptyTitle')}
            description={t('pix.emptyDescription')}
            actionLabel={t('pix.add')}
            actionIcon={Plus}
            onAction={manage}
          />
        ) : (
          <div className="space-y-4 pb-1">
            {groups.map((group) => (
              <div key={group.bank.id} className="space-y-1.5">
                <div className="flex items-center gap-2.5 px-1 pb-0.5">
                  <BankBadge bank={group.bank} size={28} />
                  <p className="text-sm font-semibold text-foreground truncate">{group.bank.name}</p>
                </div>
                {group.keys.map((key) => (
                  <button
                    key={key.id}
                    type="button"
                    title={t('pix.copy')}
                    onClick={() => copy(key)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-left transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-subtle truncate">
                        {t(`pix.types.${key.key_type}`)}{key.label ? ` · ${key.label}` : ''}
                      </p>
                      <p className="font-medium text-foreground truncate">{formatPixKey(key.key_type, key.key_value)}</p>
                    </div>
                    <Copy size={17} className="text-primary shrink-0" />
                  </button>
                ))}
              </div>
            ))}
            <Button label={t('pix.manage')} icon={Settings2} variant="ghost" fullWidth onClick={manage} />
          </div>
        )}
      </Sheet>
    </>
  )
}
