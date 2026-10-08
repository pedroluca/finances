import { useState, useEffect, useCallback, type ReactNode } from "react"
import AddItemModal from "../components/AddItemModal"
import { useNavigate, useParams } from "react-router-dom"
import { useAuthStore } from "../store/auth.store"
import { useAppStore } from "../store/app.store"
import type { Author, Category, CardWithBalance } from "../types/database"
import { phpApiRequest } from "../lib/api"
import EditItemModal from "../components/EditItemModal"
import {
  ArrowLeft,
  CreditCard,
  Plus,
  Trash2,
  Calendar,
  CheckCircle,
  MinusCircle,
  Circle,
  Pencil,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  Nfc,
  X,
  User,
  BanknoteX,
} from "lucide-react"
import type {
  InvoiceItemWithDetails,
  InvoiceWithCard,
} from "../types/database"
import ConfirmModal from "../components/ConfirmModal"
import { useToast } from "../components/Toast"
import { Skeleton } from "../components/ui/skeleton"
import { Card } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { IconButton } from "../components/ui/icon-button"
import { EmptyState } from "../components/ui/misc"
import { Sheet } from "../components/ui/sheet"
import { StackHeader } from "../components/app-header"
import { CardSurface } from "../components/cards/CreditCardTile"
import { cardInk, withAlpha } from "../lib/colors"
import { cn } from "../lib/cn"
import { formatCurrency, monthYearTitle, plural } from "../lib/format"
import { EXPENSE_ADDED_EVENT } from "../store/quick-expense.store"

// Botões das ações em lote com texto branco: tons fixos, legíveis nos dois temas
const ACTION_COLORS = { pay: "#16a34a", unpay: "#d97706", delete: "#dc2626" }

