import { useState, useEffect } from "react"
import { X, Save, Calculator, Check, AlertCircle } from "lucide-react"
import { useAppStore } from "../store/app.store"
import type { InvoiceItemWithDetails } from "../types/database"

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
  const { categories, authors } = useAppStore()

  // Aguarda autores carregarem antes de inicializar authorId
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
  const [assignments, setAssignments] = useState<
    { author_id: number; amount: number }[]
  >([])

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

  // Helpers para Split
  const toggleAuthorInSplit = (toggledAuthorId: number) => {
    const exists = assignments.find((a) => a.author_id === toggledAuthorId)
    if (exists) {
      setAssignments(assignments.filter((a) => a.author_id !== toggledAuthorId))
    } else {
      // Adiciona com valor 0 inicialmente
      setAssignments([...assignments, { author_id: toggledAuthorId, amount: 0 }])
    }
  }

  const updateAssignmentAmount = (authId: number, val: string) => {
    const numbers = val.replace(/\D/g, "")
    const numValue = numbers === "" ? 0 : parseInt(numbers) / 100
    
    setAssignments(assignments.map(a => 
      a.author_id === authId ? { ...a, amount: numValue } : a
    ))
  }

  const distributeEqually = () => {
    if (assignments.length === 0) return
    const total = parseFloat(amount)
    if (isNaN(total)) return

    const splitValue = Number((total / assignments.length).toFixed(2))
    // Ajustar o último para bater centavos
    const totalDistributed = splitValue * (assignments.length - 1)
    const lastValue = Number((total - totalDistributed).toFixed(2))

    setAssignments(
      assignments.map((a, index) => ({
        ...a,
        amount: index === assignments.length - 1 ? lastValue : splitValue,
      }))
    )
  }

  const getSplitTotal = () => {
    return assignments.reduce((acc, curr) => acc + curr.amount, 0)
  }

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
        purchase_date: (purchaseDate || null) as any,
        assignments: isSplit
          ? assignments.map((a) => ({
              ...a,
              id: 0, // Placeholder, backend gera
              invoice_item_id: item.id,
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
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Editar Item
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 cursor-pointer dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
              Descrição
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
              Valor Total
            </label>
            <input
              type="text"
              value={displayAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="R$ 0,00"
              className="w-full px-4 py-3 border border-gray-300 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
            {item.is_installment && (
              <p className="text-xs text-gray-500 dark:text-gray-100 mt-1">
                Parcela {item.installment_number}/{item.total_installments}
              </p>
            )}
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
              Categoria
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="" className="dark:bg-gray-800">
                Sem categoria
              </option>
              {categories &&
                categories.length > 0 &&
                categories.map((cat) => (
                  <option
                    key={cat.id}
                    value={cat.id}
                    className="dark:bg-gray-800"
                  >
                    {cat.icon} {cat.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Divisão de Despesa */}
          <div className="border-t border-b border-gray-200 dark:border-gray-700 py-4 my-4">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="isSplit"
                checked={isSplit}
                onChange={(e) => setIsSplit(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <label
                htmlFor="isSplit"
                className="text-sm font-medium text-gray-700 dark:text-white select-none cursor-pointer"
              >
                Dividir despesa entre pessoas
              </label>
            </div>

            {!isSplit ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                  Quem comprou?
                </label>
                <select
                  value={authorId}
                  onChange={(e) => setAuthorId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                  disabled={!authors || authors.length === 0}
                >
                  <option value="" className="dark:bg-gray-800">
                    {!authors || authors.length === 0
                      ? "Carregando autores..."
                      : "Selecione..."}
                  </option>
                  {authors &&
                    authors.length > 0 &&
                    authors.map((author) => (
                      <option
                        key={author.id}
                        value={author.id}
                        className="dark:bg-gray-800"
                      >
                        {author.name} {author.is_owner ? "(Você)" : ""}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
                <div className="space-y-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Autores e Valores</span>
                        <button 
                            type="button"
                            onClick={distributeEqually}
                            className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1"
                            title="Distribuir igualmente entre selecionados"
                        >
                            <Calculator size={14} /> Distribuir
                        </button>
                    </div>
                    
                    {authors.map(author => {
                        const isSelected = assignments.some(a => a.author_id === author.id)
                        const assignment = assignments.find(a => a.author_id === author.id)
                        
                        return (
                            <div key={author.id} className="flex items-center gap-3">
                                <div className="flex items-center gap-2 flex-1">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleAuthorInSplit(author.id)}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {author.name} {author.is_owner ? "(Você)" : ""}
                                    </span>
                                </div>
                                {isSelected && (
                                    <div className="w-32">
                                        <input
                                            type="text"
                                            value={`R$ ${(assignment?.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                            onChange={(e) => updateAssignmentAmount(author.id, e.target.value)}
                                            className="w-full px-2 py-1 text-right text-sm border border-gray-300 dark:text-white rounded focus:ring-indigo-500"
                                        />
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Dividido:</span>
                        <span className={`text-sm font-bold ${Math.abs(getSplitTotal() - parseFloat(amount)) < 0.05 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            R$ {formatCurrency(getSplitTotal())}
                        </span>
                    </div>
                     {Math.abs(getSplitTotal() - parseFloat(amount)) >= 0.05 && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} /> O total dividido deve ser igual ao valor do item.
                        </p>
                    )}
                </div>
            )}
          </div>

          {/* Data da Compra */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
              Data da Compra
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border cursor-pointer border-gray-300 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-indigo-600 cursor-pointer text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {isLoading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
