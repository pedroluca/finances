import { useState, useEffect, useMemo, type FormEvent } from 'react'
import {
  Plus, Pencil, Trash2, X, ChevronDown, Receipt,
  AlertCircle, CheckCircle2, Circle, Repeat, CalendarClock,
} from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import { useAppStore } from '../store/app.store'
import { phpApiRequest } from '../lib/api'
import { DashboardHeader } from '../components/dashboard/d-header'
import type { Bill, BillCharge, CreateBillDTO, UpdateBillDTO } from '../types/database'

// ── helpers ──────────────────────────────────────────────────────────────────

function formatAmount(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function parseAmountInput(raw: string): { numeric: number; display: string } {
  const numbers = raw.replace(/\D/g, '')
  if (!numbers) return { numeric: 0, display: '' }
  const numeric = parseInt(numbers) / 100
  const display = `R$ ${numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return { numeric, display }
}

/** Cobrança mais relevante pra mostrar no card: a mais antiga ainda não paga, senão a mais recente */
function relevantCharge(charges: BillCharge[]): BillCharge | null {
  if (!charges || charges.length === 0) return null
  const unpaid = charges
    .filter((c) => !c.is_paid)
    .sort((a, b) => (a.reference_year - b.reference_year) || (a.reference_month - b.reference_month))
  if (unpaid.length > 0) return unpaid[0]
  return charges[0]
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr + 'T00:00:00')
  return Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// ── main component ────────────────────────────────────────────────────────────

export default function Billings() {
  const { user, logout } = useAuthStore()
  const { authors, setAuthors, categories, setCategories } = useAppStore()

  const [hideValues, setHideValues] = useState(localStorage.getItem('hideValues') === 'true')
  const [bills, setBills] = useState<Bill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [globalError, setGlobalError] = useState('')

  // ── form state ────────────────────────────────────────────────────────────
  const [fDescription, setFDescription] = useState('')
  const [fDueDay, setFDueDay] = useState('10')
  const [fCategoryId, setFCategoryId] = useState('')
  const [fAuthorId, setFAuthorId] = useState('')
  const [fIsRecurring, setFIsRecurring] = useState(true)
  const [fIsFixedAmount, setFIsFixedAmount] = useState(false)
  const [fDefaultAmount, setFDefaultAmount] = useState('')
  const [fDefaultAmountDisplay, setFDefaultAmountDisplay] = useState('')
  const [fInitialAmount, setFInitialAmount] = useState('')
  const [fInitialAmountDisplay, setFInitialAmountDisplay] = useState('')
  const [fNotes, setFNotes] = useState('')
  const [fActive, setFActive] = useState(true)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── load data ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchAll = async () => {
      if (!user) return
      setIsLoading(true)
      try {
        const [billsRes, authData, catData] = await Promise.all([
          phpApiRequest(`bills.php?user_id=${user.id}`, { method: 'GET' }),
          authors.length ? Promise.resolve(authors) : phpApiRequest('authors.php', { method: 'GET' }),
          categories.length ? Promise.resolve(categories) : phpApiRequest('categories.php', { method: 'GET' }),
        ])
        if (billsRes?.success) setBills(billsRes.data ?? [])
        if (!authors.length) setAuthors(authData)
        if (!categories.length) setCategories(catData)
      } catch (err) {
        console.error(err)
        setGlobalError('Erro ao carregar dados')
      } finally {
        setIsLoading(false)
      }
    }
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // ── form helpers ──────────────────────────────────────────────────────────

  function resetForm() {
    setFDescription('')
    setFDueDay('10')
    setFCategoryId('')
    setFAuthorId('')
    setFIsRecurring(true)
    setFIsFixedAmount(false)
    setFDefaultAmount('')
    setFDefaultAmountDisplay('')
    setFInitialAmount('')
    setFInitialAmountDisplay('')
    setFNotes('')
    setFActive(true)
    setFormError('')
    setEditingId(null)
  }

  function openCreate() {
    resetForm()
    setShowForm(true)
  }

  function openEdit(bill: Bill) {
    setFDescription(bill.description)
    setFDueDay(String(bill.due_day))
    setFCategoryId(bill.category_id ? String(bill.category_id) : '')
    setFAuthorId(bill.author_id ? String(bill.author_id) : '')
    setFIsRecurring(bill.is_recurring)
    setFIsFixedAmount(bill.is_fixed_amount)
    setFDefaultAmount(bill.default_amount != null ? String(bill.default_amount) : '')
    setFDefaultAmountDisplay(bill.default_amount != null ? `R$ ${bill.default_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '')
    setFInitialAmount('')
    setFInitialAmountDisplay('')
    setFNotes(bill.notes ?? '')
    setFActive(bill.active)
    setFormError('')
    setEditingId(bill.id)
    setShowForm(true)
  }

  function handleDefaultAmountChange(raw: string) {
    const { numeric, display } = parseAmountInput(raw)
    setFDefaultAmount(String(numeric))
    setFDefaultAmountDisplay(display)
  }

  function handleInitialAmountChange(raw: string) {
    const { numeric, display } = parseAmountInput(raw)
    setFInitialAmount(String(numeric))
    setFInitialAmountDisplay(display)
  }

  // ── submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!user) return

    if (!fDescription.trim()) return setFormError('Digite uma descrição')
    const dueDayVal = parseInt(fDueDay)
    if (isNaN(dueDayVal) || dueDayVal < 1 || dueDayVal > 31) return setFormError('Dia de vencimento deve ser entre 1 e 31')

    const defaultAmountVal = fIsFixedAmount ? parseFloat(fDefaultAmount) : null
    if (fIsFixedAmount && (isNaN(defaultAmountVal as number) || (defaultAmountVal as number) <= 0)) {
      return setFormError('Digite o valor fixo desta conta')
    }

    setIsSubmitting(true)
    try {
      if (editingId !== null) {
        const body: UpdateBillDTO = {
          id: editingId,
          user_id: user.id,
          description: fDescription.trim(),
          category_id: fCategoryId ? parseInt(fCategoryId) : null,
          author_id: fAuthorId ? parseInt(fAuthorId) : null,
          is_recurring: fIsRecurring,
          is_fixed_amount: fIsFixedAmount,
          default_amount: defaultAmountVal,
          due_day: dueDayVal,
          notes: fNotes.trim() || null,
          active: fActive,
        }
        const res = await phpApiRequest('bills.php', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res?.success) {
          setBills((prev) => prev.map((b) => b.id === editingId ? res.data : b))
        } else {
          setFormError(res?.message ?? 'Erro ao atualizar')
          return
        }
      } else {
        const body: CreateBillDTO = {
          user_id: user.id,
          description: fDescription.trim(),
          category_id: fCategoryId ? parseInt(fCategoryId) : null,
          author_id: fAuthorId ? parseInt(fAuthorId) : null,
          is_recurring: fIsRecurring,
          is_fixed_amount: fIsFixedAmount,
          default_amount: defaultAmountVal,
          due_day: dueDayVal,
          notes: fNotes.trim() || null,
          initial_amount: fInitialAmount ? parseFloat(fInitialAmount) : null,
        }
        const res = await phpApiRequest('bills.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res?.success) {
          setBills((prev) => [res.data, ...prev])
        } else {
          setFormError(res?.message ?? 'Erro ao criar')
          return
        }
      }
      setShowForm(false)
      resetForm()
    } catch (err) {
      console.error(err)
      setFormError('Erro de rede. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: number) {
    if (!user) return
    try {
      const res = await phpApiRequest('bills.php', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, user_id: user.id }),
      })
      if (res?.success) {
        setBills((prev) => prev.filter((b) => b.id !== id))
        setDeletingId(null)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // ── charge actions (marcar pago / definir valor) ─────────────────────────

  async function handleUpdateCharge(billId: number, chargeId: number, payload: Record<string, unknown>) {
    if (!user) return
    try {
      const res = await phpApiRequest('bills.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateCharge', charge_id: chargeId, user_id: user.id, ...payload }),
      })
      if (res?.success) {
        setBills((prev) => prev.map((b) => {
          if (b.id !== billId) return b
          return { ...b, charges: b.charges.map((c) => c.id === chargeId ? { ...c, ...res.data } : c) }
        }))
      }
    } catch (err) {
      console.error(err)
    }
  }

  // ── computed lists ────────────────────────────────────────────────────────

  const activeList = useMemo(() => bills.filter((b) => b.active), [bills])
  const inactiveList = useMemo(() => bills.filter((b) => !b.active), [bills])

  const monthlyTotal = useMemo(() => {
    return activeList.reduce((sum, b) => {
      const charge = relevantCharge(b.charges)
      return sum + (charge?.amount ?? 0)
    }, 0)
  }, [activeList])

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors pb-16 lg:pb-0">
      <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="cursor-pointer p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contas</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {globalError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-800 dark:text-red-400 text-sm">
            {globalError}
          </div>
        )}

        {!isLoading && activeList.length > 0 && (
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-1">
              <Receipt className="w-5 h-5 opacity-80" />
              <span className="text-purple-200 text-sm font-medium">Total em contas (cobrança atual)</span>
            </div>
            <p className="text-3xl font-bold">{formatAmount(monthlyTotal)}</p>
            <p className="text-purple-300 text-sm mt-1">{activeList.length} conta{activeList.length !== 1 ? 's' : ''} ativa{activeList.length !== 1 ? 's' : ''}</p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && bills.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nenhuma conta cadastrada</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Cadastre contas pagas fora do cartão (água, luz, internet, aluguel...) e acompanhe os vencimentos aqui.
            </p>
            <button
              onClick={openCreate}
              className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium"
            >
              <Plus className="w-4 h-4" />
              Adicionar conta
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
            {activeList.map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                onEdit={() => openEdit(bill)}
                onDelete={() => setDeletingId(bill.id)}
                isConfirmingDelete={deletingId === bill.id}
                onConfirmDelete={() => handleDelete(bill.id)}
                onCancelDelete={() => setDeletingId(null)}
                onUpdateCharge={(chargeId, payload) => handleUpdateCharge(bill.id, chargeId, payload)}
              />
            ))}
          </div>
        )}

        {!isLoading && inactiveList.length > 0 && (
          <div>
            <button
              onClick={() => setShowInactive((v) => !v)}
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showInactive ? 'rotate-180' : ''}`} />
              {inactiveList.length} conta{inactiveList.length !== 1 ? 's' : ''} inativa{inactiveList.length !== 1 ? 's' : ''}
            </button>
            {showInactive && (
              <div className="mt-3 space-y-3 opacity-60">
                {inactiveList.map((bill) => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    onEdit={() => openEdit(bill)}
                    onDelete={() => setDeletingId(bill.id)}
                    isConfirmingDelete={deletingId === bill.id}
                    onConfirmDelete={() => handleDelete(bill.id)}
                    onCancelDelete={() => setDeletingId(null)}
                    onUpdateCharge={(chargeId, payload) => handleUpdateCharge(bill.id, chargeId, payload)}
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
                {editingId !== null ? 'Editar conta' : 'Nova conta'}
              </h2>
              <button
                onClick={() => { setShowForm(false); resetForm() }}
                className="cursor-pointer p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {formError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-400">
                    {formError}
                  </div>
                )}

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Nome da conta *
                  </label>
                  <input
                    type="text"
                    value={fDescription}
                    onChange={(e) => setFDescription(e.target.value)}
                    placeholder="Ex: Internet, Energia, Aluguel..."
                    autoFocus
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-sm"
                    required
                  />
                </div>

                {/* Dia de vencimento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Dia de vencimento *
                  </label>
                  <input
                    type="number"
                    value={fDueDay}
                    onChange={(e) => setFDueDay(e.target.value)}
                    min="1" max="31"
                    placeholder="Ex: 10"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-sm"
                    required
                  />
                </div>

                {/* Recorrente */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Conta recorrente</span>
                    <p className="text-xs text-gray-400 mt-0.5">Repete todo mês automaticamente</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFIsRecurring((v) => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${fIsRecurring ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${fIsRecurring ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Valor fixo */}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Valor sempre igual</span>
                      <p className="text-xs text-gray-400 mt-0.5">Ex: internet. Desligue para contas que oscilam, como energia.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFIsFixedAmount((v) => !v)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${fIsFixedAmount ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${fIsFixedAmount ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {fIsFixedAmount ? (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Valor fixo *
                      </label>
                      <input
                        type="text"
                        value={fDefaultAmountDisplay}
                        onChange={(e) => handleDefaultAmountChange(e.target.value)}
                        placeholder="R$ 0,00"
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-sm"
                        required
                      />
                    </div>
                  ) : editingId === null && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Valor desta cobrança <span className="text-gray-400 font-normal">(opcional, se já souber)</span>
                      </label>
                      <input
                        type="text"
                        value={fInitialAmountDisplay}
                        onChange={(e) => handleInitialAmountChange(e.target.value)}
                        placeholder="R$ 0,00 — deixe em branco se ainda não sabe"
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Categoria <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <select
                    value={fCategoryId}
                    onChange={(e) => setFCategoryId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-sm"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Responsável */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Quem paga <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <select
                    value={fAuthorId}
                    onChange={(e) => setFAuthorId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-sm"
                  >
                    <option value="">Não definido</option>
                    {authors.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}{a.is_owner ? ' (Você)' : ''}</option>
                    ))}
                  </select>
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
                    placeholder="Ex: conta da casa, plano residencial..."
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-sm resize-none"
                  />
                </div>

                {/* Toggle ativo/inativo (só na edição) */}
                {editingId !== null && (
                  <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Conta ativa</span>
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
                    onClick={() => { setShowForm(false); resetForm() }}
                    className="flex-1 cursor-pointer px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 cursor-pointer px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Salvando...' : editingId !== null ? 'Salvar' : 'Criar conta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Bill Card ─────────────────────────────────────────────────────────────────

interface BillCardProps {
  bill: Bill
  onEdit: () => void
  onDelete: () => void
  isConfirmingDelete: boolean
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onUpdateCharge: (chargeId: number, payload: Record<string, unknown>) => void
}

function BillCard({ bill, onEdit, onDelete, isConfirmingDelete, onConfirmDelete, onCancelDelete, onUpdateCharge }: BillCardProps) {
  const charge = relevantCharge(bill.charges)
  const [editingAmount, setEditingAmount] = useState(false)
  const [amountDisplay, setAmountDisplay] = useState('')

  function startEditAmount() {
    setAmountDisplay('')
    setEditingAmount(true)
  }

  function confirmAmount() {
    if (!charge) return
    const { numeric } = parseAmountInput(amountDisplay)
    if (numeric <= 0) return
    onUpdateCharge(charge.id, { amount: numeric })
    setEditingAmount(false)
  }

  const days = charge ? daysUntil(charge.due_date) : null
  const isOverdue = days !== null && days < 0 && !charge?.is_paid
  const isDueToday = days === 0 && !charge?.is_paid
  const isDueSoon = days !== null && days > 0 && days <= 7 && !charge?.is_paid

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 transition-all ${!bill.active ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 mt-0.5"
          style={{ backgroundColor: bill.category_color ? `${bill.category_color}20` : '#6366f120' }}
        >
          {bill.category_icon ?? '🧾'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate flex items-center gap-2">
                {bill.description}
                {bill.is_recurring && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                    <Repeat className="w-3 h-3" /> Recorrente
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Vence dia {bill.due_day}
                {bill.author_name ? ` · ${bill.author_name}` : ''}
                {!bill.is_fixed_amount && bill.is_recurring && ' · Valor variável'}
              </p>
            </div>

            <div className="text-right shrink-0">
              {charge && charge.amount !== null ? (
                <p className="font-bold text-gray-900 dark:text-white">{formatAmount(charge.amount)}</p>
              ) : (
                <button
                  onClick={startEditAmount}
                  className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Definir valor
                </button>
              )}
            </div>
          </div>

          {editingAmount && (
            <div className="flex items-center gap-2 mt-3">
              <input
                type="text"
                autoFocus
                value={amountDisplay}
                onChange={(e) => setAmountDisplay(parseAmountInput(e.target.value).display)}
                placeholder="R$ 0,00"
                className="flex-1 px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button onClick={confirmAmount} className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition cursor-pointer">Salvar</button>
              <button onClick={() => setEditingAmount(false)} className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer">Cancelar</button>
            </div>
          )}

          <div className="flex items-center justify-between mt-3 gap-2">
            <div className="flex items-center gap-2">
              {charge ? (
                <button
                  onClick={() => onUpdateCharge(charge.id, { is_paid: !charge.is_paid })}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition ${
                    charge.is_paid
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : isOverdue
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : isDueToday
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : isDueSoon
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {charge.is_paid ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                  {charge.is_paid
                    ? 'Paga'
                    : isOverdue
                    ? 'Vencida'
                    : isDueToday
                    ? 'Vence hoje'
                    : days === 1
                    ? 'Vence amanhã'
                    : `Vence em ${days}d`}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  <CalendarClock className="w-3 h-3" /> Sem cobrança gerada
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {!isConfirmingDelete ? (
                <>
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

          {bill.notes && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">{bill.notes}</p>
          )}

          {!charge?.is_paid && charge?.amount === null && (
            <p className="text-xs text-amber-500 dark:text-amber-400 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Valor desta conta ainda não foi informado.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
