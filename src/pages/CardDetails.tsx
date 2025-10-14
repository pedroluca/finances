import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useAppStore } from '../store/app.store';
import { CardService } from '../services/card.api';
import { InvoiceService } from '../services/invoice.api';
import { ItemService } from '../services/item.api';
import EditItemModal from '../components/EditItemModal';
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
} from 'lucide-react';
import type { InvoiceItemWithDetails } from '../types/database';

export default function CardDetails() {
  const navigate = useNavigate();
  const { cardId } = useParams<{ cardId: string }>();
  const { user } = useAuthStore();
  const { cards, removeCard } = useAppStore();

  const [items, setItems] = useState<InvoiceItemWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [editingItem, setEditingItem] = useState<InvoiceItemWithDetails | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Estado para controlar o mês/ano visualizado
  const currentDate = new Date();
  const [viewingMonth, setViewingMonth] = useState(currentDate.getMonth() + 1);
  const [viewingYear, setViewingYear] = useState(currentDate.getFullYear());

  const card = cards.find((c) => c.id === Number(cardId));
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  // Verifica se está visualizando o mês atual
  const isCurrentMonth = viewingMonth === currentMonth && viewingYear === currentYear;

  useEffect(() => {
    const loadInvoiceData = async () => {
      if (!card || !user) return;

      try {
        setIsLoading(true);

        // Buscar ou criar fatura do mês visualizado
        const invoice = await InvoiceService.getOrCreateInvoice(
          card.id,
          viewingMonth,
          viewingYear
        );

        if (invoice) {
          // Buscar itens da fatura
          const invoiceItems = await ItemService.getInvoiceItems(invoice.id);
          setItems(invoiceItems);
        }
        
        // Limpar seleção ao trocar de mês
        setSelectedItems(new Set());
      } catch (error) {
        console.error('Erro ao carregar fatura:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInvoiceData();
  }, [card, user, viewingMonth, viewingYear]);

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

  const handleDeleteCard = async () => {
    if (!card || !user) return;

    try {
      await CardService.deactivateCard(card.id, user.id);
      removeCard(card.id);
      navigate('/dashboard');
    } catch (error) {
      console.error('Erro ao excluir cartão:', error);
      alert('Erro ao excluir cartão');
    }
  };

  const toggleSelectItem = (itemId: number) => {
    // Só permite seleção no mês atual
    if (!isCurrentMonth) return;
    
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
          ItemService.togglePaidStatus(itemId, user.id)
        )
      );
      
      setItems((prev) =>
        prev.map((item) =>
          selectedItems.has(item.id) ? { ...item, is_paid: true } : item
        )
      );
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Erro ao marcar itens como pagos:', error);
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
          ItemService.deleteItem(itemId)
        )
      );
      
      setItems((prev) => prev.filter((item) => !selectedItems.has(item.id)));
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Erro ao excluir itens:', error);
      alert('Erro ao excluir itens');
    }
  };

  const openEditModal = (item: InvoiceItemWithDetails) => {
    // Só permite edição no mês atual
    if (!isCurrentMonth) return;
    
    setEditingItem(item);
    setShowEditModal(true);
  };

  const saveItemChanges = async (updatedItem: Partial<InvoiceItemWithDetails>) => {
    if (!editingItem || !user) return;

    try {
      await ItemService.updateItem(editingItem.id, user.id, updatedItem);

      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id ? { ...item, ...updatedItem } : item
        )
      );
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{card.name}</h1>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button
                onClick={() => navigate(`/cards/${cardId}/edit`)}
                className="p-1.5 sm:p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Navegação de Meses */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={goToPreviousMonth}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm sm:text-base"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Mês Anterior</span>
              <span className="sm:hidden">Anterior</span>
            </button>

            <div className="text-center flex-1 min-w-0">
              <p className="text-sm sm:text-lg font-semibold text-gray-900 capitalize truncate">
                {new Date(viewingYear, viewingMonth - 1).toLocaleDateString('pt-BR', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
              {!isCurrentMonth && (
                <button
                  onClick={goToCurrentMonth}
                  className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Voltar para atual
                </button>
              )}
              {!isCurrentMonth && (
                <p className="text-xs text-amber-600 mt-1 hidden sm:block">
                  📌 Visualização apenas - Edição desabilitada
                </p>
              )}
            </div>

            <button
              onClick={goToNextMonth}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm sm:text-base"
            >
              <span className="hidden sm:inline">Próximo Mês</span>
              <span className="sm:hidden">Próximo</span>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Card Info */}
        <div
          className="rounded-xl shadow-lg p-4 sm:p-6 text-white mb-4 sm:mb-8"
          style={{ backgroundColor: card.color }}
        >
          <div className="flex justify-between items-start mb-4 sm:mb-8">
            <div>
              <p className="text-xs sm:text-sm opacity-80">Limite Total</p>
              <p className="text-xl sm:text-3xl font-bold">
                R$ {Number(card.card_limit).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <CreditCard className="w-8 h-8 sm:w-12 sm:h-12 opacity-80" />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div>
              <p className="text-xs opacity-80">Total Fatura</p>
              <p className="text-sm sm:text-lg font-semibold">
                R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-80">Pago</p>
              <p className="text-sm sm:text-lg font-semibold text-green-200">
                R$ {paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-80">Restante</p>
              <p className="text-sm sm:text-lg font-semibold text-yellow-200">
                R$ {remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="mt-4 sm:mt-6 flex gap-3 sm:gap-4 text-xs sm:text-sm">
            <div>
              <span className="opacity-80">Fecha dia</span>{' '}
              <span className="font-semibold">{card.closing_day}</span>
            </div>
            <div>
              <span className="opacity-80">Vence dia</span>{' '}
              <span className="font-semibold">{card.due_day}</span>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
              Itens da Fatura ({items.length})
            </h2>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {selectedItems.size > 0 && isCurrentMonth && (
                <>
                  <button
                    onClick={markSelectedAsPaid}
                    className="px-2 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                  >
                    <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Marcar {selectedItems.size} como pago</span>
                    <span className="sm:hidden">Pagar ({selectedItems.size})</span>
                  </button>
                  <button
                    onClick={deleteSelectedItems}
                    className="px-2 sm:px-4 py-1.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Excluir {selectedItems.size}</span>
                    <span className="sm:hidden">Del ({selectedItems.size})</span>
                  </button>
                </>
              )}
              {isCurrentMonth && (
                <button
                  onClick={() => navigate(`/cards/${cardId}/items/new`)}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-xs sm:text-base"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Adicionar Item</span>
                  <span className="sm:hidden">Novo</span>
                </button>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-sm sm:text-base text-gray-600 mb-2">Nenhum item nesta fatura</p>
              <p className="text-xs sm:text-sm text-gray-500">
                Clique em "Adicionar Item" para começar
              </p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 border-2 rounded-lg transition ${
                    isCurrentMonth ? 'cursor-pointer' : 'cursor-default opacity-75'
                  } ${
                    selectedItems.has(item.id)
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => isCurrentMonth && toggleSelectItem(item.id)}
                >
                  <div className="flex-shrink-0 mt-0.5 sm:mt-0">
                    {isCurrentMonth ? (
                      selectedItems.has(item.id) ? (
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                      ) : item.is_paid ? (
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
                      )
                    ) : (
                      // Ícone fixo para visualização apenas
                      item.is_paid ? (
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                      )
                    )}
                  </div>

                  <div
                    className="flex-1 min-w-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(item);
                    }}
                  >
                    <p className={`font-medium text-sm sm:text-base truncate ${item.is_paid ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {item.description}
                    </p>
                    <div className="flex flex-wrap gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-gray-500">
                      {item.category_name && (
                        <span className="flex items-center gap-1 truncate">
                          {item.category_icon} {item.category_name}
                        </span>
                      )}
                      <span className="truncate">{item.author_name}</span>
                      {item.purchase_date && (
                        <span className="hidden sm:inline">
                          {new Date(item.purchase_date).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm sm:text-lg font-semibold ${item.is_paid ? 'text-gray-400' : 'text-gray-900'}`}>
                      R$ {Number(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {item.installment_number && (
                      <p className="text-xs text-gray-500">
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Excluir Cartão?
            </h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir o cartão "{card.name}"? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
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
