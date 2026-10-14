import { formatCurrency } from '../lib/format'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { useAppStore } from '../store/app.store'
import { phpApiRequest } from '../lib/api'
import type { CardWithBalance } from '../types/database'
import { AlertCircle, CreditCard, DollarSign, Calendar, Palette, Check, Nfc, Plus, Minus } from 'lucide-react'
import { StackContent, StackHeader } from '../components/app-header'
import { CardChip, CardSurface } from '../components/cards/CreditCardTile'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Callout, LoadingState } from '../components/ui/misc'
import { FieldLabel, SelectField, TextField } from '../components/ui/field'
import { fieldClass } from '../lib/formStyles'
import { CARD_RATIO, cardInk, withAlpha } from '../lib/colors'
import { cn } from '../lib/cn'

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1)
const LIMIT_STEP = 100

const CARD_COLORS = [
  { key: 'blue', value: '#3B82F6' },
  { key: 'green', value: '#10B981' },
  { key: 'purple', value: '#8B5CF6' },
  { key: 'pink', value: '#EC4899' },
  { key: 'orange', value: '#FF7A00' },
  { key: 'red', value: '#EF4444' },
  { key: 'cyan', value: '#06B6D4' },
  { key: 'indigo', value: '#6366F1' },
  { key: 'silver', value: '#9CA3AF' },
  { key: 'black', value: '#121212' },
  { key: 'gold', value: '#D4AF37' },
  { key: 'graphite', value: '#2F2F2F' },
] as const

