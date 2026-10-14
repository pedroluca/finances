import { formatDecimal } from "../lib/format"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"
import { Save, FileText, DollarSign, Tag, Calendar, MessageSquare } from "lucide-react"
import { useAppStore } from "../store/app.store"
import type { InvoiceItemWithDetails } from "../types/database"
import CategoryBadgeSelector from "./CategoryBadgeSelector"
import AuthorSplitSection, { type SplitAssignment } from "./AuthorSplitSection"
import { textareaClass } from "../lib/formStyles"
import { Sheet } from "./ui/sheet"
import { Button } from "./ui/button"
import { FieldLabel, TextField } from "./ui/field"

interface EditItemModalProps {
  item: InvoiceItemWithDetails
  onClose: () => void
  onSave: (updatedItem: Partial<InvoiceItemWithDetails>) => Promise<void>
}

export default function EditItemModal({
  item,
  onClose,
  onSave,
}: EditItemModalProps) {
  const { t } = useTranslation()
  const { categories, authors } = useAppStore()

  const [description, setDescription] = useState(item.description)
  const [amount, setAmount] = useState(Number(item.amount).toFixed(2))
  const [displayAmount, setDisplayAmount] = useState(() => {
    const numValue = Number(item.amount)
    return `R$ ${formatDecimal(numValue)}`
  })
  const [categoryId, setCategoryId] = useState(
    item.category_id ? String(item.category_id) : ""
  )
  const [authorId, setAuthorId] = useState(() => {
    if (item.author_id) return String(item.author_id)
    if (authors && authors.length > 0) return String(authors[0].id)
    return ""
  })
  const [notes, setNotes] = useState(item.notes || "")
  const [purchaseDate, setPurchaseDate] = useState(() => {
    if (!item.purchase_date) return ""
    const dateStr = String(item.purchase_date)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr
    }
    return dateStr.split("T")[0]
  })
  const [isLoading, setIsLoading] = useState(false)

  // Split logic
  const [isSplit, setIsSplit] = useState(false)
  const [assignments, setAssignments] = useState<SplitAssignment[]>([])

  useEffect(() => {
    if (item.assignments && item.assignments.length > 0) {
      setIsSplit(true)
      setAssignments(
        item.assignments.map((a) => ({
          author_id: a.author_id,
          amount: Number(a.amount),
        }))
      )
    }
  }, [item])

  useEffect(() => {
    // Atualiza o valor formatado ao mudar o amount
    const numValue = Number(amount)
    if (!isNaN(numValue)) {
      setDisplayAmount(
        `R$ ${formatDecimal(numValue)}`
      )
    } else {
      setDisplayAmount("")
    }
  }, [amount])

  const handleAmountChange = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    if (numbers === "") {
      setAmount("")
      setDisplayAmount("")
      return
    }
    const numValue = parseInt(numbers) / 100
    setAmount(numValue.toFixed(2))
    setDisplayAmount(
      `R$ ${formatDecimal(numValue)}`
    )
  }

  const getSplitTotal = () => assignments.reduce((acc, curr) => acc + curr.amount, 0)

  const formatCurrency = (val: number) => {
    return formatDecimal(val)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const numericAmount = parseFloat(amount)

      // Validação do split
      if (isSplit) {
        if (assignments.length === 0) {
            alert(t('items.errors.splitEmpty'))
            setIsLoading(false)
            return
        }
        const splitTotal = getSplitTotal()
        // Margem de erro pequena para float math
        if (Math.abs(splitTotal - numericAmount) > 0.05) {
            alert(t('items.errors.splitMismatch', { split: `R$ ${formatCurrency(splitTotal)}`, total: `R$ ${formatCurrency(numericAmount)}` }))
            setIsLoading(false)
            return
        }
      }

      await onSave({
        description: description.trim(),
        amount: numericAmount,
        category_id: categoryId ? Number(categoryId) : null,
        author_id: Number(authorId), // Mantém o autor principal
        purchase_date: (purchaseDate || null) as unknown as Date | null,
        notes: notes.trim() || null,
        assignments: isSplit
          ? assignments.map((a) => ({
              ...a,
              id: 0, // Placeholder, backend gera
              invoice_item_id: item.id,
              is_paid: false,
              author_name:
                authors.find((auth) => auth.id === a.author_id)?.name || "",
            }))
          : [],
      })
      onClose()
    } catch (error) {
      console.error("Erro ao salvar:", error)
      alert(t('items.errors.update'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={t('items.editTitle')} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 pb-2">
        <TextField
          label={t('items.description')}
          icon={FileText}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        {/* Valor e Data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            label={t('items.amount')}
            icon={DollarSign}
            inputMode="numeric"
            value={displayAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder={`R$ ${formatDecimal(0)}`}
            required
            hint={item.is_installment && t('items.installmentOf', { number: item.installment_number, total: item.total_installments })}
          />
          <TextField
            type="date"
            label={t('items.purchaseDate')}
            icon={Calendar}
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
        </div>

        {/* Categoria */}
        <div>
          <FieldLabel label={t('items.category')} icon={Tag} />
          <CategoryBadgeSelector categories={categories} value={categoryId} onChange={setCategoryId} />
        </div>

        {/* Observação */}
        <div>
          <FieldLabel label={t('items.notes')} icon={MessageSquare} htmlFor="edit-notes" />
          <textarea
            id="edit-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('items.notesPlaceholder')}
            rows={2}
            className={textareaClass}
          />
        </div>

        {/* Pessoas / Divisão */}
        <AuthorSplitSection
          authors={authors}
          defaultAuthorId={item.author_id}
          totalAmount={parseFloat(amount || "0")}
          authorId={authorId}
          onAuthorIdChange={setAuthorId}
          isSplit={isSplit}
          onIsSplitChange={setIsSplit}
          assignments={assignments}
          onAssignmentsChange={setAssignments}
        />

        <div className="flex gap-3 pt-1">
          <Button label={t('common.cancel')} variant="secondary" onClick={onClose} className="flex-1" />
          <Button type="submit" label={isLoading ? t('common.saving') : t('common.save')} icon={Save} loading={isLoading} className="flex-1" />
        </div>
      </form>
    </Sheet>
  )
}
