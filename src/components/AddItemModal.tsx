import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useAuthStore } from '../store/auth.store';
import { useAppStore } from '../store/app.store';
import { phpApiRequest } from '../lib/api';
import type { CardWithBalance } from '../types/database';
import { DollarSign, FileText, Calendar, Tag, User, Plus, X } from 'lucide-react';

interface AddItemModalProps {
  card: CardWithBalance;
  invoiceId: number;
  open: boolean;
  onClose: () => void;
  onItemAdded?: () => void;
}

export default function AddItemModal({ card, open, onClose, onItemAdded }: AddItemModalProps) {
  const { user } = useAuthStore();
  const { categories, setCategories, authors, setAuthors, addAuthor } = useAppStore();
  const [isDataLoading, setIsDataLoading] = useState(false);
  const defaultAuthor = useMemo(() => authors.find((a) => a.is_owner), [authors]);

  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      setIsDataLoading(true);
      try {
        // Não busca mais cards aqui, pois o card já é passado como prop
        if (!categories.length) {
          const categoriesData = await phpApiRequest('categories.php', { method: 'GET' });
          setCategories(categoriesData);
        }
        if (!authors.length) {
          const authorsData = await phpApiRequest('authors.php', { method: 'GET' });
          setAuthors(authorsData);
        }
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [authorId, setAuthorId] = useState('');
  useEffect(() => {
    if (defaultAuthor && !authorId) {
      setAuthorId(defaultAuthor.id.toString());
    }
  }, [defaultAuthor, authorId]);
  const [newAuthorName, setNewAuthorName] = useState('');
  const [showNewAuthor, setShowNewAuthor] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState('1');
  const [currentInstallment, setCurrentInstallment] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user || !card) {
      setError('Dados inválidos');
      return;
    }
    if (!description.trim()) {
      setError('Digite uma descrição');
      return;
    }
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setError('Digite um valor válido');
      return;
    }
    let selectedAuthorId = authorId ? Number(authorId) : defaultAuthor?.id;
    if (showNewAuthor && newAuthorName.trim()) {
      try {
        setIsLoading(true);
        // Corrigir: enviar user_id e is_owner
        const newAuthor = await phpApiRequest('authors.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            name: newAuthorName.trim(),
            is_owner: false
          })
        });
        if (newAuthor && newAuthor.id) {
          addAuthor(newAuthor);
          setAuthorId(newAuthor.id.toString());
          selectedAuthorId = newAuthor.id;
        } else {
          selectedAuthorId = defaultAuthor?.id;
          setShowNewAuthor(false);
        }
        setIsLoading(false);
      } catch (err) {
        console.log(err)
        selectedAuthorId = defaultAuthor?.id;
        setShowNewAuthor(false);
        setIsLoading(false);
      }
    }
    if (!selectedAuthorId) {
      setError('Selecione quem comprou');
      return;
    }
    try {
      setIsLoading(true);
      if (isInstallment && Number(installments) > 1) {
        // Garantir card_id sempre presente
        let cardIdToSend = card?.id;
        if (!cardIdToSend) {
          const stored = localStorage.getItem('lastCardId');
          if (stored) cardIdToSend = Number(stored);
        }
        const payload = {
          action: 'createInstallment',
          card_id: cardIdToSend,
          description: description.trim(),
          total_amount: amountValue,
          total_installments: Number(installments),
          author_id: selectedAuthorId,
          ...(categoryId ? { category_id: Number(categoryId) } : {}),
          purchase_date: purchaseDate,
          current_installment: Number(currentInstallment)
        };
        console.log('Enviando parcelado:', payload); // DEBUG
        await phpApiRequest('items.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Garantir card_id sempre presente
        let cardIdToSend = card?.id || card?.card_id;
        if (!cardIdToSend) {
          const stored = localStorage.getItem('lastCardId');
          if (stored) cardIdToSend = Number(stored);
        }
        
        await phpApiRequest('items.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            card_id: cardIdToSend,
            description: description.trim(),
            amount: amountValue,
            author_id: selectedAuthorId,
            ...(categoryId ? { category_id: Number(categoryId) } : {}),
            purchase_date: purchaseDate
          })
        });
      }
      if (onItemAdded) onItemAdded();
      onClose();
    } catch (err) {
      console.log(err)
      setError('Erro ao criar item');
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.5)]">
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-lg w-full p-6 relative animate-fade-in max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute cursor-pointer top-4 right-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <X className="w-6 h-6 text-gray-500" />
        </button>
        <h2 className="text-xl font-bold mb-4 dark:text-white">Adicionar Item</h2>
        {isDataLoading ? (
          <div className="py-12 text-center text-gray-500">Carregando dados...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ... (o mesmo conteúdo do form do AddItem) ... */}
            {/* Descrição */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
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
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                  <DollarSign className="w-4 h-4 inline mr-2" />
                  Valor
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
                <label htmlFor="installments" className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                  Parcelas
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    id="installments"
                    value={installments}
                    onChange={(e) => {
                      const value = e.target.value;
                      setInstallments(value);
                      setIsInstallment(Number(value) > 1);
                      if (Number(value) < Number(currentInstallment)) {
                        setCurrentInstallment('1');
                      }
                    }}
                    min="1"
                    max="24"
                    className="w-full px-4 py-3 border border-gray-300 dark:text-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                {isInstallment && (
                  <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                    {Number(installments)}x de R${
                      ' '}
                    {(parseFloat(amount || '0') / Number(installments)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>
            {/* Parcela Atual */}
            {isInstallment && (
              <div>
                <label htmlFor="currentInstallment" className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
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
                  Será criada a partir da parcela {currentInstallment} até a {installments} ({Number(installments) - Number(currentInstallment) + 1} parcela{Number(installments) - Number(currentInstallment) + 1 !== 1 ? 's' : ''})
                </p>
              </div>
            )}
            {/* Categoria */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                <Tag className="w-4 h-4 inline mr-2" />
                Categoria (Opcional)
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:text-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="" className='dark:bg-gray-800'>Sem categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className='dark:bg-gray-800'>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
            {/* Autor */}
            <div>
              <label htmlFor="author" className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Quem comprou?
              </label>
              {!showNewAuthor ? (
                <>
                  <select
                    id="author"
                    value={authorId}
                    onChange={(e) => setAuthorId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:text-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="" className='dark:bg-gray-800'>Selecione...</option>
                    {authors.map((author) => (
                      <option key={author.id} value={author.id} className='dark:bg-gray-800'>
                        {author.name} {author.is_owner ? '(Você)' : ''}
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
                      setShowNewAuthor(false);
                      setNewAuthorName('');
                    }}
                    className="mt-2 text-sm cursor-pointer text-gray-600 dark:text-white hover:text-gray-700"
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>
            {/* Data da Compra */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
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
                {isLoading ? 'Salvando...' : 'Adicionar'}
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
  );
}
