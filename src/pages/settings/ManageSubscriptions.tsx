import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Pencil, Trash2, ChevronDown, Repeat, AlertCircle, Pause, Play, type LucideIcon } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useAppStore } from '../../store/app.store';
import { phpApiRequest } from '../../lib/api';
import type { Subscription, CreateSubscriptionDTO, UpdateSubscriptionDTO, BillingCycle, CardWithBalance } from '../../types/database';
import { textareaClass } from '../../lib/formStyles';
import { cn } from '../../lib/cn';
import { plural } from '../../lib/format';
import AuthorSplitSection, { type SplitAssignment } from '../../components/AuthorSplitSection';
import ConfirmModal from '../../components/ConfirmModal';
import { SectionTitle, StackContent, StackHeader } from '../../components/app-header';
import { SummaryCard } from '../../components/summary-card';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { IconButton } from '../../components/ui/icon-button';
import { Badge, Callout, Chip, Divider, EmptyState, LoadingState, SwitchField } from '../../components/ui/misc';
import { FieldLabel, SelectField, StepperField, TextField } from '../../components/ui/field';
import { Sheet } from '../../components/ui/sheet';

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

function StatusPill({ icon: Icon, label, className }: { icon: LucideIcon; label: string; className: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', className)}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}

function RenewalBadge({ nextBillingDate }: { nextBillingDate: string }) {
  const days = daysUntilRenewal(nextBillingDate);
  const renewal = new Date(nextBillingDate + 'T00:00:00');
  const isNextYear = renewal.getFullYear() !== new Date().getFullYear();
  const date = renewal.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', ...(isNextYear ? { year: 'numeric' } : {}) });

  if (days < 0) return <StatusPill icon={AlertCircle} label="Atrasada" className="bg-danger/12 text-danger" />;
  if (days === 0) return <StatusPill icon={RefreshCw} label="Hoje" className="bg-orange/12 text-orange" />;
  if (days <= 3) return <StatusPill icon={RefreshCw} label={`${date} (${days}d)`} className="bg-warning/12 text-warning" />;
  return <StatusPill icon={RefreshCw} label={date} className="bg-surface-2 text-muted" />;
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
  const [deletingSub, setDeletingSub]     = useState<Subscription | null>(null);
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
  const [assignments, setAssignments]   = useState<SplitAssignment[]>([]);

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

  const closeForm = () => { setShowForm(false); resetForm(); };

  const renderCard = (sub: Subscription, withPause = true) => (
    <SubscriptionCard
      key={sub.id}
      sub={sub}
      onEdit={() => openEdit(sub)}
      onDelete={() => setDeletingSub(sub)}
      onPause={withPause ? () => handlePause(sub) : undefined}
    />
  );

  const hasActive = subscriptions.some((s) => s.active);

  return (
    <div className="min-h-screen bg-background">
      <StackHeader title="Assinaturas" onBack={() => navigate('/settings')} />

      <StackContent className="space-y-4">
        {globalError && <Callout tone="danger" icon={AlertCircle}>{globalError}</Callout>}

        {/* Filtros */}
        {!isLoading && hasActive && (
          <div className="space-y-2">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.6px] text-subtle">Filtrar</h2>
            {authorOptions.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <Chip label="Todos" size="sm" selected={filterAuthor === null} onClick={() => setFilterAuthor(null)} />
                {authorOptions.map((a) => (
                  <Chip
                    key={a.id}
                    label={`${a.name}${a.is_owner ? ' (você)' : ''}`}
                    size="sm"
                    selected={filterAuthor === a.id}
                    onClick={() => setFilterAuthor(filterAuthor === a.id ? null : a.id)}
                  />
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {CYCLE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.shortLabel.replace('/', '')}
                  size="sm"
                  selected={filterCycle === opt.value}
                  onClick={() => setFilterCycle(filterCycle === opt.value ? null : opt.value)}
                />
              ))}
            </div>
          </div>
        )}

        {!isLoading && activeList.length > 0 && (
          <SummaryCard
            icon={Repeat}
            label="Equivalente mensal em assinaturas"
            value={formatAmount(monthlyTotal)}
            caption={`${activeList.length} ${plural(activeList.length, 'assinatura ativa', 'assinaturas ativas')}`}
          />
        )}

        {isLoading ? (
          <LoadingState />
        ) : subscriptions.length === 0 ? (
          <Card>
            <EmptyState
              icon={Repeat}
              title="Nenhuma assinatura cadastrada"
              description="Cadastre suas assinaturas recorrentes e elas serão adicionadas automaticamente nas faturas na data certa."
              actionLabel="Adicionar assinatura"
              actionIcon={Plus}
              onAction={openCreate}
            />
          </Card>
        ) : (
          <>
            <SectionTitle title="Ativas" action={<Button label="Nova" icon={Plus} size="sm" onClick={openCreate} />} />
            {activeList.length > 0 ? (
              <div className="space-y-3">{activeList.map((sub) => renderCard(sub))}</div>
            ) : (
              <p className="text-sm text-subtle px-1">
                Nenhuma assinatura ativa{filterAuthor !== null || filterCycle !== null ? ' com esses filtros' : ''}.
              </p>
            )}

            {/* Pausadas */}
            {pausedList.length > 0 && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowPaused((v) => !v)}
                  className="flex items-center gap-2 py-1 px-1 text-sm font-medium text-warning hover:opacity-80 transition-opacity"
                >
                  <ChevronDown className={cn('w-4 h-4 transition-transform', showPaused && 'rotate-180')} />
                  <Pause className="w-3.5 h-3.5" />
                  {pausedList.length} {plural(pausedList.length, 'pausada', 'pausadas')}
                </button>
                {showPaused && <div className="space-y-3">{pausedList.map((sub) => renderCard(sub))}</div>}
              </div>
            )}

            {/* Inativas */}
            {inactiveList.length > 0 && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowInactive((v) => !v)}
                  className="flex items-center gap-2 py-1 px-1 text-sm text-muted hover:text-foreground transition-colors"
                >
                  <ChevronDown className={cn('w-4 h-4 transition-transform', showInactive && 'rotate-180')} />
                  {inactiveList.length} {plural(inactiveList.length, 'assinatura inativa', 'assinaturas inativas')}
                </button>
                {showInactive && <div className="space-y-3">{inactiveList.map((sub) => renderCard(sub, false))}</div>}
              </div>
            )}
          </>
        )}
      </StackContent>

      {/* ── Formulário: folha no celular, diálogo no desktop ── */}
      <Sheet open={showForm} onClose={closeForm} title={editingId !== null ? 'Editar assinatura' : 'Nova assinatura'}>
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
          <TextField
            label="Nome da assinatura *"
            value={fDescription}
            onChange={(e) => setFDescription(e.target.value)}
            placeholder="Ex: Netflix, Spotify, iCloud..."
            autoFocus={editingId === null}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField
              label="Valor por cobrança *"
              inputMode="numeric"
              value={fAmountDisplay}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="R$ 0,00"
              required
            />
            <StepperField
              label="Dia de cobrança *"
              value={Number(fBillingDay) || 1}
              onChange={(value) => setFBillingDay(String(value))}
              min={1}
              max={28}
              hint="Cai na fatura mais próxima deste dia"
            />
          </div>

          <div>
            <FieldLabel label="Ciclo de cobrança *" />
            <div className="flex flex-wrap gap-2">
              {CYCLE_OPTIONS.map((opt) => (
                <Chip key={opt.value} label={opt.label} selected={fBillingCycle === opt.value} onClick={() => setFBillingCycle(opt.value)} />
              ))}
            </div>
            {fBillingCycle !== 'monthly' && parseFloat(fAmount) > 0 && (
              <p className="text-xs text-primary mt-1.5">
                ≈ {formatAmount(toMonthlyEquivalent(parseFloat(fAmount), fBillingCycle))}/mês
              </p>
            )}
          </div>

          {/* Cartão — usa card_id (field da view card_available_balance) */}
          <SelectField label="Cartão *" id="sub-card" value={fCardId} onChange={setFCardId} required>
            <option value="">Selecione o cartão...</option>
            {cards
              .filter((c) => c.active || Number((c as CardWithBalance).active) === 1)
              .map((c) => {
                // A view retorna card_id e card_name; fallback para id/name se vier diferente
                const card = c as CardWithBalance;
                const id = card.card_id ?? card.id;
                const name = card.card_name ?? card.name;
                return <option key={id} value={id}>{name}</option>;
              })}
          </SelectField>

          <Divider />

          <AuthorSplitSection
            authors={authors}
            defaultAuthorId={defaultAuthor?.id}
            totalAmount={parseFloat(fAmount || '0')}
            authorId={fAuthorId}
            onAuthorIdChange={setFAuthorId}
            isSplit={isSplit}
            onIsSplitChange={(v) => { setIsSplit(v); setAssignments([]); }}
            assignments={assignments}
            onAssignmentsChange={setAssignments}
          />

          <Divider />

          <div>
            <FieldLabel label="Observações (opcional)" htmlFor="sub-notes" />
            <textarea
              id="sub-notes"
              value={fNotes}
              onChange={(e) => setFNotes(e.target.value)}
              rows={2}
              placeholder="Ex: conta familiar, plano premium..."
              className={textareaClass}
            />
          </div>

          {editingId !== null && (
            <>
              <Divider />
              <SwitchField title="Assinatura ativa" checked={fActive} onChange={setFActive} />
            </>
          )}

          {formError && <Callout tone="danger" icon={AlertCircle}>{formError}</Callout>}

          <div className="flex gap-3 pt-1">
            <Button label="Cancelar" variant="secondary" onClick={closeForm} className="flex-1" />
            <Button
              type="submit"
              label={isSubmitting ? 'Salvando...' : editingId !== null ? 'Salvar' : 'Criar assinatura'}
              loading={isSubmitting}
              className="flex-1"
            />
          </div>
        </form>
      </Sheet>

      <ConfirmModal
        isOpen={!!deletingSub}
        onClose={() => setDeletingSub(null)}
        onConfirm={() => (deletingSub ? handleDelete(deletingSub.id) : undefined)}
        title="Excluir assinatura?"
        message={`Excluir "${deletingSub?.description ?? ''}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        icon={Trash2}
        isDestructive
      />
    </div>
  );
}

// ── Subscription Card ────────────────────────────────────────────────────────

interface SubscriptionCardProps {
  sub: Subscription;
  onEdit: () => void;
  onDelete: () => void;
  /** Ausente nas inativas (não dá para pausar) */
  onPause?: () => void;
}

function SubscriptionCard({ sub, onEdit, onDelete, onPause }: SubscriptionCardProps) {
  const tint = sub.category_color ?? '#6366f1';
  const details = [sub.card_name, sub.author_name, sub.billing_day ? `Dia ${sub.billing_day}` : null].filter(Boolean).join(' · ');

  return (
    <Card
      className={cn('p-4 space-y-3', !sub.active ? 'opacity-60' : sub.paused && 'opacity-85')}
      style={sub.active && sub.paused ? { borderColor: 'color-mix(in srgb, var(--color-warning) 40%, transparent)' } : undefined}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-lg" style={{ backgroundColor: `${tint}26`, color: tint }}>
          {sub.category_icon ?? <Repeat size={19} />}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground truncate">{sub.description}</h3>
            {sub.paused && <Badge label="Pausada" tone="warning" />}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs text-muted">{details}</p>
            {sub.billing_cycle && sub.billing_cycle !== 'monthly' && (
              <Badge label={sub.billing_cycle === 'annual' ? 'Anual' : 'Semestral'} tone="primary" />
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="font-bold text-foreground">{formatAmount(sub.amount)}</p>
          <p className="text-xs text-subtle">{cycleShortLabel(sub.billing_cycle)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        {sub.paused ? (
          <StatusPill icon={Pause} label="Pausada" className="bg-warning/12 text-warning" />
        ) : (
          <RenewalBadge nextBillingDate={sub.next_billing_date} />
        )}
        <div className="flex items-center">
          {onPause && (
            <IconButton
              icon={sub.paused ? Play : Pause}
              label={sub.paused ? 'Retomar' : 'Pausar'}
              size={36}
              iconSize={17}
              tone={sub.paused ? 'success' : 'muted'}
              onClick={onPause}
            />
          )}
          <IconButton icon={Pencil} label="Editar" size={36} iconSize={17} tone="muted" onClick={onEdit} />
          <IconButton icon={Trash2} label="Excluir" size={36} iconSize={17} tone="muted" onClick={onDelete} />
        </div>
      </div>

      {sub.notes && <p className="text-xs text-subtle italic">{sub.notes}</p>}
    </Card>
  );
}
