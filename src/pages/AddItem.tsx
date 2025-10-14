import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useAppStore } from '../store/app.store';
import { ItemService } from '../services/item.api';
import { InvoiceService } from '../services/invoice.api';
import { AuthorService } from '../services/author.api';
import { ArrowLeft, DollarSign, FileText, Calendar, Tag, User, Plus } from 'lucide-react';

export default function AddItem() {
  const navigate = useNavigate();
  const { cardId } = useParams<{ cardId: string }>();
  const { user } = useAuthStore();
  const { cards, categories, authors, addAuthor } = useAppStore();

  const card = cards.find((c) => c.id === Number(cardId));
  const defaultAuthor = authors.find((a) => a.is_owner);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [authorId, setAuthorId] = useState(defaultAuthor?.id.toString() || '');
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
        const newAuthor = await AuthorService.createAuthor({
          user_id: user.id,
          name: newAuthorName.trim(),
          is_owner: false,
        });
        
        if (newAuthor) {
          addAuthor(newAuthor);
          selectedAuthorId = newAuthor.id;
        } else {
          // Se não conseguiu criar, usa o autor padrão (você)
          console.warn('Não foi possível criar novo autor, usando autor padrão');
          selectedAuthorId = defaultAuthor?.id;
          setShowNewAuthor(false);
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Erro ao criar autor:', err);
        // Em caso de erro, usa o autor padrão (você)
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

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      // Buscar ou criar fatura do mês atual
      const invoice = await InvoiceService.getOrCreateInvoice(
        card.id,
        currentMonth,
        currentYear
      );

      if (!invoice) {
        setError('Erro ao buscar fatura');
        return;
      }

      if (isInstallment && Number(installments) > 1) {
        // Calcular quantas parcelas faltam criar
        const currentInstallmentNum = Number(currentInstallment);
        
        // Criar item parcelado a partir da parcela atual
        await ItemService.createInstallment({
          card_id: card.id,
          description: description.trim(),
          total_amount: amountValue,
          total_installments: Number(installments),
          author_id: selectedAuthorId,
          category_id: categoryId ? Number(categoryId) : undefined,
          purchase_date: new Date(purchaseDate),
          start_month: currentMonth,
          start_year: currentYear,
          current_installment: currentInstallmentNum,
        });
      } else {
        // Criar item único
        await ItemService.createItem({
          invoice_id: invoice.id,
          description: description.trim(),
          amount: amountValue,
          author_id: selectedAuthorId,
          category_id: categoryId ? Number(categoryId) : undefined,
          purchase_date: new Date(purchaseDate),
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
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
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
