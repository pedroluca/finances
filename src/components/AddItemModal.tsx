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
import { plural } from "../lib/format"
import { Sheet } from "./ui/sheet"
import { Button } from "./ui/button"
import { Callout, LoadingState } from "./ui/misc"
import { FieldLabel, StepperField, TextField } from "./ui/field"

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

  const installmentsCount = Number(installments) || 1
  const remainingInstallments = installmentsCount - Number(currentInstallment) + 1

  const changeInstallments = (value: number) => {
    setInstallments(String(value))
    setIsInstallment(value > 1)
    if (value < Number(currentInstallment)) setCurrentInstallment("1")
  }

  return (
    <Sheet open={open} onClose={onClose} title="Adicionar Item" size="lg">
      {isDataLoading ? (
        <LoadingState className="py-12" />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
          <TextField
            id="description"
            label="Descrição"
            icon={FileText}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Compras no supermercado"
            autoFocus
            required
          />

          {/* Valor e Parcelamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField
              id="amount"
              label="Valor Total"
              icon={DollarSign}
              inputMode="numeric"
              value={displayAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="R$ 0,00"
              required
              hint={exceedsAvailableLimit && (
                <span className="text-warning">O limite disponível é de R$ {formatCurrency(card.available_balance)}</span>
              )}
            />
            <StepperField
              label="Parcelas"
              value={installmentsCount}
              onChange={changeInstallments}
              min={1}
              max={24}
              hint={isInstallment && `${installmentsCount}x de R$ ${formatCurrency(parseFloat(amount || "0") / installmentsCount)}`}
            />
          </div>

          {/* Data da Compra e Parcela Atual */}
          <div className={cn("grid gap-4", isInstallment ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
            <TextField
              id="date"
              type="date"
              label="Data da Compra"
              icon={Calendar}
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
            {isInstallment && (
              <StepperField
                label="Parcela Atual"
                value={Number(currentInstallment) || 1}
                onChange={(value) => setCurrentInstallment(String(value))}
                min={1}
                max={installmentsCount}
              />
            )}
          </div>
          {isInstallment && (
            <p className="text-xs text-subtle -mt-2">
              Será criada a partir da parcela {currentInstallment} até a {installments} ({remainingInstallments} {plural(remainingInstallments, "parcela", "parcelas")})
            </p>
          )}

          {/* Categoria */}
          <div>
            <FieldLabel label="Categoria (Opcional)" icon={Tag} />
            <CategoryBadgeSelector categories={categories} value={categoryId} onChange={setCategoryId} />
          </div>

          {/* Observação */}
          <div>
            <FieldLabel label="Observação (Opcional)" icon={MessageSquare} htmlFor="notes" />
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alguma anotação sobre esse item..."
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
              <p className="text-sm font-semibold text-primary">Assinaturas têm configurações especiais</p>
              <p className="text-xs text-muted">
                Ciclo de cobrança, dia de vencimento e renovação automática só ficam disponíveis na página de Assinaturas.
              </p>
              <Button label="Ir para Assinaturas" fullWidth onClick={() => { onClose(); navigate('/settings/subscriptions') }} />
              <Button label="Voltar e escolher outra categoria" variant="ghost" size="sm" onClick={() => setCategoryId('')} />
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
                      className="flex items-center gap-1 text-[13px] font-medium text-primary hover:opacity-80"
                    >
                      <Plus size={14} />
                      Adicionar nova pessoa
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newAuthorName}
                        onChange={(e) => setNewAuthorName(e.target.value)}
                        placeholder="Nome da pessoa"
                        className={fieldClass}
                        autoFocus
                      />
                      <Button
                        label="Cancelar"
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
                <Button label="Cancelar" variant="secondary" onClick={onClose} className="flex-1" />
                <Button type="submit" label={isLoading ? "Salvando..." : "Adicionar"} loading={isLoading} className="flex-1" />
              </div>
            </>
          )}
        </form>
      )}
    </Sheet>
  )
}
