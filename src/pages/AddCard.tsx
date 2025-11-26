import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useAppStore } from '../store/app.store';
import { phpApiRequest } from '../lib/api';
import { ArrowLeft, CreditCard, DollarSign, Calendar, Palette } from 'lucide-react';

const CARD_COLORS = [
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Roxo', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Laranja', value: '#FF7A00' },
  { name: 'Vermelho', value: '#EF4444' },
  { name: 'Ciano', value: '#06B6D4' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Prata', value: '#9CA3AF' },
  { name: 'Preto', value: '#121212' },
  { name: 'Dourado', value: '#D4AF37' },
  { name: 'Grafite', value: '#2F2F2F' },
];

export default function AddCard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addCard } = useAppStore();

  const [name, setName] = useState('');
  const [cardLimit, setCardLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [color, setColor] = useState(CARD_COLORS[0].value);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('Usuário não autenticado');
      return;
    }

    if (!name.trim()) {
      setError('Digite o nome do cartão');
      return;
    }

    const limit = parseFloat(cardLimit);
    if (isNaN(limit) || limit <= 0) {
      setError('Digite um limite válido');
      return;
    }

    const closing = parseInt(closingDay);
    if (isNaN(closing) || closing < 1 || closing > 31) {
      setError('Dia de fechamento deve ser entre 1 e 31');
      return;
    }

    const due = parseInt(dueDay);
    if (isNaN(due) || due < 1 || due > 31) {
      setError('Dia de vencimento deve ser entre 1 e 31');
      return;
    }

    try {
      setIsLoading(true);

      const newCard = await phpApiRequest('cards.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          card_limit: limit,
          closing_day: closing,
          due_day: due,
          color,
        })
      });

      if (newCard) {
        addCard(newCard);
        navigate('/dashboard');
      } else {
        setError('Erro ao criar cartão');
      }
    } catch (err) {
      console.error('Erro ao criar cartão:', err);
      setError('Erro ao criar cartão');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 transition-colors">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Adicionar Cartão</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Cadastre um novo cartão de crédito</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome do Cartão */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <CreditCard className="w-4 h-4 inline mr-2" />
                Nome do Cartão
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Nubank, Itaú, C6..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                required
                autoFocus
              />
            </div>

            {/* Limite do Cartão */}
            <div>
              <label htmlFor="limit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <DollarSign className="w-4 h-4 inline mr-2" />
                Limite do Cartão
              </label>
              <input
                type="number"
                id="limit"
                value={cardLimit}
                onChange={(e) => setCardLimit(e.target.value)}
                placeholder="Ex: 5000.00"
                step="0.01"
                min="0"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="closing" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Dia de Fechamento
                </label>
                <input
                  type="number"
                  id="closing"
                  value={closingDay}
                  onChange={(e) => setClosingDay(e.target.value)}
                  placeholder="Ex: 15"
                  min="1"
                  max="31"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Dia 1 a 31</p>
              </div>

              <div>
                <label htmlFor="due" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Dia de Vencimento
                </label>
                <input
                  type="number"
                  id="due"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  placeholder="Ex: 25"
                  min="1"
                  max="31"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Dia 1 a 31</p>
              </div>
            </div>

            {/* Cor do Cartão */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <Palette className="w-4 h-4 inline mr-2" />
                Cor do Cartão
              </label>
              <div className="grid grid-cols-4 gap-3">
                {CARD_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      color === c.value
                        ? 'border-gray-900 ring-2 ring-gray-300'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: c.value }}
                  >
                    <span className="text-xs font-medium text-white drop-shadow">
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview do Cartão */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Preview
              </label>
              <div
                className="p-6 rounded-xl shadow-lg text-white"
                style={{ backgroundColor: color }}
              >
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <p className="text-sm opacity-80">Limite Total</p>
                    <p className="text-2xl font-bold">
                      R$ {parseFloat(cardLimit || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <CreditCard className="w-10 h-10 opacity-80" />
                </div>
                <div>
                  <p className="text-lg font-semibold">{name || 'Nome do Cartão'}</p>
                  <p className="text-sm opacity-80 mt-2">
                    Fecha dia {closingDay || '__'} • Vence dia {dueDay || '__'}
                  </p>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Salvando...' : 'Adicionar Cartão'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
