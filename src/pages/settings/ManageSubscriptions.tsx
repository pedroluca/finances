import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, RefreshCw, Pencil, Trash2, X, ChevronDown, Repeat, AlertCircle, Calculator, Pause, Play } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useAppStore } from '../../store/app.store';
import { phpApiRequest } from '../../lib/api';
import type { Subscription, CreateSubscriptionDTO, UpdateSubscriptionDTO, BillingCycle } from '../../types/database';

// ── billing cycle helpers ─────────────────────────────────────────────────────
const CYCLE_OPTIONS: { value: BillingCycle; label: string; shortLabel: string }[] = [
  { value: 'monthly',    label: 'Mensal (todo mês)',         shortLabel: '/mês'       },
  { value: 'semiannual', label: 'Semestral (a cada 6 meses)', shortLabel: '/semestre'  },
  { value: 'annual',     label: 'Anual (uma vez por ano)',    shortLabel: '/ano'       },
];

function cycleShortLabel(cycle?: BillingCycle): string {
  return CYCLE_OPTIONS.find((o) => o.value === (cycle ?? 'monthly'))?.shortLabel ?? '/mês';
}

/** Converte o valor bruto de uma assinatura para equivalente mensal */
function toMonthlyEquivalent(amount: number, cycle?: BillingCycle): number {
  if (cycle === 'annual')     return amount / 12;
  if (cycle === 'semiannual') return amount / 6;
  return amount;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function formatAmount(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseAmountInput(raw: string): { numeric: number; display: string } {
  const numbers = raw.replace(/\D/g, '');
  if (!numbers) return { numeric: 0, display: '' };
  const numeric = parseInt(numbers) / 100;
  const display = `R$ ${numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return { numeric, display };
}

function formatCurrency(val: number) {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function daysUntilRenewal(nextBillingDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renewal = new Date(nextBillingDate + 'T00:00:00');
  return Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function RenewalBadge({ nextBillingDate }: { nextBillingDate: string }) {
  const days = daysUntilRenewal(nextBillingDate);
  const date = new Date(nextBillingDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  if (days < 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <AlertCircle className="w-3 h-3" /> Atrasada
    </span>
  );
  if (days === 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
      <RefreshCw className="w-3 h-3" /> Hoje
    </span>
  );
  if (days <= 3) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
      <RefreshCw className="w-3 h-3" /> {date} ({days}d)
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
      <RefreshCw className="w-3 h-3" /> {date}
    </span>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export default function ManageSubscriptions() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { cards, setCards, authors, setAuthors, categories, setCategories } = useAppStore();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [editingId, setEditingId]         = useState<number | null>(null);
  const [deletingId, setDeletingId]       = useState<number | null>(null);
  const [showInactive, setShowInactive]   = useState(false);
  const [showPaused, setShowPaused]       = useState(true);
  const [globalError, setGlobalError]     = useState('');

  // ── filters ───────────────────────────────────────────────────────────────
  const [filterAuthor, setFilterAuthor]   = useState<number | null>(null);
  const [filterCycle, setFilterCycle]     = useState<BillingCycle | null>(null);

  // ── form state ────────────────────────────────────────────────────────────
  const [fDescription, setFDescription]     = useState('');
  const [fAmount, setFAmount]               = useState('');
  const [fAmountDisplay, setFAmountDisplay] = useState('');
  const [fCardId, setFCardId]               = useState('');
  const [fBillingDay, setFBillingDay]       = useState('5');
  const [fBillingCycle, setFBillingCycle]   = useState<BillingCycle>('monthly');
  const [fNotes, setFNotes]                 = useState('');
  const [fActive, setFActive]               = useState(true);
  const [formError, setFormError]           = useState('');
  const [isSubmitting, setIsSubmitting]     = useState(false);

  // Split / assignments (igual ao AddItemModal)
  const [isSplit, setIsSplit]           = useState(false);
  const [fAuthorId, setFAuthorId]       = useState('');
  const [assignments, setAssignments]   = useState<{ author_id: number; amount: number }[]>([]);

  // ── load data ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchAll = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const [subs, cardsData, authData, catData] = await Promise.all([
          phpApiRequest(`subscriptions.php?user_id=${user.id}`, { method: 'GET' }),
          cards.length ? Promise.resolve(cards) : phpApiRequest(`cards.php?user_id=${user.id}`, { method: 'GET' }),
          authors.length ? Promise.resolve(authors) : phpApiRequest('authors.php', { method: 'GET' }),
          categories.length ? Promise.resolve(categories) : phpApiRequest(`categories.php?user_id=${user.id}`, { method: 'GET' }),
        ]);
        if (subs?.success) setSubscriptions(subs.data ?? []);
        if (!cards.length) setCards(cardsData);
        if (!authors.length) setAuthors(authData);
        if (!categories.length) setCategories(catData);
      } catch (err) {
        console.error(err);
        setGlobalError('Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const defaultAuthor = useMemo(() => authors.find((a) => a.is_owner), [authors]);

  // ── split helpers ─────────────────────────────────────────────────────────

  const toggleAuthorInSplit = (authorId: number) => {
    const exists = assignments.find((a) => a.author_id === authorId);
    if (exists) {
      setAssignments(assignments.filter((a) => a.author_id !== authorId));
    } else {
      setAssignments([...assignments, { author_id: authorId, amount: 0 }]);
    }
  };

  const updateAssignmentAmount = (authId: number, val: string) => {
    const numbers = val.replace(/\D/g, '');
    const numValue = numbers === '' ? 0 : parseInt(numbers) / 100;
    setAssignments(assignments.map((a) => a.author_id === authId ? { ...a, amount: numValue } : a));
  };

  const distributeEqually = () => {
    if (assignments.length === 0) return;
    const total = parseFloat(fAmount);
    if (isNaN(total)) return;
    const splitValue = Number((total / assignments.length).toFixed(2));
    const totalDistributed = splitValue * (assignments.length - 1);
    const lastValue = Number((total - totalDistributed).toFixed(2));
    setAssignments(assignments.map((a, i) => ({ ...a, amount: i === assignments.length - 1 ? lastValue : splitValue })));
  };

  const getSplitTotal = () => assignments.reduce((acc, curr) => acc + curr.amount, 0);

  // ── form helpers ──────────────────────────────────────────────────────────

  function resetForm() {
    setFDescription('');
    setFAmount('');
    setFAmountDisplay('');
    setFCardId('');
    setFAuthorId(defaultAuthor ? String(defaultAuthor.id) : '');
    setFBillingDay('5');
    setFBillingCycle('monthly');
    setFNotes('');
    setFActive(true);
    setIsSplit(false);
    setAssignments([]);
    setFormError('');
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    if (defaultAuthor) setFAuthorId(String(defaultAuthor.id));
    setShowForm(true);
  }

  function openEdit(sub: Subscription) {
    setFDescription(sub.description);
    setFAmount(String(sub.amount));
    setFAmountDisplay(`R$ ${sub.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    // card_name comes from view; id is in card_id
    setFCardId(String(sub.card_id));
    setFAuthorId(String(sub.author_id));
    setFBillingDay(String(sub.billing_day));
    setFBillingCycle(sub.billing_cycle ?? 'monthly');
    setFNotes(sub.notes ?? '');
    setFActive(sub.active);
    setIsSplit(false);
    setAssignments([]);
    setFormError('');
    setEditingId(sub.id);
    setShowForm(true);
  }

  function handleAmountChange(raw: string) {
    const { numeric, display } = parseAmountInput(raw);
    setFAmount(String(numeric));
    setFAmountDisplay(display);
  }

  // ── submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!user) return;

    const amountVal = parseFloat(fAmount);
    if (!fDescription.trim()) return setFormError('Digite uma descrição');
    if (isNaN(amountVal) || amountVal <= 0) return setFormError('Digite um valor válido');
    if (!fCardId) return setFormError('Selecione o cartão');
    const billingDayVal = parseInt(fBillingDay);
    if (isNaN(billingDayVal) || billingDayVal < 1 || billingDayVal > 28) return setFormError('Dia de cobrança deve ser entre 1 e 28');

    // Validar split
    const assignmentsPayload = isSplit ? assignments : [];
    if (isSplit) {
      if (assignments.length === 0) return setFormError('Selecione pelo menos uma pessoa para dividir.');
      const splitTotal = getSplitTotal();
      if (Math.abs(splitTotal - amountVal) > 0.05) return setFormError(`A soma da divisão (R$ ${formatCurrency(splitTotal)}) não bate com o total (R$ ${formatCurrency(amountVal)})`);
    }

    // Author: quando não é split, pega o select; array vazio quando é split (o cron usa assignments)
    const authorIdVal = isSplit
      ? (assignments[0]?.author_id ?? defaultAuthor?.id)
      : (fAuthorId ? parseInt(fAuthorId) : defaultAuthor?.id);

    if (!authorIdVal) return setFormError('Selecione quem paga');

    setIsSubmitting(true);
    try {
      if (editingId !== null) {
        const body: UpdateSubscriptionDTO = {
          id: editingId,
          user_id: user.id,
          description: fDescription.trim(),
          amount: amountVal,
          card_id: parseInt(fCardId),
          author_id: authorIdVal,
          category_id: 7, // sempre Assinaturas
          billing_day: billingDayVal,
          billing_cycle: fBillingCycle,
          notes: fNotes.trim() || null,
          active: fActive,
          assignments: assignmentsPayload,
        };
        const res = await phpApiRequest('subscriptions.php', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res?.success) {
          setSubscriptions((prev) => prev.map((s) => s.id === editingId ? res.data : s));
        } else {
          setFormError(res?.message ?? 'Erro ao atualizar');
          return;
        }
      } else {
        const body: CreateSubscriptionDTO = {
          user_id: user.id,
          description: fDescription.trim(),
          amount: amountVal,
          card_id: parseInt(fCardId),
          author_id: authorIdVal,
          category_id: 7,
          billing_day: billingDayVal,
          billing_cycle: fBillingCycle,
          notes: fNotes.trim() || null,
          assignments: assignmentsPayload,
        };
        const res = await phpApiRequest('subscriptions.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res?.success) {
          setSubscriptions((prev) => [res.data, ...prev]);
        } else {
          setFormError(res?.message ?? 'Erro ao criar');
          return;
        }
      }
      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error(err);
      setFormError('Erro de rede. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(id: number) {
    if (!user) return;
    try {
      const res = await phpApiRequest('subscriptions.php', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, user_id: user.id }),
      });
      if (res?.success) {
        setSubscriptions((prev) => prev.filter((s) => s.id !== id));
        setDeletingId(null);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // ── pause ─────────────────────────────────────────────────────────────────

  async function handlePause(sub: Subscription) {
    if (!user) return;
    try {
      const res = await phpApiRequest('subscriptions.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sub.id, user_id: user.id, paused: !sub.paused }),
      });
      if (res?.success) {
        setSubscriptions((prev) => prev.map((s) => s.id === sub.id ? res.data : s));
      }
    } catch (err) {
      console.error(err);
    }
  }

  // ── computed lists ────────────────────────────────────────────────────────

  const filteredAll = useMemo(() => {
    return subscriptions
      .filter((s) => s.active)
      .filter((s) => filterAuthor === null || s.author_id === filterAuthor)
      .filter((s) => filterCycle === null || s.billing_cycle === filterCycle);
  }, [subscriptions, filterAuthor, filterCycle]);

  const activeList   = filteredAll.filter((s) => !s.paused);
  const pausedList   = filteredAll.filter((s) => s.paused);
  const inactiveList = subscriptions.filter((s) => !s.active);
  // Equivalente mensal: anual ÷ 12, semestral ÷ 6, mensal = valor bruto
  const monthlyTotal = activeList.reduce((acc, s) => acc + toMonthlyEquivalent(s.amount, s.billing_cycle), 0);

  // Autores únicos entre as assinaturas ativas (para filtro)
  const authorOptions = useMemo(() => {
    const ids = new Set(subscriptions.filter((s) => s.active).map((s) => s.author_id));
    return authors.filter((a) => ids.has(a.id));
  }, [subscriptions, authors]);

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/settings')}
              className="cursor-pointer p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assinaturas</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {globalError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-800 dark:text-red-400 text-sm">
            {globalError}
          </div>
        )}

        {/* Filter bar */}
        {!isLoading && subscriptions.some((s) => s.active) && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mr-1">Filtrar:</span>

            {/* Author filter */}
            {authorOptions.length > 1 && (
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setFilterAuthor(null)}
                  className={`cursor-pointer px-3 py-1 rounded-full text-xs font-medium transition ${
                    filterAuthor === null
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Todos
                </button>
                {authorOptions.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setFilterAuthor(filterAuthor === a.id ? null : a.id)}
                    className={`cursor-pointer px-3 py-1 rounded-full text-xs font-medium capitalize transition ${
                      filterAuthor === a.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {a.name}{a.is_owner ? ' (você)' : ''}
                  </button>
                ))}
              </div>
            )}

            {/* Cycle filter */}
            <div className="flex flex-wrap gap-1 ml-auto">
              {CYCLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterCycle(filterCycle === opt.value ? null : opt.value)}
                  className={`cursor-pointer px-3 py-1 rounded-full text-xs font-medium capitalize transition ${
                    filterCycle === opt.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {opt.shortLabel.replace('/', '')}
                </button>
              ))}
            </div>
          </div>
        )}
        {!isLoading && activeList.length > 0 && (
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-1">
              <Repeat className="w-5 h-5 opacity-80" />
              <span className="text-purple-200 text-sm font-medium">Equivalente mensal em assinaturas</span>
            </div>
            <p className="text-3xl font-bold">{formatAmount(monthlyTotal)}</p>
            <p className="text-purple-300 text-sm mt-1">{activeList.length} assinatura{activeList.length !== 1 ? 's' : ''} ativa{activeList.length !== 1 ? 's' : ''}</p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && activeList.length === 0 && pausedList.length === 0 && subscriptions.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Repeat className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nenhuma assinatura cadastrada</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Cadastre suas assinaturas recorrentes e elas serão adicionadas automaticamente nas faturas na data certa.
            </p>
            <button
              onClick={openCreate}
              className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium"
            >
              <Plus className="w-4 h-4" />
              Adicionar assinatura
            </button>
          </div>
        )}

        {!isLoading && activeList.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ativas</h2>
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Nova
              </button>
            </div>
            {activeList.map((sub) => (
              <SubscriptionCard
                key={sub.id}
                sub={sub}
                onEdit={() => openEdit(sub)}
                onDelete={() => setDeletingId(sub.id)}
                onPause={() => handlePause(sub)}
                isConfirmingDelete={deletingId === sub.id}
                onConfirmDelete={() => handleDelete(sub.id)}
                onCancelDelete={() => setDeletingId(null)}
              />
            ))}
          </div>
        )}

        {/* Paused subscriptions */}
        {!isLoading && pausedList.length > 0 && (
          <div>
            <button
              onClick={() => setShowPaused((v) => !v)}
              className="flex items-center gap-2 text-sm text-amber-500 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition mb-2"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showPaused ? 'rotate-180' : ''}`} />
              <Pause className="w-3.5 h-3.5" />
              {pausedList.length} pausada{pausedList.length !== 1 ? 's' : ''}
            </button>
            {showPaused && (
              <div className="space-y-3">
                {pausedList.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    sub={sub}
                    onEdit={() => openEdit(sub)}
                    onDelete={() => setDeletingId(sub.id)}
                    onPause={() => handlePause(sub)}
                    isConfirmingDelete={deletingId === sub.id}
                    onConfirmDelete={() => handleDelete(sub.id)}
                    onCancelDelete={() => setDeletingId(null)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!isLoading && inactiveList.length > 0 && (
          <div>
            <button
              onClick={() => setShowInactive((v) => !v)}
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showInactive ? 'rotate-180' : ''}`} />
              {inactiveList.length} assinatura{inactiveList.length !== 1 ? 's' : ''} inativa{inactiveList.length !== 1 ? 's' : ''}
            </button>
            {showInactive && (
              <div className="mt-3 space-y-3 opacity-60">
                {inactiveList.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    sub={sub}
                    onEdit={() => openEdit(sub)}
                    onDelete={() => setDeletingId(sub.id)}
                    onPause={() => {}}
                    isConfirmingDelete={deletingId === sub.id}
                    onConfirmDelete={() => handleDelete(sub.id)}
                    onCancelDelete={() => setDeletingId(null)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Modal de formulário ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingId !== null ? 'Editar assinatura' : 'Nova assinatura'}
              </h2>
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="cursor-pointer p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-400">
                  {formError}
                </div>
              )}

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nome da assinatura *
                </label>
                <input
                  type="text"
                  value={fDescription}
                  onChange={(e) => setFDescription(e.target.value)}
                  placeholder="Ex: Netflix, Spotify, iCloud..."
                  autoFocus
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-sm"
                  required
                />
              </div>

              {/* Valor + Dia */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Valor por cobrança *
                  </label>
                  <input
                    type="text"
                    value={fAmountDisplay}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="R$ 0,00"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Dia de cobrança *
                  </label>
                  <input
                    type="number"
                    value={fBillingDay}
                    onChange={(e) => setFBillingDay(e.target.value)}
                    min="1" max="31"
                    placeholder="Ex: 28"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-sm"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">Cai na fatura mais próxima deste dia</p>
                </div>
              </div>

              {/* Ciclo de cobrança */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ciclo de cobrança *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CYCLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFBillingCycle(opt.value)}
                      className={`cursor-pointer px-3 py-2.5 rounded-lg border text-xs font-medium transition text-center ${
                        fBillingCycle === opt.value
                          ? 'bg-purple-600 border-purple-600 text-white'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {fBillingCycle !== 'monthly' && parseFloat(fAmount) > 0 && (
                  <p className="text-xs text-purple-500 dark:text-purple-400 mt-1.5">
                    ≈ {formatAmount(toMonthlyEquivalent(parseFloat(fAmount), fBillingCycle))}/mês
                  </p>
                )}
              </div>

              {/* Cartão — usa card_id (field da view card_available_balance) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Cartão *
                </label>
                <select
                  value={fCardId}
                  onChange={(e) => setFCardId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-sm"
                  required
                >
                  <option value="">Selecione o cartão...</option>
                  {cards
                    .filter((c) => c.active || (c as any).active === 1)
                    .map((c) => {
                      // A view retorna card_id e card_name; fallback para id/name se vier diferente
                      const id   = (c as any).card_id ?? c.id;
                      const name = (c as any).card_name ?? (c as any).name;
                      return (
                        <option key={id} value={id}>{name}</option>
                      );
                    })}
                </select>
              </div>

              {/* Divisão de despesa (igual ao AddItemModal) */}
              <div className="border-t border-b border-gray-200 dark:border-gray-700 py-4">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="splitSub"
                    checked={isSplit}
                    onChange={(e) => { setIsSplit(e.target.checked); setAssignments([]); }}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="splitSub" className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                    Dividir entre pessoas
                  </label>
                </div>

                {!isSplit ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Quem paga *
                    </label>
                    <select
                      value={fAuthorId}
                      onChange={(e) => setFAuthorId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-sm"
                      required
                    >
                      <option value="">Selecione...</option>
                      {authors.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}{a.is_owner ? ' (Você)' : ''}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Autores e Valores</span>
                      <button
                        type="button"
                        onClick={distributeEqually}
                        className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 flex items-center gap-1"
                        title="Distribuir igualmente"
                      >
                        <Calculator className="w-3.5 h-3.5" /> Distribuir
                      </button>
                    </div>
                    {authors.map((author) => {
                      const isSelected = assignments.some((a) => a.author_id === author.id);
                      const assignment = assignments.find((a) => a.author_id === author.id);
                      return (
                        <div key={author.id} className="flex items-center gap-3">
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleAuthorInSplit(author.id)}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {author.name}{author.is_owner ? ' (Você)' : ''}
                            </span>
                          </div>
                          {isSelected && (
                            <input
                              type="text"
                              value={`R$ ${(assignment?.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                              onChange={(e) => updateAssignmentAmount(author.id, e.target.value)}
                              className="w-32 px-2 py-1 text-right text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:ring-purple-500 outline-none"
                            />
                          )}
                        </div>
                      );
                    })}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Dividido:</span>
                      <span className={`text-sm font-bold ${Math.abs(getSplitTotal() - parseFloat(fAmount || '0')) < 0.05 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        R$ {formatCurrency(getSplitTotal())}
                      </span>
                    </div>
                    {Math.abs(getSplitTotal() - parseFloat(fAmount || '0')) >= 0.05 && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> O total dividido deve ser igual ao valor mensal.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Observações <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={fNotes}
                  onChange={(e) => setFNotes(e.target.value)}
                  rows={2}
                  placeholder="Ex: conta familiar, plano premium..."
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-sm resize-none"
                />
              </div>

              {/* Toggle ativo/inativo (só na edição) */}
              {editingId !== null && (
                <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Assinatura ativa</span>
                  <button
                    type="button"
                    onClick={() => setFActive((v) => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${fActive ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${fActive ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="flex-1 cursor-pointer px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 cursor-pointer px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Salvando...' : editingId !== null ? 'Salvar' : 'Criar assinatura'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Subscription Card ────────────────────────────────────────────────────────

interface SubscriptionCardProps {
  sub: Subscription;
  onEdit: () => void;
  onDelete: () => void;
  onPause: () => void;
  isConfirmingDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

function SubscriptionCard({ sub, onEdit, onDelete, onPause, isConfirmingDelete, onConfirmDelete, onCancelDelete }: SubscriptionCardProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 transition-all ${
      !sub.active ? 'opacity-60' : sub.paused ? 'opacity-75 border border-amber-200 dark:border-amber-800' : ''
    }`}>
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 mt-0.5"
          style={{ backgroundColor: sub.category_color ? `${sub.category_color}20` : '#6366f120' }}
        >
          {sub.category_icon ?? '🔄'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate flex items-center gap-2">
                {sub.description}
                {sub.paused && (
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Pausada</span>
                )}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {sub.card_name} · {sub.author_name}{sub.billing_day ? ` · Dia ${sub.billing_day}` : ''}
                {sub.billing_cycle && sub.billing_cycle !== 'monthly' && (
                  <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 font-medium">
                    {sub.billing_cycle === 'annual' ? 'Anual' : 'Semestral'}
                  </span>
                )}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-gray-900 dark:text-white">{formatAmount(sub.amount)}</p>
              <p className="text-xs text-gray-400">{cycleShortLabel(sub.billing_cycle)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 gap-2">
            {sub.paused ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Pause className="w-3 h-3" /> Pausada
              </span>
            ) : (
              <RenewalBadge nextBillingDate={sub.next_billing_date} />
            )}
            <div className="flex items-center gap-1">
              {!isConfirmingDelete ? (
                <>
                  <button
                    onClick={onPause}
                    className={`cursor-pointer p-1.5 rounded-lg transition ${
                      sub.paused
                        ? 'text-amber-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                        : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                    }`}
                    title={sub.paused ? 'Retomar' : 'Pausar'}
                  >
                    {sub.paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                  <button onClick={onEdit} className="cursor-pointer p-1.5 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition" title="Editar">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={onDelete} className="cursor-pointer p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Excluir?</span>
                  <button onClick={onCancelDelete} className="px-3 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Não</button>
                  <button onClick={onConfirmDelete} className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition">Sim</button>
                </div>
              )}
            </div>
          </div>

          {sub.notes && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">{sub.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}
