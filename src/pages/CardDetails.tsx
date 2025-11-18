import { useState, useEffect } from "react";
import AddItemModal from "../components/AddItemModal";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import { useAppStore } from "../store/app.store";
import type { CardWithBalance } from "../types/database";
import { phpApiRequest } from "../lib/api";
import EditItemModal from "../components/EditItemModal";
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
} from "lucide-react";
import type {
  InvoiceItemWithDetails,
  InvoiceWithCard,
} from "../types/database";

export default function CardDetails() {
  const navigate = useNavigate();
  const { cardId: paramCardId } = useParams<{ cardId: string }>();
  // Recupera o cardId do localStorage se não vier da URL
  const [cardId] = useState(() => {
    if (paramCardId) {
      localStorage.setItem("lastCardId", paramCardId);
      return paramCardId;
    }
    const stored = localStorage.getItem("lastCardId");
    return stored || "";
  });
  const { user } = useAuthStore();
  const { cards, removeCard, authors } = useAppStore();

  const [items, setItems] = useState<InvoiceItemWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [editingItem, setEditingItem] = useState<InvoiceItemWithDetails | null>(
    null
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuthorFilter, setShowAuthorFilter] = useState(false);
  const [selectedAuthorFilter, setSelectedAuthorFilter] = useState<
    number | null
  >(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
    <button
      onClick={() => setShowAddItemModal(true)}
      className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
    >
      <Plus className="w-5 h-5" />
      <span>Novo Item</span>
    </button>
    {/* ...outros botões existentes... */}
  </div>;

  // Estado para controlar o mês/ano visualizado
  const currentDate = new Date();
  const [viewingMonth, setViewingMonth] = useState(currentDate.getMonth() + 1);
  const [viewingYear, setViewingYear] = useState(currentDate.getFullYear());

  // cards agora vem da view card_available_balance
  const card = (cards as CardWithBalance[]).find(
    (c) => (c.card_id ?? c.id) === Number(cardId)
  );

  // Se não encontrar o cartão, tenta buscar do backend usando o cardId salvo
  useEffect(() => {
    if (card || !cardId || cards.length) return;
    const fetchCard = async () => {
      try {
        const cardsData = await phpApiRequest("cards.php", { method: "GET" });
        if (Array.isArray(cardsData)) {
          if (typeof useAppStore.getState().setCards === "function") {
            useAppStore.getState().setCards(cardsData);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar cartões:", err);
      }
    };
    fetchCard();
  }, [card, cardId, cards.length]);

  // Calcula o mês/ano da fatura atual baseado no dia de fechamento
  const getCurrentInvoiceMonthYear = () => {
    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth() + 1; // 1-12
    const todayYear = today.getFullYear();

    if (!card?.closing_day) {
      return { month: todayMonth, year: todayYear };
    }

    const closingDay = card.closing_day;

    // Se hoje ainda não passou do dia de fechamento, a fatura atual é deste mês
    if (todayDay <= closingDay) {
      return { month: todayMonth, year: todayYear };
    }

    // Se já passou do dia de fechamento, a fatura atual é do próximo mês
    if (todayMonth === 12) {
      return { month: 1, year: todayYear + 1 };
    }
    return { month: todayMonth + 1, year: todayYear };
  };

  const currentInvoice = getCurrentInvoiceMonthYear();
  const currentMonth = currentInvoice.month;
  const currentYear = currentInvoice.year;

  // Atualiza o mês de visualização quando o cartão carregar ou mudar
  useEffect(() => {
    if (card && !hasInitialLoad) {
      setViewingMonth(currentMonth);
      setViewingYear(currentYear);
    }
  }, [card, currentMonth, currentYear, hasInitialLoad]);

  // Verifica se está visualizando o mês atual
  const isCurrentMonth =
    viewingMonth === currentMonth && viewingYear === currentYear;

  // Encontrar a fatura do mês/ano visualizado para uso em AddItemModal
  const invoice = (() => {
    if (items.length > 0) {
      return { id: items[0].invoice_id };
    }
    return null;
  })();

  // Carregamento inicial (apenas uma vez)
  useEffect(() => {
    const loadInitialData = async () => {
      if (!card || !user) return;

      try {
        setIsLoading(true);
        // Buscar faturas do cartão (com itens)
        const invoices: (InvoiceWithCard & {
          items: InvoiceItemWithDetails[];
        })[] = await phpApiRequest(
          `invoices.php?card_id=${card.card_id ?? card.id}`
        );
        // Encontrar a fatura do mês/ano atual (usa currentMonth/currentYear calculados)
        const invoice = invoices.find(
          (inv) =>
            inv.reference_month === currentMonth &&
            inv.reference_year === currentYear
        );
        setItems(
          (invoice?.items || []).map((item) => ({
            ...item,
            is_installment: !!Number(item.is_installment),
            is_paid: !!Number(item.is_paid),
          }))
        );
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
      } finally {
        setIsLoading(false);
        setHasInitialLoad(true);
      }
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.card_id, user?.id, currentMonth, currentYear]); // Carrega baseado no mês atual calculado

  // Carregamento de itens quando o mês muda (APÓS carregamento inicial)
  useEffect(() => {
    // Não executa no mount inicial
    if (!hasInitialLoad) return;

    const loadMonthItems = async () => {
      if (!card || !user) return;

      try {
        setIsLoadingItems(true);
        // Buscar faturas do cartão (com itens)
        const invoices: (InvoiceWithCard & {
          items: InvoiceItemWithDetails[];
        })[] = await phpApiRequest(
          `invoices.php?card_id=${card.card_id ?? card.id}`
        );
        // Encontrar a fatura do mês/ano visualizado
        const invoice = invoices.find(
          (inv) =>
            inv.reference_month === viewingMonth &&
            inv.reference_year === viewingYear
        );
        setItems(
          (invoice?.items || []).map((item) => ({
            ...item,
            is_installment: !!Number(item.is_installment),
            is_paid: !!Number(item.is_paid),
          }))
        );

        setSelectedItems(new Set());
      } catch (error) {
        console.error("Erro ao carregar itens:", error);
      } finally {
        setIsLoadingItems(false);
      }
    };

    loadMonthItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingMonth, viewingYear]);

  // Funções de navegação entre meses
  const goToPreviousMonth = () => {
    if (viewingMonth === 1) {
      setViewingMonth(12);
      setViewingYear(viewingYear - 1);
    } else {
      setViewingMonth(viewingMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewingMonth === 12) {
      setViewingMonth(1);
      setViewingYear(viewingYear + 1);
    } else {
      setViewingMonth(viewingMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    setViewingMonth(currentMonth);
    setViewingYear(currentYear);
  };

  // Limpa o cardId do localStorage ao voltar
  const handleBack = () => {
    localStorage.removeItem("lastCardId");
    navigate(-1);
  };

  // Filtrar itens por autor
  const filteredItems = selectedAuthorFilter
    ? items.filter((item) => item.author_id === selectedAuthorFilter)
    : items;

  // Calcular totais por autor
  const authorTotals = authors.map((author) => {
    const authorItems = items.filter((item) => item.author_id === author.id);
    const total = authorItems.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );
    const unpaidTotal = authorItems
      .filter((item) => !item.is_paid)
      .reduce((sum, item) => sum + Number(item.amount), 0);

    return {
      ...author,
      total,
      unpaidTotal,
      itemCount: authorItems.length,
    };
  });

  const handleDeleteCard = async () => {
    if (!card || !user) return;

    try {
      await phpApiRequest(`cards.php?action=deactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: card.card_id ?? card.id,
          user_id: user.id,
        }),
      });
      removeCard(card.card_id ?? card.id);
      navigate("/dashboard");
    } catch (error) {
      console.error("Erro ao excluir cartão:", error);
      alert("Erro ao excluir cartão");
    }
  };

  const toggleSelectItem = (itemId: number) => {
    // Permite seleção em qualquer mês para marcar como pago
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const markSelectedAsPaid = async () => {
    if (!user || selectedItems.size === 0) return;

    try {
      await Promise.all(
        Array.from(selectedItems).map((itemId) =>
          phpApiRequest(`invoice_items.php`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: itemId, is_paid: true }),
          })
        )
      );
      setItems((prev) =>
        prev.map((item) =>
          selectedItems.has(item.id) ? { ...item, is_paid: true } : item
        )
      );
      setSelectedItems(new Set());
    } catch (error) {
      console.error("Erro ao marcar itens como pagos:", error);
    }
  };

  const deleteSelectedItems = async () => {
    if (!user || selectedItems.size === 0) return;

    if (!confirm(`Deseja excluir ${selectedItems.size} item(ns)?`)) {
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedItems).map((itemId) =>
          phpApiRequest(`invoice_items.php`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: itemId }),
          })
        )
      );
      // setItems((prev) => prev.filter((item) => !selectedItems.has(item.id)));
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
      );
      setSelectedItems(new Set());
    } catch (error) {
      console.error("Erro ao excluir itens:", error);
      alert("Erro ao excluir itens");
    }
  };

  const openEditModal = (item: InvoiceItemWithDetails) => {
    // Permite edição de itens de qualquer mês
    setEditingItem(item);
    setShowEditModal(true);
  };

  const saveItemChanges = async (
    updatedItem: Partial<InvoiceItemWithDetails>
  ) => {
    if (!editingItem || !user) return;

    try {
      await phpApiRequest(`items.php?action=update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: editingItem.id,
          user_id: user.id,
          ...updatedItem,
        }),
      });
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id ? { ...item, ...updatedItem } : item
        )
      );
    } catch (error) {
      console.error("Erro ao atualizar item:", error);
      throw error;
    }
  };

  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cartão não encontrado</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  const totalAmount = items.reduce((sum, item) => sum + Number(item.amount), 0);
  const paidAmount = items
    .filter((item) => item.is_paid)
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const remainingAmount = totalAmount - paidAmount;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 transition-colors">
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
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {card.card_name ?? card.name}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button
                onClick={() => navigate(`/cards/${cardId}/edit`)}
                className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-1.5 sm:p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Navegação de Meses */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={goToPreviousMonth}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm sm:text-base"
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
                  className="text-xs sm:text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium mt-1"
                >
                  Ir para o mês atual
                </button>
              )}
            </div>

            <button
              onClick={goToNextMonth}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm sm:text-base"
            >
              <span className="hidden sm:inline">Próximo</span>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
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
              <p className="text-xs sm:text-sm opacity-80">Limite Total</p>
              <p className="text-xl sm:text-3xl font-bold">
                R${" "}
                {Number(card.card_limit ?? 0).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <CreditCard className="w-8 h-8 sm:w-12 sm:h-12 opacity-80" />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div>
              <p className="text-xs opacity-80">Total Fatura</p>
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
              <span className="font-semibold">{card.closing_day ?? ""}</span>
            </div>
            <div>
              <span className="opacity-80">Vence dia</span>{" "}
              <span className="font-semibold">{card.due_day ?? ""}</span>
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
                  className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-lg text-xs flex items-center gap-1 hover:bg-primary-200 dark:hover:bg-primary-900/50 transition"
                >
                  <span className="truncate max-w-[100px]">
                    {authors.find((a) => a.id === selectedAuthorFilter)?.name}
                  </span>
                  <X className="w-3 h-3 flex-shrink-0" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {selectedItems.size > 0 && (
                <>
                  <button
                    onClick={markSelectedAsPaid}
                    className="px-2 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
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
                    className="px-2 sm:px-4 py-1.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
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
              <button
                onClick={() => setShowAuthorFilter(true)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-xs sm:text-base"
              >
                <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Filtrar por Pessoa</span>
                <span className="sm:hidden">Filtrar</span>
              </button>
              {isCurrentMonth && (
                <button
                  onClick={() => setShowAddItemModal(true)}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-xs sm:text-base"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Adicionar Item</span>
                  <span className="sm:hidden">Novo</span>
                </button>
              )}
            </div>
          </div>

          {isLoadingItems ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                Carregando itens...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 sm:py-12 animate-fade-in">
              <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-2">
                Nenhum item nesta fatura
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
                .map((item, index) => (
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
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                    onClick={() => toggleSelectItem(item.id)}
                  >
                    <div className="flex-shrink-0 mt-0.5 sm:mt-0">
                      {selectedItems.has(item.id) ? (
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
                      ) : item.is_paid ? (
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
                      )}
                    </div>

                    <div
                      className="flex-1 min-w-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(item);
                      }}
                    >
                      <p
                        className={`font-medium text-sm sm:text-base truncate ${
                          item.is_paid
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
                        <span className="truncate">{item.author_name}</span>
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
                          item.is_paid
                            ? "text-gray-400 dark:text-gray-600"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        R${" "}
                        {Number(item.amount).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      {item.installment_number && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {item.installment_number}/{item.total_installments}x
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Author Filter Modal */}
      {showAuthorFilter && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
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

            <div className="space-y-3">
              <button
                onClick={() => {
                  setSelectedAuthorFilter(null);
                  setShowAuthorFilter(false);
                }}
                className={`w-full p-4 rounded-lg text-left transition border-2 ${
                  selectedAuthorFilter === null
                    ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20"
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
                    setSelectedAuthorFilter(author.id);
                    setShowAuthorFilter(false);
                  }}
                  className={`w-full p-4 rounded-lg text-left transition border-2 ${
                    selectedAuthorFilter === author.id
                      ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20"
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
                      <span className="font-semibold text-gray-900 dark:text-white">
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
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 transition-colors">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Excluir Cartão?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Tem certeza que deseja excluir o cartão "{card.name}"? Esta ação
              não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteCard}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {/* Add Item Modal */}
      {showAddItemModal && card && invoice && (
        <AddItemModal
          card={card}
          invoiceId={invoice.id}
          open={showAddItemModal}
          onClose={() => setShowAddItemModal(false)}
          onItemAdded={async () => {
            setShowAddItemModal(false);
            // Recarrega os itens da fatura após adicionar
            setIsLoadingItems(true);
            try {
              const invoices = await phpApiRequest(
                `invoices.php?card_id=${card.card_id ?? card.id}`
              );
              const invoiceAtual = (
                invoices as (InvoiceWithCard & {
                  items: InvoiceItemWithDetails[];
                })[]
              ).find(
                (inv: InvoiceWithCard & { items: InvoiceItemWithDetails[] }) =>
                  inv.reference_month === viewingMonth &&
                  inv.reference_year === viewingYear
              );
              setItems(invoiceAtual?.items || []);
              setSelectedItems(new Set());
            } catch (error) {
              console.error("Erro ao recarregar itens após adicionar:", error);
            } finally {
              setIsLoadingItems(false);
            }
          }}
        />
      )}

      {/* Edit Item Modal */}
      {showEditModal && editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => {
            setShowEditModal(false);
            setEditingItem(null);
          }}
          onSave={saveItemChanges}
        />
      )}
    </div>
  );
}
