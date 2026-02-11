import { useState, useEffect, useCallback } from "react"
import AddItemModal from "../components/AddItemModal"
import { useNavigate, useParams } from "react-router-dom"
import { useAuthStore } from "../store/auth.store"
import { useAppStore } from "../store/app.store"
import type { CardWithBalance } from "../types/database"
import { phpApiRequest } from "../lib/api"
import EditItemModal from "../components/EditItemModal"
import {
  ArrowLeft,
  CreditCard,
  Plus,
  Trash2,
  Calendar,
  CheckCircle,
  Circle,
  Edit,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  User,
} from "lucide-react"
import type {
  InvoiceItemWithDetails,
  InvoiceWithCard,
} from "../types/database"
import ConfirmModal from "../components/ConfirmModal"
import { useToast } from "../components/Toast"

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
  const [selectedAuthorFilter, setSelectedAuthorFilter] = useState<
    number | null
  >(null)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [allUnpaidItems, setAllUnpaidItems] = useState<InvoiceItemWithDetails[]>([])
  const [modalInvoiceId, setModalInvoiceId] = useState<number | null>(null)
  const [cardOwnerAuthors, setCardOwnerAuthors] = useState<any[]>([])

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
        const promises: Promise<any>[] = []
        
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

        if (fetchedCategories) setCategories(fetchedCategories)
        if (fetchedAuthors) setAuthors(fetchedAuthors)

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
            return item.assignments?.some((assignment: any) => assignment.author_id === card.author_id_on_owner)
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
          return item.assignments?.some((assignment: any) => assignment.author_id === card.author_id_on_owner)
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

  const markSelectedAsPaid = async () => {
    if (!user || selectedItems.size === 0) return

    try {
      await Promise.all(
        Array.from(selectedItems).map((itemId) => {
          const payload: any = { id: itemId, is_paid: true }
          
          if (selectedAuthorFilter) {
             const originalItem = items.find(i => i.id === itemId)
             if (originalItem && originalItem.assignments && originalItem.assignments.some(a => a.author_id === selectedAuthorFilter)) {
                 payload.author_id = selectedAuthorFilter
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
      console.error("Erro ao marcar itens como pagos:", error)
    }
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
      <div className="min-h-screen flex items-center justify-center">
        <p>Cartão não encontrado</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
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

    // L\u00f3gica original para filtro por autor
    if (selectedAuthorFilter) {
       if (item.assignments && item.assignments.length > 0) {
           const userAssignment = item.assignments.find(a => a.author_id === selectedAuthorFilter);
           if (userAssignment) {
               return {
                   amount: Number(userAssignment.amount),
                   authorName: userAssignment.author_name,
                   isPaid: !!Number(userAssignment.is_paid)
               }
           }
           return { amount: 0, authorName: item.author_name, isPaid: false }
       }
       if (item.author_id === selectedAuthorFilter) {
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
    if (selectedAuthorFilter) {
        if (item.assignments && item.assignments.length > 0) {
             return item.assignments.some(a => a.author_id === selectedAuthorFilter);
        }
        return item.author_id === selectedAuthorFilter;
    }
    return true
  })

  const totalAmount = filteredItems.reduce((sum, item) => {
      const { amount } = getDisplayDetails(item);
      return sum + amount;
  }, 0)

  const paidAmount = filteredItems.reduce((sum, item) => {
      // Se tiver filtro de autor, usa a lógica do filtro
      if (selectedAuthorFilter) {
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

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors overflow-hidden">
      {/* Header */}
      <div className="flex-none bg-white dark:bg-gray-800 border-b dark:border-gray-700 transition-colors z-10 relative shadow-sm">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            {/* <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <button
                onClick={() => navigate("/dashboard")}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div> */}

            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <button
                onClick={handleBack}
                className="p-1.5 sm:p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {card.card_name ?? card.name}
                </h1>
              </div>
            </div>

            {/* Only show actions if NOT shared */}
            {!card.is_shared && (
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/cards/${cardId}/edit`)}
                    className="p-1.5 sm:p-2 cursor-pointer text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={handleDeleteCardClick}
                    className="p-1.5 sm:p-2 cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
            )}
          </div>

          {/* Navegação de Meses */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={goToPreviousMonth}
              className="flex cursor-pointer items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm sm:text-base"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            <div className="text-center flex-1 min-w-0">
              <p className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white capitalize truncate">
                {new Date(viewingYear, viewingMonth - 1)
                  .toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric",
                  })
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
              </p>
              {!isCurrentMonth && (
                <button
                  onClick={goToCurrentMonth}
                  className="cursor-pointer text-xs sm:text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium mt-1"
                >
                  Ir para o mês atual
                </button>
              )}
            </div>

            <button
              onClick={goToNextMonth}
              className="flex cursor-pointer items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm sm:text-base"
            >
              <span className="hidden sm:inline">Próximo</span>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full relative custom-scrollbar" id="scrollable-content">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-8 pb-24">
        {/* Card Info */}
        <div
          key={`${viewingMonth}-${viewingYear}`}
          className="rounded-xl shadow-lg p-4 sm:p-6 text-white mb-4 sm:mb-8"
          style={{
            backgroundColor: card.color ?? "#6366f1",
            animation: "slideInFromTop 0.25s ease-out",
          }}
        >
          <div className="flex justify-between items-start mb-4 sm:mb-8">
            <div>
              {card.is_shared ? (
                  <div>
                    <p className="text-xs sm:text-sm opacity-80 mb-1">Cartão Compartilhado</p>
                    <p className="text-lg sm:text-2xl font-bold flex items-center gap-2">
                        <span>{card.owner_name}</span>
                    </p>
                    <p className="text-xs opacity-60 mt-1">Você visualiza apenas os itens vinculados a você.</p>
                  </div>
              ) : (
                  <>
                    <p className="text-xs sm:text-sm opacity-80">Limite Total</p>
                    <p className="text-xl sm:text-3xl font-bold">
                        R${" "}
                        {Number(card.card_limit ?? 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                        })}
                    </p>
                  </>
              )}
            </div>
            <CreditCard className="w-8 h-8 sm:w-12 sm:h-12 opacity-80" />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div>
              <p className="text-xs opacity-80">Total Fatura {selectedAuthorFilter && (
                <span className="truncate max-w-[100px]">
                  de {authors.find((a) => a.id === selectedAuthorFilter)?.name}
                </span>
              )}</p>
              <p className="text-sm sm:text-lg font-semibold">
                R${" "}
                {totalAmount.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                  })}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-80">Pago</p>
              <p className="text-sm sm:text-lg font-semibold text-green-200">
                R${" "}
                {paidAmount.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-80">Restante</p>
              <p className="text-sm sm:text-lg font-semibold text-yellow-200">
                R${" "}
                {remainingAmount.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
          <div className="mt-4 sm:mt-6 flex gap-3 sm:gap-4 text-xs sm:text-sm">
            <div>
              <span className="opacity-80">Fecha dia</span>{" "}
              <span className="font-semibold">{(card.closing_day ?? "") + '/' + viewingMonth}</span>
            </div>
            <div>
              <span className="opacity-80">Vence dia</span>{" "}
              <span className="font-semibold">{card.due_day}/{card.closing_day > card.due_day ? (viewingMonth + 1 > 12 ? 1 : viewingMonth + 1) : viewingMonth}</span>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 sm:p-6 transition-colors">
          <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                Itens da Fatura ({filteredItems.length})
              </h2>
              {selectedAuthorFilter && (
                <button
                  onClick={() => setSelectedAuthorFilter(null)}
                  className="px-2 py-1 cursor-pointer bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg text-xs flex items-center gap-1 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition"
                >
                  <span className="truncate max-w-[100px]">
                    {authors.find((a) => a.id === selectedAuthorFilter)?.name}
                  </span>
                  <X className="w-3 h-3 flex-shrink-0" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {selectedItems.size > 0 && !card.is_shared && (
                <>
                  <button
                    onClick={markSelectedAsPaid}
                    className="px-2 sm:px-4 cursor-pointer py-1.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                  >
                    <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">
                      Marcar {selectedItems.size} como pago
                    </span>
                    <span className="sm:hidden">
                      Pagar ({selectedItems.size})
                    </span>
                  </button>
                  <button
                    onClick={deleteSelectedItems}
                    className="px-2 sm:px-4 cursor-pointer py-1.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">
                      Excluir {selectedItems.size}
                    </span>
                    <span className="sm:hidden">
                      Del ({selectedItems.size})
                    </span>
                  </button>
                </>
              )}
              {!card.is_shared && (
                <button
                  onClick={() => setShowAuthorFilter(true)}
                  className="flex items-center cursor-pointer gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-xs sm:text-base"
                >
                  <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Filtrar por Pessoa</span>
                  <span className="sm:hidden">Filtrar</span>
                </button>
              )}
              <button
                onClick={handleAddItemClick}
                className="flex items-center cursor-pointer gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-xs sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Adicionar Item</span>
                <span className="sm:hidden">Novo</span>
              </button>
            </div>
          </div>

          {isLoadingItems ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                Carregando itens...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 sm:py-12 animate-fade-in">
              <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-2">
                {card.is_shared && card.author_id_on_owner ? 'Nenhum item vinculado a você nesta fatura' : 'Nenhum item nesta fatura'}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">
                Clique em "Adicionar Item" para começar
              </p>
            </div>
          ) : (
            <div
              key={`${viewingMonth}-${viewingYear}-items`}
              className="space-y-2 sm:space-y-3 animate-fade-in"
              style={{ animation: "fadeIn 0.2s ease-in" }}
            >
              {filteredItems
                .sort((a, b) => b.id - a.id)
                .map((item, index) => {
                  const { amount: displayAmount, authorName: displayAuthorName, isPaid: displayIsPaid } =
                    getDisplayDetails(item)

                  // Calcular se há pagamento parcial (quando não está filtrado e não está totalmente pago)
                  let partialPaid = 0;
                  if (!selectedAuthorFilter && !displayIsPaid && item.assignments) {
                      partialPaid = item.assignments
                        .filter(a => a.is_paid)
                        .reduce((s, a) => s + Number(a.amount), 0);
                  }
                  const isPartial = partialPaid > 0;

                  return (
                    <div
                      key={item.id}
                    style={{
                      animation: `slideInFromRight 0.25s ease-out ${Math.min(
                        index * 0.02,
                        0.3
                      )}s both`,
                    }}
                    className={`flex items-start sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 border-2 rounded-lg transition cursor-pointer ${
                      selectedItems.has(item.id)
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                    onClick={() => toggleSelectItem(item.id)}
                  >
                    <div className="flex-shrink-0 mt-0.5 sm:mt-0">
                      {selectedItems.has(item.id) ? (
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                      ) : displayIsPaid ? (
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                      ) : isPartial ? (
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
                      ) : (
                        <Circle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
                      )}
                    </div>

                    <div
                      className="flex-1 min-w-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(item)
                      }}
                    >
                      <p
                        className={`font-medium text-sm sm:text-base truncate ${
                          displayIsPaid
                            ? "text-gray-500 dark:text-gray-500 line-through"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {item.description}
                      </p>
                      <div className="flex flex-wrap gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {item.category_name && (
                          <span className="flex items-center gap-1 truncate">
                            {item.category_icon} {item.category_name}
                          </span>
                        )}
                        <span className="truncate">{displayAuthorName}</span>
                        {item.purchase_date && (
                          <span className="hidden sm:inline">
                            {new Date(item.purchase_date + 'T00:00:00').toLocaleDateString(
                              "pt-BR"
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p
                        className={`text-sm sm:text-lg font-semibold ${
                          displayIsPaid
                            ? "text-gray-400 dark:text-gray-600"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        R${" "}
                        {displayAmount.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      {item.installment_number && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {item.installment_number}/{item.total_installments}x
                        </p>
                      )}
                      {isPartial && (
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                           Pago: R$ {partialPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>

      {/* Author Filter Modal */}
      {showAuthorFilter && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="p-6 pb-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Filtrar por Pessoa
                </h3>
                <button
                  onClick={() => setShowAuthorFilter(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto pl-6 pr-3 pb-6 flex-1" style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(156, 163, 175, 0.3) transparent'
            }}>
              <div className="space-y-3">
              <button
                onClick={() => {
                  setSelectedAuthorFilter(null)
                  setShowAuthorFilter(false)
                }}
                className={`w-full p-4 rounded-lg text-left transition border-2 ${
                  selectedAuthorFilter === null
                    ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      Todas as Pessoas
                    </span>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {items.length} {items.length === 1 ? "item" : "itens"}
                  </span>
                </div>
              </button>

              {authorTotals.map((author) => (
                <button
                  key={author.id}
                  onClick={() => {
                    setSelectedAuthorFilter(author.id)
                    setShowAuthorFilter(false)
                  }}
                  className={`w-full cursor-pointer p-4 rounded-lg text-left transition border-2 ${
                    selectedAuthorFilter === author.id
                      ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {author.name}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {author.itemCount}{" "}
                      {author.itemCount === 1 ? "item" : "itens"}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Total:
                      </span>
                      <span className={`font-semibold ${author.unpaidTotal == 0 ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"}`}>
                        R${" "}
                        {author.total.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    {author.unpaidTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          A pagar:
                        </span>
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          R${" "}
                          {author.unpaidTotal.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Delete Confirmation Modal (Card) */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setAllUnpaidItems([])
        }}
        onConfirm={handleDeleteCard}
        title="Excluir Cartão?"
        message={
          (() => {
            // Calculate total unpaid amount across ALL invoices
            const unpaidAmount = allUnpaidItems.reduce((sum, item) => {
              let itemAmount = Number(item.amount)
              // If item has assignments, check for partial payments
              if (item.assignments && item.assignments.length > 0) {
                 const paidPartial = item.assignments
                   .filter(a => !!Number(a.is_paid))
                   .reduce((s, a) => s + Number(a.amount), 0)
                 itemAmount -= paidPartial
              }
              return sum + itemAmount
            }, 0)
            
            let msg = `Tem certeza que deseja excluir o cartão "${card.card_name ?? card.name}"?`
            
            if (unpaidAmount > 0) {
              msg += `\n\n⚠️ ATENÇÃO: Este cartão possui ${allUnpaidItems.filter(i => {
                  let itemAmount = Number(i.amount)
                  if (i.assignments && i.assignments.length > 0) {
                     const paidPartial = i.assignments
                       .filter(a => !!Number(a.is_paid))
                       .reduce((s, a) => s + Number(a.amount), 0)
                     itemAmount -= paidPartial
                  }
                  return itemAmount > 0.01 // Só conta se ainda tiver algo a pagar
              }).length} item(ns) com pendência(s) no valor total de R$ ${
                unpaidAmount.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}.`
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
        message={`Tem certeza que deseja excluir ${selectedItems.size} item(ns)?`}
        confirmText="Excluir"
        isDestructive
      />

      {/* Edit Item Modal */}
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
                  return item.assignments?.some((assignment: any) => assignment.author_id === card.author_id_on_owner)
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
