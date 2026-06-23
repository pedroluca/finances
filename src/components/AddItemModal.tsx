import { useState, useEffect, useMemo, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "../store/auth.store"
import { useAppStore } from "../store/app.store"
import { phpApiRequest } from "../lib/api"
import type { Author, CardWithBalance } from "../types/database"
import {
  DollarSign,
  FileText,
  Calendar,
  Tag,
  Plus,
  Minus,
  X,
  Repeat,
  MessageSquare,
} from "lucide-react"
import CategoryBadgeSelector from "./CategoryBadgeSelector"
import AuthorSplitSection, { type SplitAssignment } from "./AuthorSplitSection"
import { labelClass, inputClass } from "../lib/formStyles"

const SUBSCRIPTION_CATEGORY_ID = 7

interface AddItemModalProps {
  card: CardWithBalance
  invoiceId: number
  open: boolean
  onClose: () => void
  onItemAdded?: () => void
  linkedAuthorId?: number // ID do autor vinculado para cartões compartilhados
  cardOwnerAuthors?: Author[] // Autores da conta do dono do cartão (para compartilhados)
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
  const [notes, setNotes] = useState("")

  // Split logic
  const [isSplit, setIsSplit] = useState(false)
  const [assignments, setAssignments] = useState<SplitAssignment[]>([])

  useEffect(() => {
    if (defaultAuthor && !authorId) {
      setAuthorId(defaultAuthor.id.toString())
    }
  }, [defaultAuthor, authorId])

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
    const formatted = numValue.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    setDisplayAmount(`R$ ${formatted}`)
  }

  const exceedsAvailableLimit =
    amount !== "" && parseFloat(amount) > card.available_balance

  const getSplitTotal = () => assignments.reduce((acc, curr) => acc + curr.amount, 0)

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
    const notesValue = notes.trim() || null

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
          notes: notesValue,
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
            notes: notesValue,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.5)] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md lg:max-w-2xl relative animate-fade-in max-h-[92vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl">
          <h2 className="text-lg font-bold dark:text-white">Adicionar Item</h2>
          <button
            onClick={onClose}
            className="p-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {isDataLoading ? (
          <div className="py-12 text-center text-gray-500">
            Carregando dados...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Descrição */}
            <div>
              <label htmlFor="description" className={labelClass}>
                <FileText className="w-3.5 h-3.5" />
                Descrição
              </label>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Compras no supermercado"
                className={inputClass()}
                autoFocus
                required
              />
            </div>

            {/* Valor e Parcelamento */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="amount" className={labelClass}>
                  <DollarSign className="w-3.5 h-3.5" />
                  Valor Total
                </label>
                <input
                  type="text"
                  id="amount"
                  value={displayAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="R$ 0,00"
                  className={inputClass()}
                  required
                />
                {exceedsAvailableLimit && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    O limite disponível é de R$ {formatCurrency(card.available_balance)}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="installments" className={labelClass}>
                  Parcelas
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const val = Math.max(1, Number(installments) - 1);
                      setInstallments(val.toString());
                      setIsInstallment(val > 1);
                      if (val < Number(currentInstallment)) {
                        setCurrentInstallment("1");
                      }
                    }}
                    className="cursor-pointer p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
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
                    className="w-full px-2 py-2 text-sm text-center border border-gray-300 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = Math.min(24, Number(installments) + 1);
                      setInstallments(val.toString());
                      setIsInstallment(val > 1);
                    }}
                    className="cursor-pointer p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {isInstallment && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {Number(installments)}x de R${" "}
                    {(
                      parseFloat(amount || "0") / Number(installments)
                    ).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>

            {/* Data da Compra e Parcela Atual */}
            <div className={`grid gap-3 ${isInstallment ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
              <div>
                <label htmlFor="date" className={labelClass}>
                  <Calendar className="w-3.5 h-3.5" />
                  Data da Compra
                </label>
                <input
                  type="date"
                  id="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className={inputClass()}
                />
              </div>
              {isInstallment && (
                <div>
                  <label htmlFor="currentInstallment" className={labelClass}>
                    Parcela Atual
                  </label>
                  <input
                    type="number"
                    id="currentInstallment"
                    value={currentInstallment}
                    onChange={(e) => setCurrentInstallment(e.target.value)}
                    min="1"
                    max={installments}
                    className={inputClass()}
                  />
                </div>
              )}
            </div>
            {isInstallment && (
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                Será criada a partir da parcela {currentInstallment} até a{" "}
                {installments} (
                {Number(installments) - Number(currentInstallment) + 1} parcela
                {Number(installments) - Number(currentInstallment) + 1 !== 1
                  ? "s"
                  : ""}
                )
              </p>
            )}

            {/* Categoria */}
            <div>
              <label className={labelClass}>
                <Tag className="w-3.5 h-3.5" />
                Categoria (Opcional)
              </label>
              <CategoryBadgeSelector
                categories={categories}
                value={categoryId}
                onChange={setCategoryId}
              />
            </div>

            {/* Observação */}
            <div>
              <label htmlFor="notes" className={labelClass}>
                <MessageSquare className="w-3.5 h-3.5" />
                Observação (Opcional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Alguma anotação sobre esse item..."
                rows={2}
                className={`${inputClass()} resize-none`}
              />
            </div>

            {/* Quando Assinatura é selecionada: esconder o form e redirecionar */}
            {categoryId === String(SUBSCRIPTION_CATEGORY_ID) ? (
              <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-5 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                    <Repeat className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">
                  Assinaturas têm configurações especiais
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  Ciclo de cobrança, dia de vencimento e renovação automática só ficam disponíveis na página de Assinaturas.
                </p>
                <button
                  type="button"
                  onClick={() => { onClose(); navigate('/settings/subscriptions'); }}
                  className="w-full cursor-pointer px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium text-sm"
                >
                  Ir para Assinaturas
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryId('')}
                  className="w-full cursor-pointer px-4 py-2 text-sm text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Voltar e escolher outra categoria
                </button>
              </div>
            ) : (
              <>
                {/* Pessoas / Divisão */}
                <AuthorSplitSection
                  authors={availableAuthors}
                  defaultAuthorId={defaultAuthor?.id}
                  totalAmount={parseFloat(amount || "0")}
                  authorId={authorId}
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
                        className="mt-1 cursor-pointer text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar nova pessoa
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={newAuthorName}
                          onChange={(e) => setNewAuthorName(e.target.value)}
                          placeholder="Nome da pessoa"
                          className={inputClass()}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewAuthor(false)
                            setNewAuthorName("")
                          }}
                          className="text-xs cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex-shrink-0"
                        >
                          Cancelar
                        </button>
                      </div>
                    )
                  }
                />

                {/* Botões */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 cursor-pointer px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 cursor-pointer px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Salvando..." : "Adicionar"}
                  </button>
                </div>
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2 text-sm text-red-800 dark:text-red-300 text-center">
                    {error}
                  </div>
                )}
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
