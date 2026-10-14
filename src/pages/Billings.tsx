import { categoryName } from '../lib/category-name'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useMemo, useRef, type FormEvent } from 'react'
import {
  Plus, Pencil, Trash2, ChevronDown, Receipt, ReceiptText,
  AlertCircle, CheckCircle2, Circle, Repeat, CalendarClock,
} from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import { useAppStore } from '../store/app.store'
import { usePrefsStore } from '../store/prefs.store'
import { phpApiRequest } from '../lib/api'
import { HeaderAddButton, HideValuesButton, SectionTitle, TabContent, TabHeader } from '../components/app-header'
import { NotificationsButton } from '../components/notifications/NotificationsButton'
import type { Bill, BillCharge, CreateBillDTO, UpdateBillDTO } from '../types/database'
import { fieldClass, textareaClass } from '../lib/formStyles'
import { cn } from '../lib/cn'
import { formatCurrency } from '../lib/format'
import { Skeleton } from '../components/ui/skeleton'
import { AnimatedCurrency } from '../components/ui/animated-currency'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { IconButton } from '../components/ui/icon-button'
import { Badge, Callout, Divider, EmptyState, SwitchField } from '../components/ui/misc'
import { FieldLabel, SelectField, StepperField, TextField } from '../components/ui/field'
import { Sheet } from '../components/ui/sheet'
import { SummaryCard } from '../components/summary-card'
import ConfirmModal from '../components/ConfirmModal'
import { useIsFirstVisitThisSession } from '../hooks/useFirstVisitThisSession'

// ── helpers ──────────────────────────────────────────────────────────────────

function parseAmountInput(raw: string): { numeric: number; display: string } {
  const numbers = raw.replace(/\D/g, '')
  if (!numbers) return { numeric: 0, display: '' }
  const numeric = parseInt(numbers) / 100
  const display = formatCurrency(numeric)
  return { numeric, display }
}

/** Cobrança mais relevante pra mostrar no card: a mais antiga ainda não paga, senão a mais recente */
function relevantCharge(charges: BillCharge[]): BillCharge | null {
  if (!charges || charges.length === 0) return null
  const unpaid = charges
    .filter((c) => !c.is_paid)
    .sort((a, b) => (a.reference_year - b.reference_year) || (a.reference_month - b.reference_month))
  if (unpaid.length > 0) return unpaid[0]
  return charges[0]
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr + 'T00:00:00')
  return Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// ── main component ────────────────────────────────────────────────────────────

