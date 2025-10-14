import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useAppStore } from '../store/app.store';
import {
  CreditCard,
  Plus,
  LogOut,
  Calendar,
  TrendingUp,
  DollarSign,
  Settings,
} from 'lucide-react';
import { CardService } from '../services/card.api';
import { InvoiceService } from '../services/invoice.api';
import { CategoryService } from '../services/category.api';
import { AuthorService } from '../services/author.api';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();
  const {
    cards,
    setCards,
    setCategories,
    setAuthors,
    monthlyTotals,
    setMonthlyTotals,
    selectedMonth,
    selectedYear,
    setSelectedMonth,
    setSelectedYear,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [cardInvoiceTotals, setCardInvoiceTotals] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    const loadInitialData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);

        // Carregar dados em paralelo
        const [cardsData, categoriesData, authorsData, totalsData, invoicesData] =
          await Promise.all([
            CardService.getUserCards(user.id),
            CategoryService.getUserCategories(user.id),
            AuthorService.getUserAuthors(user.id),
            InvoiceService.getMonthlyTotals(user.id, 6),
            InvoiceService.getUserInvoices(user.id),
          ]);

        setCards(cardsData);
        setCategories(categoriesData);
        setAuthors(authorsData);
        setMonthlyTotals(totalsData);

        // Calcular total de faturas por cartão
        const totals: Record<number, number> = {};
        invoicesData.forEach((invoice) => {
          console.log('Invoice:', invoice.card_id, 'Mês:', invoice.reference_month, 'Valor:', invoice.total_amount);
          if (!totals[invoice.card_id]) {
            totals[invoice.card_id] = 0;
          }
          totals[invoice.card_id] += Number(invoice.total_amount);
        });
        console.log('Totais calculados:', totals);
        setCardInvoiceTotals(totals);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [isAuthenticated, user, navigate, setCards, setCategories, setAuthors, setMonthlyTotals]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentMonthTotal = monthlyTotals.find(
    (t) => t.reference_month === selectedMonth && t.reference_year === selectedYear
  );

  const activeCards = cards.filter((c) => c.active);
  const totalLimit = activeCards.reduce((sum, card) => sum + Number(card.card_limit), 0);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Gerenciador de Faturas
                </h1>
                <p className="text-sm text-gray-600">Olá, {user?.name}!</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total de Cartões
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {activeCards.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Limite Total
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  R$ {totalLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Gasto do Mês
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  R${' '}
                  {(currentMonthTotal?.total_amount || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Month Selector */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Período Selecionado
            </h2>
            <div className="flex items-center gap-3">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {new Date(2025, month - 1).toLocaleDateString('pt-BR', {
                      month: 'long',
                    })}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(
                  (year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Cards List */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Meus Cartões
            </h2>
            <button
              onClick={() => navigate('/cards/new')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              <Plus className="w-5 h-5" />
              <span>Novo Cartão</span>
            </button>
          </div>

          {activeCards.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Você ainda não tem cartões cadastrados
              </p>
              <button
                onClick={() => navigate('/cards/new')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                <Plus className="w-5 h-5" />
                <span>Adicionar Primeiro Cartão</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeCards.map((card) => {
                const totalInvoices = cardInvoiceTotals[card.id] || 0;
                const availableLimit = Number(card.card_limit) - totalInvoices;

                return (
                  <button
                    key={card.id}
                    onClick={() => navigate(`/cards/${card.id}`)}
                    className="p-6 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition text-left"
                    style={{ borderLeftWidth: '4px', borderLeftColor: card.color }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {card.name}
                      </h3>
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${card.color}20` }}
                      >
                        <CreditCard
                          className="w-4 h-4"
                          style={{ color: card.color }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Limite:</span>
                        <span className="font-medium text-gray-900">
                          R${' '}
                          {Number(card.card_limit).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Limite Disponível:</span>
                        <span className={`font-semibold ${availableLimit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          R${' '}
                          {availableLimit.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fechamento:</span>
                        <span className="font-medium text-gray-900">
                          Dia {card.closing_day}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Vencimento:</span>
                        <span className="font-medium text-gray-900">
                          Dia {card.due_day}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Months */}
        {monthlyTotals.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Últimos Meses
            </h2>
            <div className="space-y-3">
              {monthlyTotals.map((total) => (
                <div
                  key={`${total.reference_year}-${total.reference_month}`}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(
                        total.reference_year,
                        total.reference_month - 1
                      ).toLocaleDateString('pt-BR', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {total.total_cards} cartão(ões)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      R${' '}
                      {total.total_amount.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-sm text-green-600">
                      Pago: R${' '}
                      {total.paid_amount.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
