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

  const card = cards.find((c) => c.id === Number(cardId));
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const loadInvoiceData = async () => {
      if (!card || !user) return;

      try {
        setIsLoading(true);

        // Buscar ou criar fatura do mês atual
        const currentInvoice = await InvoiceService.getOrCreateInvoice(
          card.id,
          currentMonth,
          currentYear
        );

        if (currentInvoice) {
          // Buscar itens da fatura
          const invoiceItems = await ItemService.getInvoiceItems(currentInvoice.id);
          setItems(invoiceItems);
        }
      } catch (error) {
        console.error('Erro ao carregar fatura:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInvoiceData();
  }, [card, user, currentMonth, currentYear]);

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
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{card.name}</h1>
              <p className="text-sm text-gray-600">
                Fatura de {new Date(currentYear, currentMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/cards/${cardId}/edit`)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Card Info */}
        <div
          className="rounded-xl shadow-lg p-6 text-white mb-8"
          style={{ backgroundColor: card.color }}
        >
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-sm opacity-80">Limite Total</p>
              <p className="text-3xl font-bold">
                R$ {Number(card.card_limit).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <CreditCard className="w-12 h-12 opacity-80" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs opacity-80">Total Fatura</p>
              <p className="text-lg font-semibold">
                R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-80">Pago</p>
              <p className="text-lg font-semibold text-green-200">
                R$ {paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-80">Restante</p>
              <p className="text-lg font-semibold text-yellow-200">
                R$ {remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="mt-6 flex gap-4 text-sm">
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
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Itens da Fatura ({items.length})
            </h2>
            <div className="flex items-center gap-2">
              {selectedItems.size > 0 && (
                <>
                  <button
                    onClick={markSelectedAsPaid}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm"
                  >
                    <Check className="w-4 h-4" />
                    Marcar {selectedItems.size} como pago
                  </button>
                  <button
                    onClick={deleteSelectedItems}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir {selectedItems.size}
                  </button>
                </>
              )}
              <button
                onClick={() => navigate(`/cards/${cardId}/items/new`)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                <Plus className="w-5 h-5" />
                <span>Adicionar Item</span>
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Nenhum item nesta fatura</p>
              <p className="text-sm text-gray-500">
                Clique em "Adicionar Item" para começar
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 p-4 border-2 rounded-lg transition cursor-pointer ${
                    selectedItems.has(item.id)
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => toggleSelectItem(item.id)}
                >
                  <div className="flex-shrink-0">
                    {selectedItems.has(item.id) ? (
                      <CheckCircle className="w-6 h-6 text-indigo-600" />
                    ) : item.is_paid ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-300" />
                    )}
                  </div>

                  <div
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(item);
                    }}
                  >
                    <p className={`font-medium ${item.is_paid ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {item.description}
                    </p>
                    <div className="flex gap-3 mt-1 text-sm text-gray-500">
                      {item.category_name && (
                        <span className="flex items-center gap-1">
                          {item.category_icon} {item.category_name}
                        </span>
                      )}
                      <span>{item.author_name}</span>
                      {item.purchase_date && (
                        <span>
                          {new Date(item.purchase_date).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`text-lg font-semibold ${item.is_paid ? 'text-gray-400' : 'text-gray-900'}`}>
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
