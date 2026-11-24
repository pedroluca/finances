import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ClipboardPaste, Copy, KeyRound, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAppStore } from '../../store/app.store'
import { phpApiRequest } from '../../lib/api'
import { useToast } from '../../components/Toast'
import ConfirmModal from '../../components/ConfirmModal'
import { StackContent, StackHeader } from '../../components/app-header'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { IconButton } from '../../components/ui/icon-button'
import { FieldLabel, TextField } from '../../components/ui/field'
import { Callout, Chip, EmptyState, LoadingState } from '../../components/ui/misc'
import { Sheet } from '../../components/ui/sheet'
import {
  BANKS,
  OTHER_BANK,
  PIX_KEY_TYPES,
  detectPixKeyType,
  formatPixKey,
  groupByBank,
  normalizePixKey,
  normalizePixKeyRow,
  pixKeyClipboardValue,
  type PixKey,
  type PixKeyInput,
  type PixKeyType,
} from '../../lib/pix'
import { cn } from '../../lib/cn'
import { BankBadge } from '../../components/pix/BankBadge'

export default function ManagePixKeys() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const pixKeys = useAppStore((state) => state.pixKeys)
  const setPixKeys = useAppStore((state) => state.setPixKeys)

  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<PixKey | null>(null)
  const [form, setForm] = useState<{ open: boolean; pixKey: PixKey | null; bank?: string; key: number }>({ open: false, pixKey: null, key: 0 })
  const openForm = (pixKey: PixKey | null, bank?: string) => setForm((current) => ({ open: true, pixKey, bank, key: current.key + 1 }))

  useEffect(() => {
    phpApiRequest('pix_keys.php', { method: 'GET' })
      .then((response) => {
        if (response?.success) setPixKeys((response.data ?? []).map(normalizePixKeyRow))
        setLoadError('')
      })
      .catch(() => {
        // Com chaves em cache a tela segue funcionando sem internet
        if (useAppStore.getState().pixKeys.length === 0) setLoadError(t('pix.loadError'))
      })
      .finally(() => setLoaded(true))
  }, [setPixKeys, t])

  const groups = useMemo(() => groupByBank(pixKeys), [pixKeys])

  const copy = async (key: PixKey) => {
    try {
      await navigator.clipboard.writeText(pixKeyClipboardValue(key))
      setCopiedId(key.id)
      setTimeout(() => setCopiedId((current) => (current === key.id ? null : current)), 1800)
      showToast(t('pix.copied'), 'success')
    } catch {
      showToast(t('pix.copyError'), 'error')
    }
  }

  const remove = async (key: PixKey) => {
    try {
      await phpApiRequest(`pix_keys.php?id=${key.id}`, { method: 'DELETE' })
      setPixKeys(useAppStore.getState().pixKeys.filter((item) => item.id !== key.id))
      showToast(t('pix.deleted'), 'success')
    } catch {
      showToast(t('pix.deleteError'), 'error')
    }
  }

  const isLoading = !loaded && pixKeys.length === 0

  return (
    <div className="min-h-screen bg-background">
      <StackHeader title={t('screens.pixKeys')} onBack={() => navigate('/settings')} />

      <StackContent className="space-y-4">
        {!!loadError && <Callout tone="danger">{loadError}</Callout>}

        {isLoading ? (
          <LoadingState />
        ) : pixKeys.length === 0 ? (
          <Card>
            <EmptyState
              icon={KeyRound}
              title={t('pix.emptyTitle')}
              description={t('pix.emptyDescription')}
              actionLabel={t('pix.add')}
              actionIcon={Plus}
              onAction={() => openForm(null)}
            />
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 px-1 min-h-9">
              <p className="text-sm text-muted">{t('pix.copyHint')}</p>
              <Button label={t('common.new')} icon={Plus} size="sm" onClick={() => openForm(null)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {groups.map((group) => (
                <Card key={group.bank.id} className="overflow-hidden">
                  <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
                    <BankBadge bank={group.bank} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{group.bank.name}</p>
                      <p className="text-xs text-subtle">{t('settings.pixKeys.count', { count: group.keys.length })}</p>
                    </div>
                    <IconButton icon={Plus} label={t('pix.add')} size={36} iconSize={18} tone="muted" onClick={() => openForm(null, group.keys[0].bank)} />
                  </div>

                  {group.keys.map((key) => {
                    const copied = copiedId === key.id
                    return (
                      <div key={key.id} className="flex items-center gap-1 pr-2 border-t border-border">
                        <button
                          type="button"
                          onClick={() => copy(key)}
                          title={t('pix.copy')}
                          className="flex-1 min-w-0 flex items-center gap-3 pl-4 pr-2 py-3 text-left hover:bg-surface-2 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-subtle truncate">
                              {t(`pix.types.${key.key_type}`)}{key.label ? ` · ${key.label}` : ''}
                            </p>
                            <p className="font-medium text-foreground truncate">{formatPixKey(key.key_type, key.key_value)}</p>
                          </div>
                          <span className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-surface-2">
                            {copied ? <Check size={17} className="text-success" /> : <Copy size={16} className="text-primary" />}
                          </span>
                        </button>
                        <IconButton icon={Pencil} label={t('pix.edit')} size={36} iconSize={16} tone="muted" onClick={() => openForm(key)} />
                        <IconButton icon={Trash2} label={t('pix.delete')} size={36} iconSize={16} tone="muted" onClick={() => setDeleting(key)} />
                      </div>
                    )
                  })}
                </Card>
              ))}
            </div>
          </>
        )}
      </StackContent>

      <PixKeyFormSheet
        key={form.key}
        open={form.open}
        pixKey={form.pixKey}
        initialBank={form.bank}
        onClose={() => setForm((current) => ({ ...current, open: false }))}
      />

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => (deleting ? remove(deleting) : undefined)}
        title={t('pix.deleteTitle')}
        message={t('pix.deleteMessage', { key: deleting ? formatPixKey(deleting.key_type, deleting.key_value) : '' })}
        confirmText={t('common.delete')}
        icon={Trash2}
        isDestructive
      />
    </div>
  )
}

