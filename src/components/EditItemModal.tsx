import { useState, useEffect } from "react"
import { X, Save, FileText, DollarSign, Tag, Calendar, MessageSquare } from "lucide-react"
import { useAppStore } from "../store/app.store"
import type { InvoiceItemWithDetails } from "../types/database"
import CategoryBadgeSelector from "./CategoryBadgeSelector"
import AuthorSplitSection, { type SplitAssignment } from "./AuthorSplitSection"

interface EditItemModalProps {
  item: InvoiceItemWithDetails
  onClose: () => void
  onSave: (updatedItem: Partial<InvoiceItemWithDetails>) => Promise<void>
}

const labelClass =
  "flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
const inputClass =
  "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400"

export default function EditItemModal({
  item,
  onClose,
  onSave,
}: EditItemModalProps) {
  const { categories, authors } = useAppStore()

  const [description, setDescription] = useState(item.description)
  const [amount, setAmount] = useState(Number(item.amount).toFixed(2))
  const [displayAmount, setDisplayAmount] = useState(() => {
    const numValue = Number(item.amount)
    return `R$ ${numValue.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
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
        `R$ ${numValue.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
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
      `R$ ${numValue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    )
  }

  const getSplitTotal = () => assignments.reduce((acc, curr) => acc + curr.amount, 0)

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const numericAmount = parseFloat(amount)

      // Validação do split
      if (isSplit) {
        if (assignments.length === 0) {
            alert("Selecione pelo menos uma pessoa para dividir.")
            setIsLoading(false)
            return
        }
        const splitTotal = getSplitTotal()
        // Margem de erro pequena para float math
        if (Math.abs(splitTotal - numericAmount) > 0.05) {
            alert(`A soma da divisão (R$ ${formatCurrency(splitTotal)}) não bate com o valor total (R$ ${formatCurrency(numericAmount)})`)
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
      alert("Erro ao salvar alterações")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md lg:max-w-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl">
          <h2 className="text-lg font-bold dark:text-white">Editar Item</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 cursor-pointer dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Descrição */}
          <div>
            <label className={labelClass}>
              <FileText className="w-3.5 h-3.5" />
              Descrição
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          {/* Valor e Categoria */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                <DollarSign className="w-3.5 h-3.5" />
                Valor Total
              </label>
              <input
                type="text"
                value={displayAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="R$ 0,00"
                className={inputClass}
                required
              />
              {item.is_installment && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Parcela {item.installment_number}/{item.total_installments}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>
                <Calendar className="w-3.5 h-3.5" />
                Data da Compra
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className={labelClass}>
              <Tag className="w-3.5 h-3.5" />
              Categoria
            </label>
            <CategoryBadgeSelector
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
            />
          </div>

          {/* Observação */}
          <div>
            <label className={labelClass}>
              <MessageSquare className="w-3.5 h-3.5" />
              Observação (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alguma anotação sobre esse item..."
              rows={2}
              className={`${inputClass} resize-none`}
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

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2.5 cursor-pointer border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-2.5 bg-indigo-600 cursor-pointer text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isLoading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