export default function Billings() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { authors, setAuthors, categories, setCategories, bills, setBills } = useAppStore()
  const hideValues = usePrefsStore((state) => state.hideValues)

  const hadCacheRef = useRef(bills.length > 0)
  const animateOnMount = useIsFirstVisitThisSession('billings')

  const [isLoading, setIsLoading] = useState(bills.length === 0)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [globalError, setGlobalError] = useState('')

  // ── form state ────────────────────────────────────────────────────────────
  const [fDescription, setFDescription] = useState('')
  const [fDueDay, setFDueDay] = useState('10')
  const [fCategoryId, setFCategoryId] = useState('')
  const [fAuthorId, setFAuthorId] = useState('')
  const [fIsRecurring, setFIsRecurring] = useState(true)
  const [fIsFixedAmount, setFIsFixedAmount] = useState(false)
  const [fDefaultAmount, setFDefaultAmount] = useState('')
  const [fDefaultAmountDisplay, setFDefaultAmountDisplay] = useState('')
  const [fInitialAmount, setFInitialAmount] = useState('')
  const [fInitialAmountDisplay, setFInitialAmountDisplay] = useState('')
  const [fNotes, setFNotes] = useState('')
  const [fActive, setFActive] = useState(true)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── load data ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchAll = async () => {
      if (!user) return
      if (!hadCacheRef.current) setIsLoading(true)
      try {
        const [billsRes, authData, catData] = await Promise.all([
          phpApiRequest(`bills.php?user_id=${user.id}`, { method: 'GET' }),
          authors.length ? Promise.resolve(authors) : phpApiRequest('authors.php', { method: 'GET' }),
          categories.length ? Promise.resolve(categories) : phpApiRequest('categories.php', { method: 'GET' }),
        ])
        if (billsRes?.success) setBills(billsRes.data ?? [])
        if (!authors.length) setAuthors(authData)
        if (!categories.length) setCategories(catData)
      } catch (err) {
        console.error(err)
        setGlobalError(t('common.loadError'))
      } finally {
        setIsLoading(false)
      }
    }
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // ── form helpers ──────────────────────────────────────────────────────────

  function resetForm() {
    setFDescription('')
    setFDueDay('10')
    setFCategoryId('')
    setFAuthorId('')
    setFIsRecurring(true)
    setFIsFixedAmount(false)
    setFDefaultAmount('')
    setFDefaultAmountDisplay('')
    setFInitialAmount('')
    setFInitialAmountDisplay('')
    setFNotes('')
    setFActive(true)
    setFormError('')
    setEditingId(null)
  }

  function openCreate() {
    resetForm()
    setShowForm(true)
  }

  function openEdit(bill: Bill) {
    setFDescription(bill.description)
    setFDueDay(String(bill.due_day))
    setFCategoryId(bill.category_id ? String(bill.category_id) : '')
    setFAuthorId(bill.author_id ? String(bill.author_id) : '')
    setFIsRecurring(bill.is_recurring)
    setFIsFixedAmount(bill.is_fixed_amount)
    setFDefaultAmount(bill.default_amount != null ? String(bill.default_amount) : '')
    setFDefaultAmountDisplay(bill.default_amount != null ? formatCurrency(bill.default_amount) : '')
    setFInitialAmount('')
    setFInitialAmountDisplay('')
    setFNotes(bill.notes ?? '')
    setFActive(bill.active)
    setFormError('')
    setEditingId(bill.id)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    resetForm()
  }

  function handleDefaultAmountChange(raw: string) {
    const { numeric, display } = parseAmountInput(raw)
    setFDefaultAmount(String(numeric))
    setFDefaultAmountDisplay(display)
  }

  function handleInitialAmountChange(raw: string) {
    const { numeric, display } = parseAmountInput(raw)
    setFInitialAmount(String(numeric))
    setFInitialAmountDisplay(display)
  }

  // ── submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!user) return

    if (!fDescription.trim()) return setFormError(t('bills.form.errors.description'))
    const dueDayVal = parseInt(fDueDay)
    if (isNaN(dueDayVal) || dueDayVal < 1 || dueDayVal > 31) return setFormError(t('bills.form.errors.dueDay'))

    const defaultAmountVal = fIsFixedAmount ? parseFloat(fDefaultAmount) : null
    if (fIsFixedAmount && (isNaN(defaultAmountVal as number) || (defaultAmountVal as number) <= 0)) {
      return setFormError(t('bills.form.errors.fixedAmount'))
    }

    setIsSubmitting(true)
    try {
      if (editingId !== null) {
        const body: UpdateBillDTO = {
          id: editingId,
          user_id: user.id,
          description: fDescription.trim(),
          category_id: fCategoryId ? parseInt(fCategoryId) : null,
          author_id: fAuthorId ? parseInt(fAuthorId) : null,
          is_recurring: fIsRecurring,
          is_fixed_amount: fIsFixedAmount,
          default_amount: defaultAmountVal,
          due_day: dueDayVal,
          notes: fNotes.trim() || null,
          active: fActive,
        }
        const res = await phpApiRequest('bills.php', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res?.success) {
          setBills(bills.map((b) => b.id === editingId ? res.data : b))
        } else {
          setFormError(res?.message ?? t('bills.form.errors.update'))
          return
        }
      } else {
        const body: CreateBillDTO = {
          user_id: user.id,
          description: fDescription.trim(),
          category_id: fCategoryId ? parseInt(fCategoryId) : null,
          author_id: fAuthorId ? parseInt(fAuthorId) : null,
          is_recurring: fIsRecurring,
          is_fixed_amount: fIsFixedAmount,
          default_amount: defaultAmountVal,
          due_day: dueDayVal,
          notes: fNotes.trim() || null,
          initial_amount: fInitialAmount ? parseFloat(fInitialAmount) : null,
        }
        const res = await phpApiRequest('bills.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res?.success) {
          setBills([res.data, ...bills])
        } else {
          setFormError(res?.message ?? t('bills.form.errors.create'))
          return
        }
      }
      closeForm()
    } catch (err) {
      console.error(err)
      setFormError(t('errors.network'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: number) {
    if (!user) return
    try {
      const res = await phpApiRequest('bills.php', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, user_id: user.id }),
      })
      if (res?.success) {
        setBills(useAppStore.getState().bills.filter((b) => b.id !== id))
      }
    } catch (err) {
      console.error(err)
    }
  }

  // ── charge actions (marcar pago / definir valor) ─────────────────────────

  async function handleUpdateCharge(billId: number, chargeId: number, payload: Record<string, unknown>) {
    if (!user) return
    try {
      const res = await phpApiRequest('bills.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateCharge', charge_id: chargeId, user_id: user.id, ...payload }),
      })
      if (res?.success) {
        setBills(bills.map((b) => {
          if (b.id !== billId) return b
          return { ...b, charges: b.charges.map((c) => c.id === chargeId ? { ...c, ...res.data } : c) }
        }))
      }
    } catch (err) {
      console.error(err)
    }
  }

  // ── computed lists ────────────────────────────────────────────────────────

  const activeList = useMemo(() => bills.filter((b) => b.active), [bills])
  const inactiveList = useMemo(() => bills.filter((b) => !b.active), [bills])

  const monthlyTotal = useMemo(() => {
    return activeList.reduce((sum, b) => {
      const charge = relevantCharge(b.charges)
      return sum + (charge?.amount ?? 0)
    }, 0)
  }, [activeList])

  // ── render ────────────────────────────────────────────────────────────────

  const renderBill = (bill: Bill) => (
    <BillCard
      key={bill.id}
      bill={bill}
      hideValues={hideValues}
      animateOnMount={animateOnMount}
      onEdit={() => openEdit(bill)}
      onDelete={() => setDeletingBill(bill)}
      onUpdateCharge={(chargeId, payload) => handleUpdateCharge(bill.id, chargeId, payload)}
    />
  )

  return (
    <div className="min-h-screen bg-background">
      <TabHeader
        title={t('tabs.bills')}
        right={(
          <>
            <HideValuesButton />
            <NotificationsButton />
            <HeaderAddButton label={t('bills.new')} onClick={openCreate} />
          </>
        )}
      />

      <TabContent>
        {globalError && <Callout tone="danger" icon={AlertCircle}>{globalError}</Callout>}

        {isLoading ? (
          <>
            <Skeleton className="h-[116px] rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <BillCardSkeleton key={i} />
              ))}
            </div>
          </>
        ) : bills.length === 0 ? (
          <Card>
            <EmptyState
              icon={Receipt}
              title={t('bills.emptyTitle')}
              description={t('bills.emptyDescription')}
              actionLabel={t('bills.add')}
              actionIcon={Plus}
              onAction={openCreate}
            />
          </Card>
        ) : (
          <>
            {activeList.length > 0 && (
              <>
                <SummaryCard
                  icon={Receipt}
                  label={t('bills.total')}
                  value={<AnimatedCurrency value={monthlyTotal} hide={hideValues} animateOnMount={animateOnMount} />}
                  caption={t('bills.activeCount', { count: activeList.length })}
                />
                <SectionTitle title={t('bills.activeSection')} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">{activeList.map(renderBill)}</div>
              </>
            )}

            {inactiveList.length > 0 && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowInactive((v) => !v)}
                  className="flex items-center gap-2 py-1 px-1 text-sm text-muted hover:text-foreground transition-colors"
                >
                  <ChevronDown className={cn('w-4 h-4 transition-transform', showInactive && 'rotate-180')} />
                  {t('bills.inactiveCount', { count: inactiveList.length })}
                </button>
                {showInactive && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">{inactiveList.map(renderBill)}</div>}
              </div>
            )}
          </>
        )}
      </TabContent>

      {/* ── Formulário: folha no celular, diálogo no desktop ── */}
      <Sheet open={showForm} onClose={closeForm} title={editingId !== null ? t('bills.form.editTitle') : t('bills.form.newTitle')}>
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
          <TextField
            label={t('bills.form.name')}
            value={fDescription}
            onChange={(e) => setFDescription(e.target.value)}
            placeholder={t('bills.form.namePlaceholder')}
            autoFocus={editingId === null}
            required
          />

          <StepperField
            label={t('bills.form.dueDay')}
            value={Number(fDueDay) || 1}
            onChange={(value) => setFDueDay(String(value))}
            min={1}
            max={31}
          />

          <SwitchField title={t('bills.form.recurring')} description={t('bills.form.recurringHint')} checked={fIsRecurring} onChange={setFIsRecurring} />

          <Divider />

          <SwitchField
            title={t('bills.form.fixed')}
            description={t('bills.form.fixedHint')}
            checked={fIsFixedAmount}
            onChange={setFIsFixedAmount}
          />

          {fIsFixedAmount ? (
            <TextField
              label={t('bills.form.fixedAmount')}
              inputMode="numeric"
              value={fDefaultAmountDisplay}
              onChange={(e) => handleDefaultAmountChange(e.target.value)}
              placeholder={formatCurrency(0)}
              required
            />
          ) : editingId === null && (
            <TextField
              label={t('bills.form.initialAmount')}
              inputMode="numeric"
              value={fInitialAmountDisplay}
              onChange={(e) => handleInitialAmountChange(e.target.value)}
              placeholder={t('bills.form.initialAmountPlaceholder')}
            />
          )}

          <SelectField label={t('bills.form.category')} id="bill-category" value={fCategoryId} onChange={setFCategoryId}>
            <option value="">{t('bills.form.noCategory')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {categoryName(c.name)}</option>
            ))}
          </SelectField>

          <SelectField label={t('bills.form.payer')} id="bill-author" value={fAuthorId} onChange={setFAuthorId}>
            <option value="">{t('bills.form.notDefined')}</option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>{a.is_owner ? `${a.name} ${t('common.youSuffix')}` : a.name}</option>
            ))}
          </SelectField>

          <div>
            <FieldLabel label={t('bills.form.notes')} htmlFor="bill-notes" />
            <textarea
              id="bill-notes"
              value={fNotes}
              onChange={(e) => setFNotes(e.target.value)}
              rows={2}
              placeholder={t('bills.form.notesPlaceholder')}
              className={textareaClass}
            />
          </div>

          {editingId !== null && (
            <>
              <Divider />
              <SwitchField title={t('bills.form.active')} checked={fActive} onChange={setFActive} />
            </>
          )}

          {formError && <Callout tone="danger" icon={AlertCircle}>{formError}</Callout>}

          <div className="flex gap-3 pt-1">
            <Button label={t('common.cancel')} variant="secondary" onClick={closeForm} className="flex-1" />
            <Button
              type="submit"
              label={isSubmitting ? t('common.saving') : editingId !== null ? t('common.save') : t('bills.form.create')}
              loading={isSubmitting}
              className="flex-1"
            />
          </div>
        </form>
      </Sheet>

      <ConfirmModal
        isOpen={!!deletingBill}
        onClose={() => setDeletingBill(null)}
        onConfirm={() => (deletingBill ? handleDelete(deletingBill.id) : undefined)}
        title={t('bills.deleteTitle')}
        message={t('bills.deleteMessage', { name: deletingBill?.description ?? '' })}
        confirmText={t('common.delete')}
        icon={Trash2}
        isDestructive
      />
    </div>
  )
}