function PixKeyFormSheet({ open, pixKey, initialBank, onClose }: {
  open: boolean
  /** Chave em edição; null cria uma nova */
  pixKey: PixKey | null
  /** Banco já escolhido ao adicionar mais uma chave num banco */
  initialBank?: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const isEditing = pixKey !== null

  const [bank, setBank] = useState(pixKey?.bank ?? initialBank ?? '')
  const [bankName, setBankName] = useState(pixKey?.bank_name ?? '')
  const [type, setType] = useState<PixKeyType>(pixKey?.key_type ?? 'cpf')
  // O usuário escolheu o tipo na mão: a detecção automática para de trocar
  const [typeTouched, setTypeTouched] = useState(isEditing)
  const [value, setValue] = useState(pixKey ? formatPixKey(pixKey.key_type, pixKey.key_value) : '')
  const [label, setLabel] = useState(pixKey?.label ?? '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const changeValue = (text: string) => {
    setValue(text)
    if (!typeTouched) {
      const detected = detectPixKeyType(text)
      if (detected) setType(detected)
    }
  }

  const paste = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (text) changeValue(text)
    } catch {
      // Sem permissão para ler a área de transferência: o usuário cola com Ctrl+V
    }
  }

  const submit = async () => {
    setError('')
    if (!bank) return setError(t('pix.form.errors.bank'))
    if (bank === OTHER_BANK && !bankName.trim()) return setError(t('pix.form.errors.bankName'))
    const normalized = normalizePixKey(type, value)
    if (!normalized) return setError(t('pix.form.errors.key', { type: t(`pix.types.${type}`) }))

    const body: PixKeyInput & { id?: number } = {
      bank,
      bank_name: bank === OTHER_BANK ? bankName.trim() : null,
      key_type: type,
      key_value: normalized,
      label: label.trim() || null,
    }

    setSubmitting(true)
    try {
      const response = await phpApiRequest('pix_keys.php', {
        method: isEditing ? 'PUT' : 'POST',
        body: JSON.stringify(isEditing ? { ...body, id: pixKey.id } : body),
      })
      if (!response?.success) return setError(response?.message ?? t('pix.form.errors.save'))
      const saved = normalizePixKeyRow(response.data)
      const { pixKeys, setPixKeys } = useAppStore.getState()
      setPixKeys(isEditing ? pixKeys.map((key) => (key.id === saved.id ? saved : key)) : [...pixKeys, saved])
      showToast(isEditing ? t('pix.form.updated') : t('pix.form.created'), 'success')
      onClose()
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('pix.form.errors.save'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEditing ? t('pix.form.editTitle') : t('pix.form.newTitle')}
      footer={<Button label={t('common.save')} loading={submitting} fullWidth onClick={submit} />}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div className="space-y-2">
          <FieldLabel label={t('pix.form.bank')} />
          <div className="flex flex-wrap gap-2">
            {BANKS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={bank === item.id}
                onClick={() => setBank(item.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 h-9 pl-1 pr-3 rounded-full border text-[13px] font-medium text-foreground transition-colors',
                  bank === item.id ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:bg-surface-2',
                )}
              >
                <BankBadge bank={item} size={26} />
                {item.name}
              </button>
            ))}
            <Chip label={t('pix.form.otherBank')} selected={bank === OTHER_BANK} onClick={() => setBank(OTHER_BANK)} />
          </div>
          {bank === OTHER_BANK && (
            <TextField value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder={t('pix.form.bankNamePlaceholder')} aria-label={t('pix.form.bankName')} />
          )}
        </div>

        <div className="space-y-2">
          <FieldLabel label={t('pix.form.type')} />
          <div className="flex flex-wrap gap-2">
            {PIX_KEY_TYPES.map((item) => (
              <Chip
                key={item}
                label={t(`pix.types.${item}`)}
                size="sm"
                selected={type === item}
                onClick={() => {
                  setType(item)
                  setTypeTouched(true)
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <FieldLabel
            label={t('pix.form.key')}
            htmlFor="pix-key-value"
            right={
              <button type="button" onClick={paste} className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                <ClipboardPaste size={14} />
                {t('pix.form.paste')}
              </button>
            }
          />
          <TextField
            id="pix-key-value"
            value={value}
            onChange={(e) => changeValue(e.target.value)}
            placeholder={t(`pix.form.placeholders.${type}`)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode={type === 'email' ? 'email' : type === 'random' ? 'text' : 'tel'}
          />
        </div>

        <TextField label={t('pix.form.label')} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('pix.form.labelPlaceholder')} />

        {!!error && <Callout tone="danger">{error}</Callout>}
        <button type="submit" hidden />
      </form>
    </Sheet>
  )
}
