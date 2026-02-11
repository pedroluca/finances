import { useState, useEffect, useMemo, type FormEvent } from "react"
import { useAuthStore } from "../store/auth.store"
import { useAppStore } from "../store/app.store"
import { phpApiRequest } from "../lib/api"
import type { CardWithBalance } from "../types/database"
import {
  DollarSign,
  FileText,
  Calendar,
  Tag,
  User,
  Plus,
  X,
  Calculator,
  AlertCircle,
} from "lucide-react"

interface AddItemModalProps {
  card: CardWithBalance
  invoiceId: number
  open: boolean
  onClose: () => void
  onItemAdded?: () => void
  linkedAuthorId?: number // ID do autor vinculado para cartões compartilhados
  cardOwnerAuthors?: any[] // Autores da conta do dono do cartão (para compartilhados)
  isAuthorLocked?: boolean // Se true, não permite alterar o autor (cartões compartilhados)
}

export default function AddItemModal({
  card,
  open,
  onClose,
  onItemAdded,
  linkedAuthorId,
  cardOwnerAuthors,
  isAuthorLocked = false,
}: AddItemModalProps) {
  const { user } = useAuthStore()
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
    if (!open) return
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
  }, [open])

  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [displayAmount, setDisplayAmount] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [authorId, setAuthorId] = useState("")
  
  // Split logic
  const [isSplit, setIsSplit] = useState(false)
  const [assignments, setAssignments] = useState<
    { author_id: number; amount: number }[]
  >([])

  useEffect(() => {
    if (defaultAuthor && !authorId) {
      setAuthorId(defaultAuthor.id.toString())
    }
  }, [defaultAuthor, authorId])
  
  const [newAuthorName, setNewAuthorName] = useState("")
  const [showNewAuthor, setShowNewAuthor] = useState(false)
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  )
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
    const formatted = numValue.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    setDisplayAmount(`R$ ${formatted}`)
  }

  // Helpers para Split
  const toggleAuthorInSplit = (toggledAuthorId: number) => {
    const exists = assignments.find((a) => a.author_id === toggledAuthorId)
    if (exists) {
      setAssignments(assignments.filter((a) => a.author_id !== toggledAuthorId))
    } else {
      setAssignments([
        ...assignments,
        { author_id: toggledAuthorId, amount: 0 },
      ])
    }
  }

  const updateAssignmentAmount = (authId: number, val: string) => {
    const numbers = val.replace(/\D/g, "")
    const numValue = numbers === "" ? 0 : parseInt(numbers) / 100

    setAssignments(
      assignments.map((a) =>
        a.author_id === authId ? { ...a, amount: numValue } : a
      )
    )
  }

  const distributeEqually = () => {
    if (assignments.length === 0) return
    const total = parseFloat(amount)
    if (isNaN(total)) return

    const splitValue = Number((total / assignments.length).toFixed(2))
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!user || !card) {
      setError("Dados inválidos")
      return
    }
    if (!description.trim()) {
      setError("Digite uma descrição")
      return
    }
    const amountValue = parseFloat(amount)
    if (isNaN(amountValue) || amountValue <= 0) {
      setError("Digite um valor válido")
      return
    }

    // Validação do split
    if (isSplit) {
        if (assignments.length === 0) {
            setError("Selecione pelo menos uma pessoa para dividir.")
            return
        }
        const splitTotal = getSplitTotal()
        if (Math.abs(splitTotal - amountValue) > 0.05) {
            setError(`A soma da divisão (R$ ${formatCurrency(splitTotal)}) não bate com o valor total (R$ ${formatCurrency(amountValue)})`)
            return
        }
    }

    let selectedAuthorId = authorId ? Number(authorId) : defaultAuthor?.id
    if (showNewAuthor && newAuthorName.trim()) {
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
      setError("Selecione quem comprou")
      return
    }

    const assignmentsPayload = isSplit ? assignments : []

    try {
      setIsLoading(true)
      if (isInstallment && Number(installments) > 1) {
        let cardIdToSend = card?.id
        if (!cardIdToSend) {
          const stored = localStorage.getItem("lastCardId")
          if (stored) cardIdToSend = Number(stored)
        }
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
          assignments: assignmentsPayload
        }
        console.log("Enviando parcelado:", payload)
        await phpApiRequest("items.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        let cardIdToSend = card?.id || card?.card_id
        if (!cardIdToSend) {
          const stored = localStorage.getItem("lastCardId")
          if (stored) cardIdToSend = Number(stored)
        }

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
            assignments: assignmentsPayload
          }),
        })
      }
      if (onItemAdded) onItemAdded()
      onClose()
    } catch (err) {
      console.log(err)
      setError("Erro ao criar item")
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.5)]">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-lg w-full p-6 relative animate-fade-in max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute cursor-pointer top-4 right-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <X className="w-6 h-6 text-gray-500" />
        </button>
        <h2 className="text-xl font-bold mb-4 dark:text-white">
          Adicionar Item
        </h2>
        {isDataLoading ? (
          <div className="py-12 text-center text-gray-500">
            Carregando dados...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Descrição */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 dark:text-white mb-2"
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Descrição
              </label>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Compras no supermercado"
                className="w-full px-4 py-3 border border-gray-300 dark:text-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
                required
              />
            </div>
            {/* Valor e Parcelamento */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-gray-700 dark:text-white mb-2"
                >
                  <DollarSign className="w-4 h-4 inline mr-2" />
                  Valor Total
                </label>
                <input
                  type="text"
                  id="amount"
                  value={displayAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="R$ 0,00"
                  className="w-full px-4 py-3 border border-gray-300 dark:text-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="installments"
                  className="block text-sm font-medium text-gray-700 dark:text-white mb-2"
                >
                  Parcelas
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    id="installments"
                    value={installments}
                    onChange={(e) => {
                      const value = e.target.value
                      setInstallments(value)
                      setIsInstallment(Number(value) > 1)
                      if (Number(value) < Number(currentInstallment)) {
                        setCurrentInstallment("1")
                      }
                    }}
                    min="1"
                    max="24"
                    className="w-full px-4 py-3 border border-gray-300 dark:text-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                {isInstallment && (
                  <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                    {Number(installments)}x de R${" "}
                    {(
                      parseFloat(amount || "0") / Number(installments)
                    ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>
            {/* Parcela Atual */}
            {isInstallment && (
              <div>
                <label
                  htmlFor="currentInstallment"
                  className="block text-sm font-medium text-gray-700 dark:text-white mb-2"
                >
                  Parcela Atual
                </label>
                <input
                  type="number"
                  id="currentInstallment"
                  value={currentInstallment}
                  onChange={(e) => setCurrentInstallment(e.target.value)}
                  min="1"
                  max={installments}
                  className="w-full px-4 py-3 border border-gray-300 dark:text-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Será criada a partir da parcela {currentInstallment} até a{" "}
                  {installments} (
                  {Number(installments) - Number(currentInstallment) + 1} parcela
                  {Number(installments) - Number(currentInstallment) + 1 !== 1
                    ? "s"
                    : ""}
                  )
                </p>
              </div>
            )}
            {/* Categoria */}
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-700 dark:text-white mb-2"
              >
                <Tag className="w-4 h-4 inline mr-2" />
                Categoria (Opcional)
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:text-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="" className="dark:bg-gray-800">
                  Sem categoria
                </option>
                {categories.map((cat) => (
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
            {!isAuthorLocked && (
              <div className="border-t border-b border-gray-200 dark:border-gray-700 py-4 my-4">
                <div className="flex items-center gap-2 mb-4">
                <input
                    type="checkbox"
                    id="isSplitAdd"
                    checked={isSplit}
                    onChange={(e) => setIsSplit(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label
                    htmlFor="isSplitAdd"
                    className="text-sm font-medium text-gray-700 dark:text-white select-none cursor-pointer"
                >
                    Dividir despesa entre pessoas
                </label>
                </div>

                {!isSplit ? (
                    <div>
                    <label
                        htmlFor="author"
                        className="block text-sm font-medium text-gray-700 dark:text-white mb-2"
                    >
                        <User className="w-4 h-4 inline mr-2" />
                        Quem comprou?
                    </label>
                    {isAuthorLocked ? (
                        <div className="w-full px-4 py-3 border border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 rounded-lg">
                            {defaultAuthor?.name || 'Carregando...'}
                        </div>
                    ) : !showNewAuthor ? (
                        <>
                        <select
                            id="author"
                            value={authorId}
                            onChange={(e) => setAuthorId(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:text-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="" className="dark:bg-gray-800">
                            Selecione...
                            </option>
                            {availableAuthors.map((author) => (
                            <option
                                key={author.id}
                                value={author.id}
                                className="dark:bg-gray-800"
                            >
                                {author.name} {author.is_owner ? "(Você)" : ""}
                            </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => setShowNewAuthor(true)}
                            className="mt-2 cursor-pointer text-sm text-primary-600 hover:text-primary-700 dark:text-white flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" />
                            Adicionar nova pessoa
                        </button>
                        </>
                    ) : (
                        <>
                        <input
                            type="text"
                            value={newAuthorName}
                            onChange={(e) => setNewAuthorName(e.target.value)}
                            placeholder="Nome da pessoa"
                            className="w-full px-4 py-3 border border-gray-300 dark:text-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <button
                            type="button"
                            onClick={() => {
                            setShowNewAuthor(false)
                            setNewAuthorName("")
                            }}
                            className="mt-2 text-sm cursor-pointer text-gray-600 dark:text-white hover:text-gray-700"
                        >
                            Cancelar
                        </button>
                        </>
                    )}
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
                        
                        {availableAuthors.map(author => {
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
                            <span className={`text-sm font-bold ${Math.abs(getSplitTotal() - parseFloat(amount || '0')) < 0.05 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                R$ {formatCurrency(getSplitTotal())}
                            </span>
                        </div>
                        {Math.abs(getSplitTotal() - parseFloat(amount || '0')) >= 0.05 && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle size={12} /> O total dividido deve ser igual ao valor do item.
                            </p>
                        )}
                    </div>
                )}
            </div>
            )}

            {/* Data da Compra */}
            <div>
              <label
                htmlFor="date"
                className="block text-sm font-medium text-gray-700 dark:text-white mb-2"
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Data da Compra
              </label>
              <input
                type="date"
                id="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:text-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 cursor-pointer px-6 py-3 border border-gray-300 text-gray-700 dark:text-gray-300 dark:hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 cursor-pointer px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Salvando..." : "Adicionar"}
              </button>
            </div>
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-2 text-sm text-red-800 text-center">
                {error}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
