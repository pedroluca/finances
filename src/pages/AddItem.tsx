import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useAppStore } from '../store/app.store';
import { phpApiRequest } from '../lib/api';
import { ArrowLeft, DollarSign, FileText, Calendar, Tag, User, Plus, Repeat } from 'lucide-react';

const SUBSCRIPTION_CATEGORY_ID = 7;

export default function AddItem() {
  const navigate = useNavigate();
  const { cardId } = useParams<{ cardId: string }>();
  const { user } = useAuthStore();
  const { cards, setCards, categories, setCategories, authors, setAuthors, addAuthor } = useAppStore();

  const [isDataLoading, setIsDataLoading] = useState(false);

  // Sempre derive o cartão e o autor do store, nunca guarde em useState
  const card = useMemo(() => cards.find((c) => c.id === Number(cardId)), [cards, cardId]);
  const defaultAuthor = useMemo(() => authors.find((a) => a.is_owner), [authors]);

  // Carregar dados necessários se não estiverem no store
  useEffect(() => {
    const fetchData = async () => {
      setIsDataLoading(true);
      try {
        if (!cards.length) {
          const cardsData = await phpApiRequest('cards.php', { method: 'GET' });
          setCards(cardsData);
        }
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
  }, [cardId]);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [authorId, setAuthorId] = useState('');

  // Sempre que defaultAuthor mudar (após carregar autores), atualize o authorId se ele estiver vazio
  useEffect(() => {
    if (defaultAuthor && !authorId) {
      setAuthorId(defaultAuthor.id.toString());
    }
  }, [defaultAuthor, authorId]);
  const [newAuthorName, setNewAuthorName] = useState('');
  const [showNewAuthor, setShowNewAuthor] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState('1');
  const [currentInstallment, setCurrentInstallment] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAmountChange = (value: string) => {
    // Remove tudo exceto números
    const numbers = value.replace(/\D/g, '');
    
    if (numbers === '') {
      setAmount('');
      setDisplayAmount('');
      return;
    }

    // Converte para número (centavos)
    const numValue = parseInt(numbers) / 100;
    setAmount(numValue.toString());

    // Formata para exibição
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

    // Se estiver criando novo autor
    let selectedAuthorId = authorId ? Number(authorId) : defaultAuthor?.id;
    
    if (showNewAuthor && newAuthorName.trim()) {
      try {
        setIsLoading(true);
        const newAuthor = await phpApiRequest('authors.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newAuthorName.trim() })
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
        console.error('Erro ao criar autor:', err);
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

      const [pYear, pMonth, pDay] = purchaseDate.split('-').map(Number);
      let currentMonth = pMonth;
      let currentYear = pYear;

      if (pDay >= card.closing_day) {
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }

      // Buscar ou criar fatura do mês atual (simulado: só pega a primeira fatura do cartão)
      const invoices = await phpApiRequest('invoices.php', { method: 'GET' });
  let invoice = invoices.find((inv: { cardId: number; month: number; year: number; id: number }) => inv.cardId === card.id && inv.month === currentMonth && inv.year === currentYear);
      if (!invoice) {
        // Cria nova fatura
        invoice = await phpApiRequest('invoices.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId: card.id, month: currentMonth, year: currentYear })
        });
      }
      if (!invoice || !invoice.id) {
        setError('Erro ao buscar/criar fatura');
        return;
      }

      if (isInstallment && Number(installments) > 1) {
        // Criar item parcelado
        await phpApiRequest('items.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'createInstallment',
            card_id: card.id,
            description: description.trim(),
            total_amount: amountValue,
            total_installments: Number(installments),
            author_id: selectedAuthorId,
            category_id: categoryId ? Number(categoryId) : undefined,
            purchase_date: purchaseDate,
            current_installment: Number(currentInstallment)
          })
        });
      } else {
        // Criar item único
        await phpApiRequest('items.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoice_id: invoice.id,
            description: description.trim(),
            amount: amountValue,
            author_id: selectedAuthorId,
            category_id: categoryId ? Number(categoryId) : undefined,
            purchase_date: purchaseDate
          })
        });
      }

      // Voltar para a página do cartão
      navigate(`/cards/${cardId}`);
    } catch (err) {
      console.error('Erro ao criar item:', err);
      setError('Erro ao criar item');
    } finally {
      setIsLoading(false);
    }
  };

  if (isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando dados...</p>
      </div>
    );
  }
  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cartão não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(`/cards/${cardId}`)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Adicionar Item</h1>
            <p className="text-sm text-gray-600">
              {card.name} - Fatura atual
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Descrição */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-2" />
                Descrição
              </label>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Compras no supermercado"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            {/* Valor e Parcelamento */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-2" />
                  Valor
                </label>
                <input
                  type="text"
                  id="amount"
                  value={displayAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="R$ 0,00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="installments" className="block text-sm font-medium text-gray-700 mb-2">
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
                      // Resetar parcela atual se mudar total
                      if (Number(value) < Number(currentInstallment)) {
                        setCurrentInstallment('1');
                      }
                    }}
                    min="1"
                    max="24"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                {isInstallment && (
                  <p className="text-xs text-gray-500 mt-1">
                    {Number(installments)}x de R${' '}
                    {(parseFloat(amount || '0') / Number(installments)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>

            {/* Parcela Atual - só aparece se for parcelado */}
            {isInstallment && (
              <div>
                <label htmlFor="currentInstallment" className="block text-sm font-medium text-gray-700 mb-2">
                  Parcela Atual
                </label>
                <input
                  type="number"
                  id="currentInstallment"
                  value={currentInstallment}
                  onChange={(e) => setCurrentInstallment(e.target.value)}
                  min="1"
                  max={installments}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Será criada a partir da parcela {currentInstallment} até a {installments} ({Number(installments) - Number(currentInstallment) + 1} parcela{Number(installments) - Number(currentInstallment) + 1 !== 1 ? 's' : ''})
                </p>
              </div>
            )}

            {/* Categoria */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 inline mr-2" />
                Categoria (Opcional)
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Sem categoria</option>
                {categories.filter((cat) => cat.id !== SUBSCRIPTION_CATEGORY_ID).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
                <option value={String(SUBSCRIPTION_CATEGORY_ID)}>🔄 Assinaturas (recorrente)</option>
              </select>

              {/* Nota informativa quando Assinaturas for selecionada */}
              {categoryId === String(SUBSCRIPTION_CATEGORY_ID) && (
                <p className="mt-2 text-xs text-purple-600 flex items-center gap-1">
                  <Repeat className="w-3 h-3" />
                  Será cadastrada como assinatura recorrente e aparecerá na página de Assinaturas.
                </p>
              )}

            </div>

            {/* Autor */}
            <div>
              <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Quem comprou?
              </label>
              
              {!showNewAuthor ? (
                <>
                  <select
                    id="author"
                    value={authorId}
                    onChange={(e) => setAuthorId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    {authors.map((author) => (
                      <option key={author.id} value={author.id}>
                        {author.name} {author.is_owner && '(Você)'}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewAuthor(true)}
                    className="mt-2 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewAuthor(false);
                      setNewAuthorName('');
                    }}
                    className="mt-2 text-sm text-gray-600 hover:text-gray-700"
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>

            {/* Data da Compra */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Data da Compra
              </label>
              <input
                type="date"
                id="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate(`/cards/${cardId}`)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
