import { useTranslation } from "react-i18next"
import { useState, useEffect, useMemo, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "../store/auth.store"
import { useAppStore } from "../store/app.store"
import { phpApiRequest } from "../lib/api"
import type { Author, CardWithBalance } from "../types/database"
import {
  AlertCircle,
  DollarSign,
  FileText,
  Calendar,
  Tag,
  Plus,
  Repeat,
  MessageSquare,
} from "lucide-react"
import CategoryBadgeSelector from "./CategoryBadgeSelector"
import AuthorSplitSection, { type SplitAssignment } from "./AuthorSplitSection"
import { fieldClass, textareaClass } from "../lib/formStyles"
import { cn } from "../lib/cn"
import { formatDecimal } from "../lib/format"
import { Sheet } from "./ui/sheet"
import { Button } from "./ui/button"
import { Callout, LoadingState } from "./ui/misc"
import { FieldLabel, StepperField, TextField } from "./ui/field"

const SUBSCRIPTION_CATEGORY_ID = 7

interface AddItemFormProps {
  card: CardWithBalance
  linkedAuthorId?: number // ID do autor vinculado para cartões compartilhados
  cardOwnerAuthors?: Author[] // Autores da conta do dono do cartão (para compartilhados)
  isAuthorLocked?: boolean // Se true, não permite alterar o autor (cartões compartilhados)
  /** Botão Cancelar (e "Ir para Assinaturas") */
  onCancel: () => void
  /** Depois de salvar com sucesso */
  onSaved: () => void
  /** Antes de gravar (ex.: garantir que a fatura do mês da compra existe) */
  prepare?: (purchaseDate: string) => Promise<unknown>
}

interface AddItemModalProps extends Omit<AddItemFormProps, 'onCancel' | 'onSaved'> {
  /** Fatura do mês visto (já garantida antes de abrir) */
  invoiceId: number
  open: boolean
  onClose: () => void
  onItemAdded?: () => void
}

/** "Adicionar Item" da fatura do cartão */
export default function AddItemModal({ open, onClose, onItemAdded, ...formProps }: AddItemModalProps) {
  const { t } = useTranslation()
  return (
    <Sheet open={open} onClose={onClose} title={t('items.addTitle')} size="lg">
      <AddItemForm
        {...formProps}
        onCancel={onClose}
        onSaved={() => {
          if (onItemAdded) onItemAdded()
          onClose()
        }}
      />
    </Sheet>
  )
}

/** Campos do item; a mesma base serve à fatura do cartão e à "Nova despesa" da tab bar */
export function AddItemForm({
  card,
  linkedAuthorId,
  cardOwnerAuthors,
  isAuthorLocked = false,
  onCancel,
  onSaved,
  prepare,
}: AddItemFormProps) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { categories, setCategories, authors, setAuthors, addAuthor } =
    useAppStore()
  const [isDataLoading, setIsDataLoading] = useState(false)

  // Use cardOwnerAuthors se fornecido (para cartões compartilhados), senão use authors do store
  const availableAuthors = cardOwnerAuthors || authors

  const defaultAuthor = useMemo(
    () => linkedAuthorId
      ? availableAuthors.find((a) => a.id === linkedAuthorId)
      : availableAuthors.find((a) => a.is_owner),
    [availableAuthors, linkedAuthorId]
  )

  useEffect(() => {
    const fetchData = async () => {
      setIsDataLoading(true)
      try {
        if (!categories.length) {
          const categoriesData = await phpApiRequest("categories.php", {
            method: "GET",
          })
          setCategories(categoriesData)
        }
        if (!authors.length) {
          const authorsData = await phpApiRequest("authors.php", {
            method: "GET",
          })
          setAuthors(authorsData)
        }
      } finally {
        setIsDataLoading(false)
      }
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [displayAmount, setDisplayAmount] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [authorId, setAuthorId] = useState("")
  const [notes, setNotes] = useState("")

  // Split logic
  const [isSplit, setIsSplit] = useState(false)
  const [assignments, setAssignments] = useState<SplitAssignment[]>([])

  useEffect(() => {
    if (defaultAuthor && !authorId) {
      setAuthorId(defaultAuthor.id.toString())
    }
  }, [defaultAuthor, authorId])

  // Ao trocar de cartão (Nova despesa), a pessoa escolhida pode não existir nas pessoas dele
  const effectiveAuthorId = availableAuthors.some((a) => String(a.id) === authorId)
    ? authorId
    : defaultAuthor ? String(defaultAuthor.id) : ""

  const [newAuthorName, setNewAuthorName] = useState("")
  const [showNewAuthor, setShowNewAuthor] = useState(false)
  const [purchaseDate, setPurchaseDate] = useState(() => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, "0")
    const dd = String(now.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  })
  const [isInstallment, setIsInstallment] = useState(false)
  const [installments, setInstallments] = useState("1")
  const [currentInstallment, setCurrentInstallment] = useState("1")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleAmountChange = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    if (numbers === "") {
      setAmount("")
      setDisplayAmount("")
      return
    }
    const numValue = parseInt(numbers) / 100
    setAmount(numValue.toString())
    const formatted = formatDecimal(numValue)
    setDisplayAmount(`R$ ${formatted}`)
  }

  const exceedsAvailableLimit =
    amount !== "" && parseFloat(amount) > card.available_balance

  const getSplitTotal = () => assignments.reduce((acc, curr) => acc + curr.amount, 0)

  const formatCurrency = (val: number) => {
    return formatDecimal(val)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!user || !card) {
      setError(t('items.errors.invalid'))
      return
    }
    if (!description.trim()) {
      setError(t('items.errors.description'))
      return
    }
    const amountValue = parseFloat(amount)
    if (isNaN(amountValue) || amountValue <= 0) {
      setError(t('items.errors.amount'))
      return
    }

    // Validação do split (cartão compartilhado não divide: o item é sempre da pessoa vinculada)
    if (isSplit && !isAuthorLocked) {
        if (assignments.length === 0) {
            setError(t('items.errors.splitEmpty'))
            return
        }
        const splitTotal = getSplitTotal()
        if (Math.abs(splitTotal - amountValue) > 0.05) {
            setError(t('items.errors.splitMismatch', { split: `R$ ${formatCurrency(splitTotal)}`, total: `R$ ${formatCurrency(amountValue)}` }))
            return
        }
    }

    let selectedAuthorId = isAuthorLocked
      ? defaultAuthor?.id
      : effectiveAuthorId ? Number(effectiveAuthorId) : defaultAuthor?.id
    if (!isAuthorLocked && showNewAuthor && newAuthorName.trim()) {
      try {
        setIsLoading(true)
        const newAuthor = await phpApiRequest("authors.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            name: newAuthorName.trim(),
            is_owner: false,
          }),
        })
        if (newAuthor && newAuthor.id) {
          addAuthor(newAuthor)
          setAuthorId(newAuthor.id.toString())
          selectedAuthorId = newAuthor.id
        } else {
          selectedAuthorId = defaultAuthor?.id
          setShowNewAuthor(false)
        }
        setIsLoading(false)
      } catch (err) {
        console.log(err)
        selectedAuthorId = defaultAuthor?.id
        setShowNewAuthor(false)
        setIsLoading(false)
      }
    }
    if (!selectedAuthorId) {
      setError(t('items.errors.author'))
      return
    }

    const assignmentsPayload = isSplit && !isAuthorLocked ? assignments : []
    const notesValue = notes.trim() || null
    // card_id é o id da view card_available_balance (o mesmo usado nas rotas e faturas)
    const cardIdToSend = card.card_id ?? card.id

    try {
      setIsLoading(true)
      if (prepare) await prepare(purchaseDate)
      if (isInstallment && Number(installments) > 1) {
        const payload = {
          action: "createInstallment",
          card_id: cardIdToSend,
          description: description.trim(),
          total_amount: amountValue,
          total_installments: Number(installments),
          author_id: selectedAuthorId,
          ...(categoryId ? { category_id: Number(categoryId) } : {}),
          purchase_date: purchaseDate,
          current_installment: Number(currentInstallment),
          notes: notesValue,
          assignments: assignmentsPayload
        }
        await phpApiRequest("items.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        await phpApiRequest("items.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            card_id: cardIdToSend,
            description: description.trim(),
            amount: amountValue,
            author_id: selectedAuthorId,
            ...(categoryId ? { category_id: Number(categoryId) } : {}),
            purchase_date: purchaseDate,
            notes: notesValue,
            assignments: assignmentsPayload
          }),
        })
      }
      onSaved()
    } catch (err) {
      console.log(err)
      setError(t('items.errors.create'))
    } finally {
      setIsLoading(false)
    }
  }

  const installmentsCount = Number(installments) || 1
  const remainingInstallments = installmentsCount - Number(currentInstallment) + 1

  const changeInstallments = (value: number) => {
    setInstallments(String(value))
    setIsInstallment(value > 1)
    if (value < Number(currentInstallment)) setCurrentInstallment("1")
  }

  if (isDataLoading) return <LoadingState className="py-12" />

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-2">
      <TextField
        id="description"
        label={t('items.description')}
        icon={FileText}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t('items.descriptionPlaceholder')}
        autoFocus
        required
      />

      {/* Valor e Parcelamento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          id="amount"
          label={t('items.amount')}
          icon={DollarSign}
          inputMode="numeric"
          value={displayAmount}
          onChange={(e) => handleAmountChange(e.target.value)}
          placeholder={`R$ ${formatDecimal(0)}`}
          required
          hint={exceedsAvailableLimit && (
            <span className="text-warning">{t('items.availableLimit', { amount: `R$ ${formatCurrency(card.available_balance)}` })}</span>
          )}
        />
        <StepperField
          label={t('items.installments')}
          value={installmentsCount}
          onChange={changeInstallments}
          min={1}
          max={24}
          hint={isInstallment && t('items.installmentValue', { times: installmentsCount, value: `R$ ${formatCurrency(parseFloat(amount || "0") / installmentsCount)}` })}
        />
      </div>

      {/* Data da Compra e Parcela Atual */}
      <div className={cn("grid gap-4", isInstallment ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
        <TextField
          id="date"
          type="date"
          label={t('items.purchaseDate')}
          icon={Calendar}
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
        />
        {isInstallment && (
          <StepperField
            label={t('items.currentInstallment')}
            value={Number(currentInstallment) || 1}
            onChange={(value) => setCurrentInstallment(String(value))}
            min={1}
            max={installmentsCount}
          />
        )}
      </div>
      {isInstallment && (
        <p className="text-xs text-subtle -mt-2">
          {t('items.installmentRange', { from: currentInstallment, to: installments, count: remainingInstallments })}
        </p>
      )}

      {/* Categoria */}
      <div>
        <FieldLabel label={t('items.categoryOptional')} icon={Tag} />
        <CategoryBadgeSelector categories={categories} value={categoryId} onChange={setCategoryId} />
      </div>

      {/* Observação */}
      <div>
        <FieldLabel label={t('items.notes')} icon={MessageSquare} htmlFor="notes" />
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('items.notesPlaceholder')}
          rows={2}
          className={textareaClass}
        />
      </div>

      {/* Quando Assinatura é selecionada: esconder o form e redirecionar */}
      {categoryId === String(SUBSCRIPTION_CATEGORY_ID) ? (
        <div className="rounded-2xl p-5 bg-primary/8 flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center">
            <Repeat size={20} />
          </div>
          <p className="text-sm font-semibold text-primary">{t('items.subscription.title')}</p>
          <p className="text-xs text-muted">
            {t('items.subscription.description')}
          </p>
          <Button label={t('items.subscription.go')} fullWidth onClick={() => { onCancel(); navigate('/settings/subscriptions') }} />
          <Button label={t('items.subscription.back')} variant="ghost" size="sm" onClick={() => setCategoryId('')} />
        </div>
      ) : (
        <>
          {/* Pessoas / Divisão */}
          <AuthorSplitSection
            authors={availableAuthors}
            defaultAuthorId={defaultAuthor?.id}
            totalAmount={parseFloat(amount || "0")}
            authorId={effectiveAuthorId}
            onAuthorIdChange={setAuthorId}
            isSplit={isSplit}
            onIsSplitChange={setIsSplit}
            assignments={assignments}
            onAssignmentsChange={setAssignments}
            isLocked={isAuthorLocked}
            lockedAuthorName={defaultAuthor?.name}
            footer={
              !showNewAuthor ? (
                <button
                  type="button"
                  onClick={() => setShowNewAuthor(true)}
                  className="flex items-center gap-1 text-[13px] font-medium text-primary hover:opacity-80"
                >
                  <Plus size={14} />
                  {t('items.addPerson')}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newAuthorName}
                    onChange={(e) => setNewAuthorName(e.target.value)}
                    placeholder={t('items.newPersonPlaceholder')}
                    className={fieldClass}
                    autoFocus
                  />
                  <Button
                    label={t('common.cancel')}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNewAuthor(false)
                      setNewAuthorName("")
                    }}
                  />
                </div>
              )
            }
          />

          {error && <Callout tone="danger" icon={AlertCircle}>{error}</Callout>}

          <div className="flex gap-3 pt-1">
            <Button label={t('common.cancel')} variant="secondary" onClick={onCancel} className="flex-1" />
            <Button type="submit" label={isLoading ? t('common.saving') : t('common.add')} loading={isLoading} className="flex-1" />
          </div>
        </>
      )}
    </form>
  )
}
