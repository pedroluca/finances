import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useAppStore } from '../store/app.store';
import type { InvoiceItemWithDetails } from '../types/database';

interface EditItemModalProps {
  item: InvoiceItemWithDetails;
  onClose: () => void;
  onSave: (updatedItem: Partial<InvoiceItemWithDetails>) => Promise<void>;
}

export default function EditItemModal({ item, onClose, onSave }: EditItemModalProps) {
  const { categories, authors } = useAppStore();
  
  const [description, setDescription] = useState(item.description);
  const [amount, setAmount] = useState(item.amount.toString());
  const [displayAmount, setDisplayAmount] = useState('');
  const [categoryId, setCategoryId] = useState(item.category_id?.toString() || '');
  const [authorId, setAuthorId] = useState(item.author_id.toString());
  const [purchaseDate, setPurchaseDate] = useState(
    item.purchase_date ? new Date(item.purchase_date).toISOString().split('T')[0] : ''
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Formatar valor inicial
    const numValue = Number(item.amount);
    const formatted = numValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    setDisplayAmount(`R$ ${formatted}`);
  }, [item.amount]);

  const handleAmountChange = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers === '') {
      setAmount('');
      setDisplayAmount('');
      return;
    }

    const numValue = parseInt(numbers) / 100;
    setAmount(numValue.toString());

    const formatted = numValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    setDisplayAmount(`R$ ${formatted}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onSave({
        description: description.trim(),
        amount: parseFloat(amount),
        category_id: categoryId ? Number(categoryId) : null,
        author_id: Number(authorId),
        purchase_date: purchaseDate ? new Date(purchaseDate) : null,
      });
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar alterações');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Editar Item</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor
            </label>
            <input
              type="text"
              value={displayAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="R$ 0,00"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
            {item.is_installment && (
              <p className="text-xs text-gray-500 mt-1">
                Parcela {item.installment_number}/{item.total_installments}
              </p>
            )}
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sem categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quem comprou */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quem comprou?
            </label>
            <select
              value={authorId}
              onChange={(e) => setAuthorId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            >
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.name} {author.is_owner && '(Você)'}
                </option>
              ))}
            </select>
          </div>

          {/* Data da Compra */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data da Compra
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {isLoading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