export default function AddCard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cardId } = useParams<{ cardId?: string }>()
  const { user } = useAuthStore()
  const { addCard, cards } = useAppStore()
  const isEditMode = !!cardId

  const [name, setName] = useState('')
  const [cardLimit, setCardLimit] = useState('')
  const [closingDay, setClosingDay] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [color, setColor] = useState<string>(CARD_COLORS[0].value)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCard, setIsLoadingCard] = useState(isEditMode)
  const [error, setError] = useState('')

  // Load existing card data when in edit mode
  useEffect(() => {
    if (!isEditMode || !cardId) return

    const loadCard = async () => {
      try {
        setIsLoadingCard(true)
        // Try to find card in store first
        const existingCard = (cards as CardWithBalance[]).find(
          (c) => (c.card_id ?? c.id) === Number(cardId)
        )

        if (existingCard) {
          setName(existingCard.card_name ?? existingCard.name ?? '')
          setCardLimit(String(existingCard.card_limit ?? 0))
          setClosingDay(String(existingCard.closing_day ?? ''))
          setDueDay(String(existingCard.due_day ?? ''))
          setColor(existingCard.color ?? CARD_COLORS[0].value)
        } else {
          // Fetch from API if not in store
          const cardsData: CardWithBalance[] = await phpApiRequest('cards.php', { method: 'GET' })
          if (Array.isArray(cardsData)) {
            const card = cardsData.find((c) => (c.card_id ?? c.id) === Number(cardId))
            if (card) {
              setName(card.card_name ?? card.name ?? '')
              setCardLimit(String(card.card_limit ?? 0))
              setClosingDay(String(card.closing_day ?? ''))
              setDueDay(String(card.due_day ?? ''))
              setColor(card.color ?? CARD_COLORS[0].value)
            } else {
              setError(t('cards.notFound'))
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar cartão:', err)
        setError(t('cardForm.errors.load'))
      } finally {
        setIsLoadingCard(false)
      }
    }

    loadCard()
  }, [isEditMode, cardId, cards, t])

  const adjustLimit = (delta: number) => {
    const current = parseFloat(cardLimit) || 0
    setCardLimit(String(Math.max(0, current + delta)))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!user) {
      setError(t('cardForm.errors.notAuthenticated'))
      return
    }

    if (!name.trim()) {
      setError(t('cardForm.errors.name'))
      return
    }

    const limit = parseFloat(cardLimit)
    if (isNaN(limit) || limit <= 0) {
      setError(t('cardForm.errors.limit'))
      return
    }

    const closing = parseInt(closingDay)
    if (isNaN(closing) || closing < 1 || closing > 31) {
      setError(t('cardForm.errors.closingDay'))
      return
    }

    const due = parseInt(dueDay)
    if (isNaN(due) || due < 1 || due > 31) {
      setError(t('cardForm.errors.dueDay'))
      return
    }

    try {
      setIsLoading(true)

      if (isEditMode && cardId) {
        // Update existing card
        const updatedCard = await phpApiRequest('cards.php', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            card_id: Number(cardId),
            name: name.trim(),
            card_limit: limit,
            closing_day: closing,
            due_day: due,
            color,
          })
        })

        if (updatedCard) {
          // Refresh all cards to ensure store is synced
          const cardsData = await phpApiRequest('cards.php', { method: 'GET' })
          if (Array.isArray(cardsData)) {
            useAppStore.getState().setCards(cardsData)
          }
          navigate(`/cards/${cardId}`)
        } else {
          setError(t('cardForm.errors.update'))
        }
      } else {
        // Create new card
        const newCard = await phpApiRequest('cards.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            card_limit: limit,
            closing_day: closing,
            due_day: due,
            color,
          })
        })

        if (newCard) {
          addCard(newCard)
          navigate('/dashboard')
        } else {
          setError(t('cardForm.errors.create'))
        }
      }
    } catch (err) {
      console.error(`Erro ao ${isEditMode ? 'atualizar' : 'criar'} cartão:`, err)
      setError(isEditMode ? t('cardForm.errors.update') : t('cardForm.errors.create'))
    } finally {
      setIsLoading(false)
    }
  }

  const goBack = () => navigate(isEditMode ? `/cards/${cardId}` : '/dashboard')
  const title = isEditMode ? t('screens.editCard') : t('screens.addCard')

  if (isLoadingCard) {
    return (
      <div className="min-h-screen bg-background">
        <StackHeader title={title} onBack={goBack} />
        <LoadingState className="py-24" />
      </div>
    )
  }

  const selectedColor = CARD_COLORS.find((c) => c.value === color)
  const selectedColorName = selectedColor ? t(`cardForm.colors.${selectedColor.key}`) : undefined
  const ink = cardInk(color)
  const stepButton = 'w-12 h-12 shrink-0 rounded-xl bg-surface-2 hover:bg-surface-3 text-foreground flex items-center justify-center transition-colors'

  return (
    <div className="min-h-screen bg-background">
      <StackHeader title={title} onBack={goBack} />

      <StackContent className="space-y-4">
        <p className="text-muted px-1">
          {isEditMode ? t('cardForm.editIntro') : t('cardForm.newIntro')}
        </p>

        <Card className="p-4 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <Callout tone="danger" icon={AlertCircle}>{error}</Callout>}

            <TextField
              id="name"
              label={t('cardForm.name')}
              icon={CreditCard}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('cardForm.namePlaceholder')}
              required
              autoFocus={!isEditMode}
            />

            <div>
              <FieldLabel label={t('cardForm.limit')} icon={DollarSign} htmlFor="limit" />
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Diminuir limite" onClick={() => adjustLimit(-LIMIT_STEP)} className={stepButton}>
                  <Minus size={18} />
                </button>
                <input
                  type="number"
                  id="limit"
                  value={cardLimit}
                  onChange={(e) => setCardLimit(e.target.value)}
                  placeholder={t('cardForm.limitPlaceholder', { value: '5000.00' })}
                  step="0.01"
                  min="0"
                  className={cn(fieldClass, 'no-spinner text-center font-semibold min-w-0')}
                  required
                />
                <button type="button" aria-label="Aumentar limite" onClick={() => adjustLimit(LIMIT_STEP)} className={stepButton}>
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SelectField id="closing" label={t('cardForm.closingDay')} icon={Calendar} value={closingDay} onChange={setClosingDay} required>
                <option value="">{t('common.select')}</option>
                {DAY_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </SelectField>
              <SelectField id="due" label={t('cardForm.dueDay')} icon={Calendar} value={dueDay} onChange={setDueDay} required>
                <option value="">{t('common.select')}</option>
                {DAY_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </SelectField>
            </div>

            <div>
              <FieldLabel
                label={t('cardForm.color')}
                icon={Palette}
                right={selectedColorName && <span className="text-xs text-muted">{selectedColorName}</span>}
              />
              <div className="flex flex-wrap gap-3">
                {CARD_COLORS.map((c) => {
                  const selected = color === c.value
                  return (
                    <button
                      key={c.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={t(`cardForm.colors.${c.key}`)}
                      title={t(`cardForm.colors.${c.key}`)}
                      onClick={() => setColor(c.value)}
                      className={cn('w-11 h-11 rounded-full flex items-center justify-center border-2 transition-colors', selected ? 'border-primary' : 'border-transparent hover:border-border')}
                    >
                      <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: c.value, color: cardInk(c.value) }}>
                        {selected && <Check size={16} strokeWidth={3} />}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <FieldLabel label={t('cardForm.preview')} />
              <CardSurface color={color} className="max-w-[400px]" style={{ aspectRatio: CARD_RATIO }}>
                <div className="h-full flex flex-col p-[18px]" style={{ color: ink }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[1px]" style={{ color: withAlpha(ink, 0.75) }}>{t('cardTile.totalLimit')}</p>
                      <p className="text-2xl font-bold truncate">
                        {formatCurrency(parseFloat(cardLimit || '0'))}
                      </p>
                    </div>
                    <Nfc size={24} strokeWidth={1.8} className="shrink-0" style={{ color: withAlpha(ink, 0.85) }} />
                  </div>
                  <div className="mt-3">
                    <CardChip />
                  </div>
                  <div className="mt-auto space-y-0.5">
                    <p className="text-[17px] font-bold truncate">{name.trim() || t('cardForm.name')}</p>
                    <p className="text-xs" style={{ color: withAlpha(ink, 0.8) }}>
                      {t('cardForm.previewDays', { closing: closingDay || '__', due: dueDay || '__' })}
                    </p>
                  </div>
                </div>
              </CardSurface>
            </div>

            <div className="flex gap-3 pt-1">
              <Button label={t('common.cancel')} variant="secondary" onClick={goBack} className="flex-1" />
              <Button
                type="submit"
                label={isLoading ? t('common.saving') : isEditMode ? t('common.save') : t('common.add')}
                icon={CreditCard}
                loading={isLoading}
                className="flex-1"
              />
            </div>
          </form>
        </Card>
      </StackContent>
    </div>
  )
}