export default function CardDetails() {
  const navigate = useNavigate()
  const { cardId: paramCardId } = useParams<{ cardId: string }>()
  // Recupera o cardId do localStorage se não vier da URL
  const [cardId] = useState(() => {
    if (paramCardId) {
      localStorage.setItem("lastCardId", paramCardId)
      return paramCardId
    }
    const stored = localStorage.getItem("lastCardId")
    return stored || ""
  })
  const { user } = useAuthStore()
  const { cards, removeCard, authors, setAuthors, categories, setCategories } = useAppStore()
  const { showToast } = useToast()

  const [items, setItems] = useState<InvoiceItemWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [hasInitialLoad, setHasInitialLoad] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDeleteItemsModal, setShowDeleteItemsModal] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())
  const [editingItem, setEditingItem] = useState<InvoiceItemWithDetails | null>(
    null
  )
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAuthorFilter, setShowAuthorFilter] = useState(false)
  const [selectedAuthorFilter, setSelectedAuthorFilter] = useState<Set<number>>(new Set())
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [allUnpaidItems, setAllUnpaidItems] = useState<InvoiceItemWithDetails[]>([])
  const [modalInvoiceId, setModalInvoiceId] = useState<number | null>(null)
  const [cardOwnerAuthors, setCardOwnerAuthors] = useState<Author[]>([])

  // Handle add item button click
  const handleAddItemClick = async () => {
    const invId = await getOrCreateInvoiceId()
    if (invId) {
      setModalInvoiceId(invId)
      setShowAddItemModal(true)
    } else {
      showToast('Erro ao criar fatura', 'error')
    }
  };

  // Estado para controlar o mês/ano visualizado
  const currentDate = new Date()
  const [viewingMonth, setViewingMonth] = useState(currentDate.getMonth() + 1)
  const [viewingYear, setViewingYear] = useState(currentDate.getFullYear())

  // cards agora vem da view card_available_balance
  const card = (cards as CardWithBalance[]).find(
    (c) => (c.card_id ?? c.id) === Number(cardId)
  )

  // Buscar autores do dono do cartão se for compartilhado
  useEffect(() => {
    if (!card?.is_shared || !card?.user_id) return
    const fetchOwnerAuthors = async () => {
      try {
        const ownerAuthorsData = await phpApiRequest(`authors.php?user_id=${card.user_id}`)
        setCardOwnerAuthors(ownerAuthorsData)
      } catch (error) {
        console.error('Erro ao buscar autores do dono do cartão:', error)
      }
    }
    fetchOwnerAuthors()
  }, [card?.is_shared, card?.user_id])

  // Se não encontrar o cartão, tenta buscar do backend usando o cardId salvo
  useEffect(() => {
    if (card || !cardId || cards.length) return
    const fetchCard = async () => {
      try {
        const cardsData = await phpApiRequest("cards.php", { method: "GET" })
        if (Array.isArray(cardsData)) {
          if (typeof useAppStore.getState().setCards === "function") {
            useAppStore.getState().setCards(cardsData)
          }
        }
      } catch (err) {
        console.error("Erro ao buscar cartões:", err)
      }
    }
    fetchCard()
  }, [card, cardId, cards.length])

  // Calcula o mês/ano da fatura atual baseado no dia de fechamento
  const getCurrentInvoiceMonthYear = () => {
    const today = new Date()
    const todayDay = today.getDate()
    const todayMonth = today.getMonth() + 1 // 1-12
    const todayYear = today.getFullYear()

    if (!card?.closing_day) {
      return { month: todayMonth, year: todayYear }
    }

    const closingDay = card.closing_day

    // Se hoje ainda não passou do dia de fechamento, a fatura atual é deste mês
    if (todayDay <= closingDay) {
      return { month: todayMonth, year: todayYear }
    }

    // Se já passou do dia de fechamento, a fatura atual é do próximo mês
    if (todayMonth === 12) {
      return { month: 1, year: todayYear + 1 }
    }
    return { month: todayMonth + 1, year: todayYear }
  }

  const currentInvoice = getCurrentInvoiceMonthYear()
  const currentMonth = currentInvoice.month
  const currentYear = currentInvoice.year

  // Atualiza o mês de visualização quando o cartão carregar ou mudar
  useEffect(() => {
    if (card && !hasInitialLoad) {
      setViewingMonth(currentMonth)
      setViewingYear(currentYear)
    }
  }, [card, currentMonth, currentYear, hasInitialLoad])

  // Verifica se está visualizando o mês atual
  const isCurrentMonth =
    viewingMonth === currentMonth && viewingYear === currentYear

  // Função para obter ou criar invoice do mês visualizado
  const getOrCreateInvoiceId = async (): Promise<number | null> => {
    if (!card) return null
    
    try {
      const invoices: InvoiceWithCard[] = await phpApiRequest(
        `invoices.php?card_id=${card.card_id ?? card.id}`
      )
      const inv = invoices.find(
        (i) => i.reference_month === viewingMonth && i.reference_year === viewingYear
      )
      
      if (inv) {
        return inv.id
      }
      
      // Calcular a closing_date (data de fechamento)
      const closingDate = new Date(viewingYear, viewingMonth - 1, card.closing_day)
      
      // Se o dia não existe no mês (ex: dia 31 em fevereiro), ajusta pro último dia do mês
      if (closingDate.getMonth() !== viewingMonth - 1) {
        closingDate.setDate(0) // Vai pro último dia do mês anterior (que é o correto)
      }
      
      // due_date é após a closing_date (próximo mês ou mesmo mês dependendo do due_day)
      let dueMonth = viewingMonth
      let dueYear = viewingYear
      
      // Se due_day < closing_day, vencimento é no próximo mês
      if (card.due_day < card.closing_day) {
        dueMonth = viewingMonth === 12 ? 1 : viewingMonth + 1
        dueYear = viewingMonth === 12 ? viewingYear + 1 : viewingYear
      }
      
      const dueDate = new Date(dueYear, dueMonth - 1, card.due_day)
      
      // Se o dia não existe no mês, ajusta
      if (dueDate.getMonth() !== dueMonth - 1) {
        dueDate.setDate(0)
      }
      
      const newInvoice = await phpApiRequest('invoices.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: card.card_id ?? card.id,
          reference_month: viewingMonth, // Mês do fechamento
          reference_year: viewingYear,
          closing_date: closingDate.toISOString().split('T')[0], // YYYY-MM-DD
          due_date: dueDate.toISOString().split('T')[0] // YYYY-MM-DD
        })
      })
      
      return newInvoice?.id || null
    } catch (error) {
      console.error('Erro ao obter/criar invoice:', error)
      return null
    }
  }


  // Carregamento inicial (apenas uma vez)
  useEffect(() => {
    const loadInitialData = async () => {
      if (!card || !user) return

      try {
        setIsLoading(true)
        
        // Carrega categorias e autores se não estiverem na store
        const promises: Promise<unknown>[] = []
        
        // Sempre busca a fatura
        promises.push(phpApiRequest(`invoices.php?card_id=${card.card_id ?? card.id}`))
        
        const needCategories = !categories || categories.length === 0
        const needAuthors = !authors || authors.length === 0
        
        if (needCategories) {
          promises.push(phpApiRequest('categories.php', { method: 'GET' }))
        } else {
          promises.push(Promise.resolve(null))
        }
        
        if (needAuthors) {
          promises.push(phpApiRequest('authors.php', { method: 'GET' }))
        } else {
           promises.push(Promise.resolve(null))
        }

        const [invoices, fetchedCategories, fetchedAuthors] = await Promise.all(promises)

        if (fetchedCategories) setCategories(fetchedCategories as Category[])
        if (fetchedAuthors) setAuthors(fetchedAuthors as Author[])

        // Encontrar a fatura do mês/ano atual (usa currentMonth/currentYear calculados)
        const invoice = (invoices as (InvoiceWithCard & { items: InvoiceItemWithDetails[] })[]).find(
          (inv) =>
            inv.reference_month === currentMonth &&
            inv.reference_year === currentYear
        )
        let itemsToShow = (invoice?.items || []).map((item) => ({
          ...item,
          is_installment: !!Number(item.is_installment),
          is_paid: !!Number(item.is_paid),
        }))

        // Se for cartão compartilhado, filtrar apenas itens do autor vinculado
        if (card.is_shared && card.author_id_on_owner) {
          itemsToShow = itemsToShow.filter((item) => {
            // Mostrar se o item foi criado para este autor
            if (item.author_id === card.author_id_on_owner) {
              return true
            }
            // OU se o autor está nos assignments (item dividido)
            return item.assignments?.some((assignment) => assignment.author_id === card.author_id_on_owner)
          })
        }

        setItems(itemsToShow)
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error)
      } finally {
        setIsLoading(false)
        setHasInitialLoad(true)
      }
    }

    loadInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.card_id, user?.id, currentMonth, currentYear]) // Carrega baseado no mês atual calculado

  // Carregamento de itens quando o mês muda (APÓS carregamento inicial)
  const loadMonthItems = useCallback(async () => {
    if (!card || !user) return

    try {
      setIsLoadingItems(true)
      // Buscar faturas do cartão (com itens)
      const invoices: (InvoiceWithCard & {
        items: InvoiceItemWithDetails[]
      })[] = await phpApiRequest(
        `invoices.php?card_id=${card.card_id ?? card.id}`
      )
      // Encontrar a fatura do mês/ano visualizado
      const invoice = invoices.find(
        (inv) =>
          inv.reference_month === viewingMonth &&
          inv.reference_year === viewingYear
      )
      let itemsToShow = (invoice?.items || []).map((item) => ({
          ...item,
          is_installment: !!Number(item.is_installment),
          is_paid: !!Number(item.is_paid),
          assignments: item.assignments?.map(a => ({
               ...a,
               is_paid: !!Number(a.is_paid)
          }))
        }))

      // Se for cartão compartilhado, filtrar apenas itens do autor vinculado 
      if (card.is_shared && card.author_id_on_owner) {
        itemsToShow = itemsToShow.filter((item) => {
          // Mostrar se o item foi criado para este autor
          if (item.author_id === card.author_id_on_owner) {
            return true
          }
          // OU se o autor está nos assignments (item dividido)
          return item.assignments?.some((assignment) => assignment.author_id === card.author_id_on_owner)
        })
      }

      setItems(itemsToShow)

      setSelectedItems(new Set())
    } catch (error) {
      console.error("Erro ao carregar itens:", error)
    } finally {
      setIsLoadingItems(false)
    }
  }, [card, user, viewingMonth, viewingYear])

  // Carregamento de itens quando o mês muda (APÓS carregamento inicial)
  useEffect(() => {
    // Não executa no mount inicial
    if (!hasInitialLoad) return
    loadMonthItems()
  }, [hasInitialLoad, loadMonthItems])

  // Despesa lançada pela "Nova despesa" (barra lateral) neste cartão: recarrega a fatura aberta
  useEffect(() => {
    const onExpenseAdded = (event: Event) => {
      if ((event as CustomEvent<{ cardId: number }>).detail?.cardId === Number(cardId)) loadMonthItems()
    }
    window.addEventListener(EXPENSE_ADDED_EVENT, onExpenseAdded)
    return () => window.removeEventListener(EXPENSE_ADDED_EVENT, onExpenseAdded)
  }, [cardId, loadMonthItems])

  // Funções de navegação entre meses
  const goToPreviousMonth = () => {
    if (viewingMonth === 1) {
      setViewingMonth(12)
      setViewingYear(viewingYear - 1)
    } else {
      setViewingMonth(viewingMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (viewingMonth === 12) {
      setViewingMonth(1)
      setViewingYear(viewingYear + 1)
    } else {
      setViewingMonth(viewingMonth + 1)
    }
  }

  const goToCurrentMonth = () => {
    setViewingMonth(currentMonth)
    setViewingYear(currentYear)
  }

  // Limpa o cardId do localStorage ao voltar
  const handleBack = () => {
    localStorage.removeItem("lastCardId")
    navigate("/dashboard")
  }

  // Filtrar itens por autor


  // Calcular totais por autor
  const authorTotals = authors.map((author) => {
    let total = 0
    let unpaidTotal = 0
    let itemCount = 0

    items.forEach((item) => {
      let amountToAdd = 0
      let isInvolved = false

      let isPaid = item.is_paid

      if (item.assignments && item.assignments.length > 0) {
        const assignment = item.assignments.find(
          (a) => a.author_id === author.id
        )
        if (assignment) {
          amountToAdd = Number(assignment.amount)
          isInvolved = true
          isPaid = assignment.is_paid
        }
      } else {
        if (item.author_id === author.id) {
          amountToAdd = Number(item.amount)
          isInvolved = true
        }
      }

      if (isInvolved) {
        total += amountToAdd
        itemCount++
        if (!isPaid) {
          unpaidTotal += amountToAdd
        }
      }
    })

    return {
      ...author,
      total,
      unpaidTotal,
      itemCount,
    }
  })

  const handleDeleteCardClick = async () => {
    if (!card) return
    
    // Fetch all invoices to check for unpaid items
    try {
      const invoices: (InvoiceWithCard & {
        items: InvoiceItemWithDetails[]
      })[] = await phpApiRequest(
        `invoices.php?card_id=${card.card_id ?? card.id}`
      )
      
      // Collect all unpaid items from all invoices
      const unpaidItems = invoices
        .flatMap((inv) => inv.items || [])
        .filter((item) => !item.is_paid)
        .map((item) => ({
          ...item,
          is_installment: !!Number(item.is_installment),
          is_paid: !!Number(item.is_paid),
        }))
      
      setAllUnpaidItems(unpaidItems)
      setShowDeleteModal(true)
    } catch (error) {
      console.error("Erro ao buscar itens não pagos:", error)
      // Still show modal even if fetch fails
      setAllUnpaidItems([])
      setShowDeleteModal(true)
    }
  }

  const handleDeleteCard = async () => {
    if (!card || !user) return

    try {
      await phpApiRequest(`cards.php?action=deactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: card.card_id ?? card.id,
          user_id: user.id,
        }),
      })
      removeCard(card.card_id ?? card.id)
      navigate("/dashboard")
    } catch (error) {
      console.error("Erro ao excluir cartão:", error)
      showToast("Erro ao excluir cartão", 'error')
    }
  }

  const toggleSelectItem = (itemId: number) => {
    // Permite seleção em qualquer mês para marcar como pago
    setSelectedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const setPaidStatusForItems = async (itemIds: number[], isPaid: boolean) => {
    if (!user || itemIds.length === 0) return

    try {
      await Promise.all(
        itemIds.map((itemId) => {
          const payload: { id: number; is_paid: boolean; author_id?: number } = { id: itemId, is_paid: isPaid }

          if (selectedAuthorFilter.size === 1) {
             const authorId = Array.from(selectedAuthorFilter)[0]
             const originalItem = items.find(i => i.id === itemId)
             if (originalItem && originalItem.assignments && originalItem.assignments.some(a => a.author_id === authorId)) {
                 payload.author_id = authorId
             }
          }

          return phpApiRequest(`invoice_items.php`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        })
      )

      // Recarregar os itens para garantir que o status atualizado (inclusive status parcial) seja refletido corretamente
      // Como o update local é complexo com assignments, o reload é mais seguro.
      // Mas para UX rápida, podemos tentar update otimista ou parcial.
      // Vamos recarregar por segurança pois o backend pode ter mudado o status do pai.
      await loadMonthItems()

      setSelectedItems(new Set())
    } catch (error) {
      console.error("Erro ao alterar status de pagamento dos itens:", error)
    }
  }

  const markSelectedAsPaid = () => {
    const unpaidIds = Array.from(selectedItems).filter((itemId) => {
      const item = items.find((i) => i.id === itemId)
      return item && !getDisplayDetails(item).isPaid
    })
    return setPaidStatusForItems(unpaidIds, true)
  }

  const markSelectedAsUnpaid = () => {
    const paidIds = Array.from(selectedItems).filter((itemId) => {
      const item = items.find((i) => i.id === itemId)
      return item && getDisplayDetails(item).isPaid
    })
    return setPaidStatusForItems(paidIds, false)
  }

  const deleteSelectedItems = () => {
    if (!user || selectedItems.size === 0) return
    setShowDeleteItemsModal(true)
  }

  const confirmDeleteItems = async () => {
    if (!user || selectedItems.size === 0) return

    try {
      await Promise.all(
        Array.from(selectedItems).map((itemId) =>
          phpApiRequest(`invoice_items.php`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: itemId }),
          })
        )
      )
      
      setItems((prev) =>
        prev.filter(
          (item) =>
            !selectedItems.has(item.id) &&
            // remove também os que pertencem ao mesmo grupo
            !prev.some(
              (sel) =>
                selectedItems.has(sel.id) &&
                item.installment_group_id === sel.installment_group_id
            )
        )
      )
      
      showToast(`${selectedItems.size} item(ns) excluído(s) com sucesso`, 'success')
      setSelectedItems(new Set())
    } catch (error) {
      console.error("Erro ao excluir itens:", error)
      showToast("Erro ao excluir itens", 'error')
    }
  }

  const openEditModal = (item: InvoiceItemWithDetails) => {
    // Permite edição de itens de qualquer mês
    setEditingItem(item)
    setShowEditModal(true)
  }

  const saveItemChanges = async (
    updatedItem: Partial<InvoiceItemWithDetails>
  ) => {
    if (!editingItem || !user) return

    try {
      const { ...dataToSend } = updatedItem
      
      await phpApiRequest(`items.php?action=update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: 'update',
          item_id: editingItem.id,
          user_id: user.id,
          ...dataToSend,
        }),
      })

      // Atualizar localmente com os dados novos (incluindo nomes de categoria/autor)
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === editingItem.id) {
            const newItem = { ...item, ...updatedItem }
            
            // Buscar nomes atualizados nas listas
            if (updatedItem.category_id !== undefined) {
               const cat = categories.find(c => c.id === updatedItem.category_id)
               if (cat) {
                 newItem.category_name = cat.name
                 newItem.category_icon = cat.icon
                 newItem.category_color = cat.color
               } else if (updatedItem.category_id === null) {
                 newItem.category_name = null
                 newItem.category_icon = null
                 newItem.category_color = null
               }
            }
            
            if (updatedItem.author_id !== undefined) {
                const auth = authors.find(a => a.id === updatedItem.author_id)
                if (auth) {
                    newItem.author_name = auth.name
                }
            }

            return newItem
          }
          return item
        })
      )
      
      // Atualizar totais se necessário (opcional, mas bom)
      // fetchMonthTotals() // Se existir essa função exposta ou se recalcularmos
      
    } catch (error) {
      console.error("Erro ao atualizar item:", error)
      throw error
    }
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-background">
        <StackHeader title="" onBack={handleBack} />
        <EmptyState icon={CreditCard} title="Cartão não encontrado" />
      </div>
    )
  }

  // Cabeçalho: voltar, nome do cartão, editar/excluir e a navegação entre meses
  const header = (
    <header className="sticky top-0 z-20 bg-surface border-b border-border pt-[env(safe-area-inset-top)]">
      <div className="max-w-5xl mx-auto px-2 sm:px-4">
        <div className="h-14 flex items-center gap-1">
          <IconButton icon={ArrowLeft} label="Voltar" onClick={handleBack} />
          {isLoading ? (
            <Skeleton className="h-6 w-40 rounded-md flex-1 max-w-40 ml-1" />
          ) : (
            <h1 className="flex-1 min-w-0 pl-1 text-xl font-bold text-foreground truncate">{card.card_name ?? card.name}</h1>
          )}
          {!card.is_shared && (
            <>
              <IconButton icon={Pencil} label="Editar cartão" tone="muted" onClick={() => navigate(`/cards/${cardId}/edit`)} />
              <IconButton icon={Trash2} label="Excluir cartão" tone="danger" onClick={handleDeleteCardClick} />
            </>
          )}
        </div>
        <div className="flex items-center justify-between pb-3">
          <IconButton icon={ChevronLeft} label="Mês anterior" onClick={goToPreviousMonth} disabled={isLoading} />
          <div className="flex-1 min-w-0 text-center">
            <p className="text-base font-semibold text-foreground truncate">{monthYearTitle(viewingMonth, viewingYear)}</p>
            {!isCurrentMonth && (
              <button type="button" onClick={goToCurrentMonth} className="text-[13px] font-medium text-primary hover:underline mt-0.5">
                Ir para o mês atual
              </button>
            )}
          </div>
          <IconButton icon={ChevronRight} label="Próximo mês" onClick={goToNextMonth} disabled={isLoading} />
        </div>
      </div>
    </header>
  )

  const itemsSkeleton = (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-border">
          <Skeleton className="w-6 h-6 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
          <Skeleton className="h-5 w-16 rounded-md shrink-0" />
        </div>
      ))}
    </div>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {header}
        <DetailsLayout
          summary={<Skeleton className="h-[212px] rounded-[20px]" />}
          action={<Skeleton className="h-9 w-24 rounded-lg" />}
        >
          <Card className="p-3 space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="h-5 w-28 rounded-md" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1 rounded-lg" />
              <Skeleton className="h-9 flex-1 rounded-lg" />
              <Skeleton className="h-9 w-14 rounded-lg" />
            </div>
            {itemsSkeleton}
          </Card>
        </DetailsLayout>
      </div>
    )
  }

  const getDisplayDetails = (item: InvoiceItemWithDetails) => {
    // Para cart\u00f5es compartilhados, mostrar valor do assignment do autor vinculado
    if (card.is_shared && card.author_id_on_owner) {
      if (item.assignments && item.assignments.length > 0) {
        const linkedAssignment = item.assignments.find(a => a.author_id === card.author_id_on_owner);
        if (linkedAssignment) {
          return {
            amount: Number(linkedAssignment.amount),
            authorName: linkedAssignment.author_name,
            isPaid: !!Number(linkedAssignment.is_paid)
          }
        }
      }
      // Se n\u00e3o tem assignment mas o item \u00e9 do autor vinculado
      if (item.author_id === card.author_id_on_owner) {
        return { amount: Number(item.amount), authorName: item.author_name, isPaid: item.is_paid }
      }
      // Caso n\u00e3o deveria chegar aqui pois o filtro j\u00e1 removeu itens n\u00e3o vinculados
      return { amount: 0, authorName: item.author_name, isPaid: false }
    }

    // Lógica para filtro por autor
    if (selectedAuthorFilter.size === 1) {
       const authorId = Array.from(selectedAuthorFilter)[0]
       if (item.assignments && item.assignments.length > 0) {
           const userAssignment = item.assignments.find(a => a.author_id === authorId);
           if (userAssignment) {
               return {
                   amount: Number(userAssignment.amount),
                   authorName: userAssignment.author_name,
                   isPaid: !!Number(userAssignment.is_paid)
               }
           }
           return { amount: 0, authorName: item.author_name, isPaid: false }
       }
       if (item.author_id === authorId) {
           return { amount: Number(item.amount), authorName: item.author_name, isPaid: item.is_paid }
       }
    }
    
    let authorDisplay = item.author_name;
    if (item.assignments && item.assignments.length > 0) {
        const uniqueNames = Array.from(new Set(item.assignments.map(a => a.author_name.split(' ')[0])));
        authorDisplay = uniqueNames.join(', ');
    }
    
    return { amount: Number(item.amount), authorName: authorDisplay, isPaid: item.is_paid };
  }

  const filteredItems = items.filter((item) => {
    if (selectedAuthorFilter.size > 0) {
        if (item.assignments && item.assignments.length > 0) {
             return item.assignments.some(a => selectedAuthorFilter.has(a.author_id));
        }
        return selectedAuthorFilter.has(item.author_id)
    }
    return true
  })

  const totalAmount = filteredItems.reduce((sum, item) => {
      const { amount } = getDisplayDetails(item);
      return sum + amount;
  }, 0)

  const paidAmount = filteredItems.reduce((sum, item) => {
      // Se tiver filtro de autor único, usa a lógica do filtro
      if (selectedAuthorFilter.size === 1) {
          const { amount, isPaid } = getDisplayDetails(item);
          return sum + (isPaid ? amount : 0);
      }
      
      // Sem filtro
      if (item.is_paid) {
          return sum + Number(item.amount);
      }
      
      // Item não pago totalmente, verificar parciais dos assignments
      if (item.assignments && item.assignments.length > 0) {
          const partial = item.assignments
            .filter(a => a.is_paid)
            .reduce((s, a) => s + Number(a.amount), 0);
          return sum + partial;
      }
      
      return sum;
  }, 0)

  const remainingAmount = totalAmount - paidAmount

  const color = card.color ?? "#6366f1"
  const ink = cardInk(color)
  const paidColor = ink === "#ffffff" ? "#bbf7d0" : "#166534"
  const remainingColor = ink === "#ffffff" ? "#fde68a" : "#92400e"
  const dueMonth = card.closing_day > card.due_day ? (viewingMonth + 1 > 12 ? 1 : viewingMonth + 1) : viewingMonth

  const allSelected = filteredItems.length > 0 && filteredItems.every((i) => selectedItems.has(i.id))
  const someSelected = !allSelected && filteredItems.some((i) => selectedItems.has(i.id))
  const selectedUnpaidCount = Array.from(selectedItems).filter((itemId) => {
    const item = items.find((i) => i.id === itemId)
    return item && !getDisplayDetails(item).isPaid
  }).length
  const selectedPaidCount = selectedItems.size - selectedUnpaidCount

  // Resumo da fatura sobre o visual do cartão
  const summary = (
    <CardSurface key={`${viewingMonth}-${viewingYear}`} color={color} className="animate-fade-in">
      <div className="p-5 space-y-5" style={{ color: ink }}>
        <div className="flex items-start justify-between gap-3">
          {card.is_shared ? (
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-xs" style={{ color: withAlpha(ink, 0.75) }}>Cartão Compartilhado</p>
              <p className="text-xl font-bold truncate">{card.owner_name}</p>
              <p className="text-xs mt-0.5" style={{ color: withAlpha(ink, 0.65) }}>Você visualiza apenas os itens vinculados a você.</p>
            </div>
          ) : (
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-xs" style={{ color: withAlpha(ink, 0.75) }}>Limite Total</p>
              <p className="text-2xl font-bold truncate">{formatCurrency(Number(card.card_limit ?? 0))}</p>
            </div>
          )}
          <Nfc size={26} strokeWidth={1.8} className="shrink-0" style={{ color: withAlpha(ink, 0.85) }} />
        </div>

        <div className="flex gap-2">
          <InfoColumn
            label={selectedAuthorFilter.size > 0
              ? `Total Fatura (${selectedAuthorFilter.size} ${plural(selectedAuthorFilter.size, "pessoa", "pessoas")})`
              : "Total Fatura"}
            value={formatCurrency(totalAmount)}
            ink={ink}
            color={ink}
          />
          <InfoColumn label="Pago" value={formatCurrency(paidAmount)} ink={ink} color={paidColor} />
          <InfoColumn label="Restante" value={formatCurrency(remainingAmount)} ink={ink} color={remainingColor} />
        </div>

        <div className="flex gap-4 text-[13px]" style={{ color: withAlpha(ink, 0.75) }}>
          <span>
            Fecha dia <span className="font-semibold" style={{ color: ink }}>{card.closing_day}/{viewingMonth}</span>
          </span>
          <span>
            Vence dia <span className="font-semibold" style={{ color: ink }}>{card.due_day}/{dueMonth}</span>
          </span>
        </div>
      </div>
    </CardSurface>
  )

  return (
    <div className="min-h-screen bg-background">
      {header}

      <DetailsLayout
        summary={summary}
        action={<Button label="Novo" icon={Plus} size="sm" onClick={handleAddItemClick} />}
      >
        <Card className="p-3 space-y-3">
          <div className="flex items-center gap-2 px-1">
            {filteredItems.length > 0 && (
              <button
                type="button"
                role="checkbox"
                aria-checked={allSelected ? true : someSelected ? "mixed" : false}
                aria-label={allSelected ? "Desmarcar todos" : "Selecionar todos"}
                title={allSelected ? "Desmarcar todos" : "Selecionar todos"}
                onClick={() => setSelectedItems(allSelected ? new Set() : new Set(filteredItems.map((i) => i.id)))}
                className="shrink-0"
              >
                {allSelected ? (
                  <CheckCircle size={22} className="text-primary" />
                ) : someSelected ? (
                  <MinusCircle size={22} className="text-primary" />
                ) : (
                  <Circle size={22} className="text-subtle" />
                )}
              </button>
            )}
            <p className="flex-1 min-w-0 text-base font-semibold text-foreground truncate">
              Total: {filteredItems.length} {plural(filteredItems.length, "item", "itens")}
            </p>
            {!card.is_shared && (
              <>
                <span className="hidden sm:block">
                  <Button label="Filtrar por Pessoa" icon={Filter} variant="secondary" size="sm" onClick={() => setShowAuthorFilter(true)} />
                </span>
                <span className="sm:hidden">
                  <IconButton icon={Filter} variant="surface" size={36} iconSize={17} label="Filtrar por Pessoa" onClick={() => setShowAuthorFilter(true)} />
                </span>
              </>
            )}
          </div>

          {selectedAuthorFilter.size > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1">
              {Array.from(selectedAuthorFilter).map((authorId) => (
                <button
                  key={authorId}
                  type="button"
                  onClick={() => setSelectedAuthorFilter((prev) => { const next = new Set(prev); next.delete(authorId); return next })}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 bg-primary/12 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  <span className="truncate max-w-[120px]">{authors.find((a) => a.id === authorId)?.name}</span>
                  <X size={12} className="shrink-0" />
                </button>
              ))}
            </div>
          )}

          {!card.is_shared && (
            <div className="flex gap-2">
              <ActionButton icon={Banknote} color={ACTION_COLORS.pay} disabled={selectedUnpaidCount === 0} onClick={markSelectedAsPaid}>
                <span className="sm:hidden">Pagar ({selectedUnpaidCount})</span>
                <span className="hidden sm:inline">Marcar {selectedUnpaidCount} como pago</span>
              </ActionButton>
              <ActionButton icon={BanknoteX} color={ACTION_COLORS.unpay} disabled={selectedPaidCount === 0} onClick={markSelectedAsUnpaid}>
                <span className="sm:hidden">Desmarcar ({selectedPaidCount})</span>
                <span className="hidden sm:inline">Desmarcar {selectedPaidCount} como pago</span>
              </ActionButton>
              <ActionButton icon={Trash2} color={ACTION_COLORS.delete} disabled={selectedItems.size === 0} onClick={deleteSelectedItems} compact>
                <span className="sm:hidden">({selectedItems.size})</span>
                <span className="hidden sm:inline">Excluir {selectedItems.size}</span>
              </ActionButton>
            </div>
          )}

          {isLoadingItems ? (
            itemsSkeleton
          ) : items.length === 0 ? (
            <EmptyState
              icon={Calendar}
              tint="subtle"
              title={card.is_shared && card.author_id_on_owner ? "Nenhum item vinculado a você nesta fatura" : "Nenhum item nesta fatura"}
              description='Clique em "Novo" para começar'
              className="py-8 animate-fade-in"
            />
          ) : (
            <div key={`${viewingMonth}-${viewingYear}-items`} className="space-y-2">
              {[...filteredItems]
                .sort((a, b) => b.id - a.id)
                .map((item, index) => {
                  const { amount: displayAmount, authorName: displayAuthorName, isPaid: displayIsPaid } = getDisplayDetails(item)
                  const isSelected = selectedItems.has(item.id)

                  // Pagamento parcial: partes da divisão já pagas (sem filtro de pessoa)
                  let partialPaid = 0
                  if (selectedAuthorFilter.size === 0 && !displayIsPaid && item.assignments) {
                    partialPaid = item.assignments
                      .filter((a) => a.is_paid)
                      .reduce((s, a) => s + Number(a.amount), 0)
                  }
                  const isPartial = partialPaid > 0

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleSelectItem(item.id)}
                      style={{ animationDelay: `${Math.min(index * 0.02, 0.3)}s` }}
                      className={cn(
                        "animate-slide-right flex items-stretch rounded-xl border-2 cursor-pointer transition-colors",
                        isSelected ? "border-primary bg-primary/[0.07]" : "border-border hover:bg-surface-2",
                      )}
                    >
                      <div className="pl-3 pr-2 flex items-center shrink-0">
                        {isSelected ? (
                          <CheckCircle size={22} className="text-primary" />
                        ) : displayIsPaid ? (
                          <CheckCircle size={22} className="text-success" />
                        ) : isPartial ? (
                          <CheckCircle size={22} className="text-warning" />
                        ) : (
                          <Circle size={22} className="text-subtle" />
                        )}
                      </div>

                      <div
                        className="flex-1 min-w-0 py-3 pr-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditModal(item)
                        }}
                      >
                        <p className={cn("font-medium truncate", displayIsPaid ? "line-through text-subtle" : "text-foreground")}>
                          {item.description}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs">
                          {item.category_name && (
                            <span className="text-muted truncate">{item.category_icon} {item.category_name}</span>
                          )}
                          <span className="text-muted truncate">{displayAuthorName}</span>
                          {item.purchase_date && (
                            <span className="text-subtle">
                              {new Date(item.purchase_date + "T00:00:00").toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-center pr-3 py-3 shrink-0">
                        <p className={cn("font-semibold", displayIsPaid ? "text-subtle" : "text-foreground")}>{formatCurrency(displayAmount)}</p>
                        {item.installment_number && (
                          <p className="text-xs text-subtle">{item.installment_number}/{item.total_installments}x</p>
                        )}
                        {isPartial && (
                          <p className="text-xs font-medium text-success">Pago: {formatCurrency(partialPaid)}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </Card>
      </DetailsLayout>

      {/* Filtro por pessoa */}
      <Sheet
        open={showAuthorFilter}
        onClose={() => setShowAuthorFilter(false)}
        title="Filtrar por Pessoa"
        description="Selecione uma ou mais pessoas"
        size="lg"
        footer={(
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
            <span className="text-sm text-muted">
              {selectedAuthorFilter.size === 0
                ? "Todas as pessoas"
                : `${selectedAuthorFilter.size} ${plural(selectedAuthorFilter.size, "pessoa selecionada", "pessoas selecionadas")}`}
            </span>
            <Button label="Aplicar" size="sm" onClick={() => setShowAuthorFilter(false)} />
          </div>
        )}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pb-2">
          <FilterOption selected={selectedAuthorFilter.size === 0} onClick={() => setSelectedAuthorFilter(new Set())} className="md:col-span-2">
            <span className="flex-1 flex items-center gap-2">
              <User size={18} className="text-muted" />
              <span className="font-medium text-foreground">Todas as Pessoas</span>
            </span>
            <span className="text-sm text-muted">{items.length} {plural(items.length, "item", "itens")}</span>
          </FilterOption>

          {authorTotals.map((author) => (
            <FilterOption
              key={author.id}
              selected={selectedAuthorFilter.has(author.id)}
              onClick={() => {
                setSelectedAuthorFilter((prev) => {
                  const next = new Set(prev)
                  if (next.has(author.id)) next.delete(author.id)
                  else next.add(author.id)
                  return next
                })
              }}
            >
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-foreground truncate">{author.name}</span>
                <span className="flex items-center gap-1.5 text-sm">
                  {author.unpaidTotal > 0 && (
                    <>
                      <span className="font-semibold text-danger">{formatCurrency(author.unpaidTotal)}</span>
                      <span className="text-subtle">/</span>
                    </>
                  )}
                  <span className={cn("font-semibold", author.unpaidTotal === 0 ? "text-success" : "text-foreground")}>
                    {formatCurrency(author.total)}
                  </span>
                </span>
              </span>
              <span className="text-sm text-muted shrink-0">{author.itemCount} {plural(author.itemCount, "item", "itens")}</span>
            </FilterOption>
          ))}
        </div>
      </Sheet>

      {/* Delete Confirmation Modal (Card) */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setAllUnpaidItems([])
        }}
        onConfirm={handleDeleteCard}
        title="Excluir Cartão?"
        icon={Trash2}
        message={
          (() => {
            // Pendências em todas as faturas (descontando as partes já pagas das divisões)
            const pending = allUnpaidItems.map((item) => {
              let itemAmount = Number(item.amount)
              if (item.assignments && item.assignments.length > 0) {
                const paidPartial = item.assignments
                  .filter(a => !!Number(a.is_paid))
                  .reduce((s, a) => s + Number(a.amount), 0)
                itemAmount -= paidPartial
              }
              return itemAmount
            })
            const unpaidAmount = pending.reduce((sum, value) => sum + value, 0)

            let msg = `Tem certeza que deseja excluir o cartão "${card.card_name ?? card.name}"?`

            if (unpaidAmount > 0) {
              // Só conta os itens que ainda têm algo a pagar
              const unpaidCount = pending.filter((value) => value > 0.01).length
              msg += `\n\nAtenção: este cartão possui ${unpaidCount} item(ns) com pendência(s) no valor total de ${formatCurrency(unpaidAmount)}.`
            }

            msg += "\n\nEsta ação não pode ser desfeita."
            return msg
          })()
        }
        confirmText="Excluir"
        isDestructive
      />

      {/* Delete Confirmation Modal (Items) */}
      <ConfirmModal
        isOpen={showDeleteItemsModal}
        onClose={() => setShowDeleteItemsModal(false)}
        onConfirm={confirmDeleteItems}
        title="Excluir Itens?"
        icon={Trash2}
        message={(() => {
          const hasInstallment = items.some(
            (item) => selectedItems.has(item.id) && item.is_installment
          )
          const base = `Tem certeza que deseja excluir ${selectedItems.size} item(ns)?`
          return hasInstallment
            ? `${base}\n\nUm ou mais itens selecionados são parcelados. Todas as parcelas (pagas ou futuras) também serão apagadas.`
            : base
        })()}
        confirmText="Excluir"
        isDestructive
      />

      {/* Add Item Modal */}
      {showAddItemModal && card && modalInvoiceId && (
        <AddItemModal
          card={card}
          invoiceId={modalInvoiceId}
          open={showAddItemModal}
          linkedAuthorId={card.is_shared ? card.author_id_on_owner : undefined}
          cardOwnerAuthors={card.is_shared ? cardOwnerAuthors : undefined}
          isAuthorLocked={card.is_shared}
          onClose={() => setShowAddItemModal(false)}
          onItemAdded={async () => {
            setShowAddItemModal(false)
            // Recarrega os itens da fatura após adicionar
            setIsLoadingItems(true)
            try {
              const invoices = await phpApiRequest(
                `invoices.php?card_id=${card.card_id ?? card.id}`
              )
              const invoiceAtual = (
                invoices as (InvoiceWithCard & {
                  items: InvoiceItemWithDetails[]
                })[]
              ).find(
                (inv: InvoiceWithCard & { items: InvoiceItemWithDetails[] }) =>
                  inv.reference_month === viewingMonth &&
                  inv.reference_year === viewingYear
              )

              let itemsToShow = (invoiceAtual?.items || []).map((item) => ({
                ...item,
                is_installment: !!Number(item.is_installment),
                is_paid: !!Number(item.is_paid),
                assignments: item.assignments?.map(a => ({
                  ...a,
                  is_paid: !!Number(a.is_paid)
                }))
              }))

              // Aplicar filtro de cartão compartilhado
              if (card.is_shared && card.author_id_on_owner) {
                itemsToShow = itemsToShow.filter((item) => {
                  if (item.author_id === card.author_id_on_owner) {
                    return true
                  }
                  return item.assignments?.some((assignment) => assignment.author_id === card.author_id_on_owner)
                })
              }

              setItems(itemsToShow)
              setSelectedItems(new Set())
            } catch (error) {
              console.error("Erro ao recarregar itens após adicionar:", error)
            } finally {
              setIsLoadingItems(false)
            }
          }}
        />
      )}

      {/* Edit Item Modal */}
      {showEditModal && editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => {
            setShowEditModal(false)
            setEditingItem(null)
          }}
          onSave={saveItemChanges}
        />
      )}
    </div>
  )
}

/** Resumo à esquerda (fixo ao rolar) e lançamentos à direita no desktop largo; empilhados no resto */
function DetailsLayout({ summary, action, children }: { summary: ReactNode; action: ReactNode; children: ReactNode }) {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] lg:pb-12">
      <div className="space-y-4 xl:space-y-0 xl:grid xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)] xl:gap-6 xl:items-start">
        <div className="xl:sticky xl:top-32">{summary}</div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <h2 className="text-lg font-semibold text-foreground">Últimos Lançamentos</h2>
            {action}
          </div>
          {children}
        </div>
      </div>
    </main>
  )
}