// ── Bill Card Skeleton ──────────────────────────────────────────────────────

function BillCardSkeleton() {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    </Card>
  )
}

// ── Bill Card ─────────────────────────────────────────────────────────────────

interface BillCardProps {
  bill: Bill
  hideValues: boolean
  animateOnMount: boolean
  onEdit: () => void
  onDelete: () => void
  onUpdateCharge: (chargeId: number, payload: Record<string, unknown>) => void
}

function BillCard({ bill, hideValues, animateOnMount, onEdit, onDelete, onUpdateCharge }: BillCardProps) {
  const { t } = useTranslation()
  const charge = relevantCharge(bill.charges)
  const [editingAmount, setEditingAmount] = useState(false)
  const [amountDisplay, setAmountDisplay] = useState('')

  function startEditAmount() {
    setAmountDisplay('')
    setEditingAmount(true)
  }

  function confirmAmount() {
    if (!charge) return
    const { numeric } = parseAmountInput(amountDisplay)
    if (numeric <= 0) return
    onUpdateCharge(charge.id, { amount: numeric })
    setEditingAmount(false)
  }

  const days = charge ? daysUntil(charge.due_date) : null
  const paid = !!charge?.is_paid
  const isOverdue = days !== null && days < 0 && !paid
  const isDueToday = days === 0 && !paid
  const isDueSoon = days !== null && days > 0 && days <= 7 && !paid

  const status = paid
    ? { label: t('bills.status.paid'), className: 'bg-success/12 text-success' }
    : isOverdue
      ? { label: t('bills.status.overdue'), className: 'bg-danger/12 text-danger' }
      : isDueToday
        ? { label: t('bills.status.dueToday'), className: 'bg-orange/12 text-orange' }
        : isDueSoon
          ? { label: days === 1 ? t('bills.status.dueTomorrow') : t('bills.status.dueIn', { days }), className: 'bg-warning/12 text-warning' }
          : { label: t('bills.status.dueIn', { days }), className: 'bg-surface-2 text-muted' }

  const tint = bill.category_color ?? '#6366f1'
  const details = [
    t('bills.dueDay', { day: bill.due_day }),
    bill.author_name,
    !bill.is_fixed_amount && bill.is_recurring ? t('bills.variable') : null,
  ].filter(Boolean).join(' · ')

  return (
    <Card className={cn('p-4 space-y-3', !bill.active && 'opacity-60')}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-lg" style={{ backgroundColor: `${tint}26`, color: tint }}>
          {bill.category_icon ?? <ReceiptText size={19} />}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground truncate">{bill.description}</h3>
            {bill.is_recurring && <Badge label={t('bills.recurring')} tone="primary" icon={Repeat} />}
          </div>
          <p className="text-xs text-muted">{details}</p>
        </div>

        <div className="text-right shrink-0">
          {charge && charge.amount !== null ? (
            <p className="font-bold text-foreground">
              <AnimatedCurrency value={charge.amount} hide={hideValues} animateOnMount={animateOnMount} />
            </p>
          ) : (
            <button type="button" onClick={startEditAmount} className="text-xs font-semibold text-warning hover:underline">
              {t('bills.setAmount')}
            </button>
          )}
        </div>
      </div>

      {editingAmount && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            value={amountDisplay}
            onChange={(e) => setAmountDisplay(parseAmountInput(e.target.value).display)}
            onKeyDown={(e) => e.key === 'Enter' && confirmAmount()}
            placeholder={formatCurrency(0)}
            className={cn(fieldClass, 'flex-1 min-w-0')}
          />
          <Button label={t('common.save')} onClick={confirmAmount} />
          <Button label={t('common.cancel')} variant="secondary" onClick={() => setEditingAmount(false)} />
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {charge ? (
          <button
            type="button"
            onClick={() => onUpdateCharge(charge.id, { is_paid: !charge.is_paid })}
            aria-label={paid ? t('bills.markUnpaid') : t('bills.markPaid')}
            title={paid ? t('bills.markUnpaid') : t('bills.markPaid')}
            className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-opacity hover:opacity-80', status.className)}
          >
            {paid ? <CheckCircle2 size={13} /> : <Circle size={13} />}
            {status.label}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-surface-2 text-muted">
            <CalendarClock size={13} /> {t('bills.noCharge')}
          </span>
        )}

        <div className="flex items-center">
          <IconButton icon={Pencil} label={t('common.edit')} size={36} iconSize={17} tone="muted" onClick={onEdit} />
          <IconButton icon={Trash2} label={t('common.delete')} size={36} iconSize={17} tone="muted" onClick={onDelete} />
        </div>
      </div>

      {bill.notes && <p className="text-xs text-subtle italic">{bill.notes}</p>}

      {!paid && charge?.amount === null && (
        <p className="text-xs text-warning flex items-center gap-1">
          <AlertCircle size={12} /> {t('bills.amountMissing')}
        </p>
      )}
    </Card>
  )
}
