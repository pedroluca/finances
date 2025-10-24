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

  // Aguarda autores carregarem antes de inicializar authorId
  const [description, setDescription] = useState(item.description);
  const [amount, setAmount] = useState(Number(item.amount).toFixed(2));
  const [displayAmount, setDisplayAmount] = useState(() => {
    const numValue = Number(item.amount);
    return `R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  });
  const [categoryId, setCategoryId] = useState(item.category_id ? String(item.category_id) : '');
  const [authorId, setAuthorId] = useState(() => {
    if (item.author_id) return String(item.author_id);
    if (authors && authors.length > 0) return String(authors[0].id);
    return '';
  });
  const [purchaseDate, setPurchaseDate] = useState(
    item.purchase_date ? new Date(item.purchase_date).toISOString().split('T')[0] : ''
  );
  const [isLoading, setIsLoading] = useState(false);

  // O modal sempre renderiza, mas o select de autores só habilita quando authors estiver carregado

  useEffect(() => {
    // Atualiza o valor formatado ao mudar o amount
    const numValue = Number(amount);
    if (!isNaN(numValue)) {
      setDisplayAmount(`R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    } else {
      setDisplayAmount('');
    }
  }, [amount]);

  const handleAmountChange = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers === '') {
      setAmount('');
      setDisplayAmount('');
      return;
    }
    const numValue = parseInt(numbers) / 100;
    setAmount(numValue.toFixed(2));
    setDisplayAmount(`R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
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
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Editar Item</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
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
              Valor
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
              <option value="" className='dark:bg-gray-800'>Sem categoria</option>
              {categories && categories.length > 0 && categories.map((cat) => (
                <option key={cat.id} value={cat.id} className='dark:bg-gray-800'>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quem comprou */}
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
              <option value="" className='dark:bg-gray-800'>{!authors || authors.length === 0 ? 'Carregando autores...' : 'Selecione...'}</option>
              {authors && authors.length > 0 && authors.map((author) => (
                <option key={author.id} value={author.id} className='dark:bg-gray-800'>
                  {author.name} {author.is_owner && '(Você)'}
                </option>
              ))}
            </select>
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
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 transition"
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