function InfoColumn({ label, value, ink, color }: { label: string; value: string; ink: string; color: string }) {
  return (
    <div className="flex-1 min-w-0 space-y-0.5">
      <p className="text-xs line-clamp-2" style={{ color: withAlpha(ink, 0.75) }}>{label}</p>
      <p className="text-[15px] font-semibold truncate" style={{ color }}>{value}</p>
    </div>
  )
}

function ActionButton({ icon: Icon, color, disabled, onClick, compact, children }: {
  icon: typeof Banknote
  color: string
  disabled: boolean
  onClick: () => void
  compact?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{ backgroundColor: color }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-[13px] font-semibold text-white whitespace-nowrap transition-opacity",
        compact ? "px-3" : "flex-1 min-w-0 px-2",
        disabled ? "opacity-40" : "hover:opacity-90 active:opacity-80",
      )}
    >
      <Icon size={15} className="shrink-0" />
      <span className="truncate">{children}</span>
    </button>
  )
}

function FilterOption({ selected, onClick, className, children }: { selected: boolean; onClick: () => void; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-colors",
        selected ? "border-primary bg-primary/[0.08]" : "border-border hover:bg-surface-2",
        className,
      )}
    >
      {children}
      {selected && <Check size={16} className="text-primary shrink-0" />}
    </button>
  )
}
