import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { useAppStore } from '../store/app.store'
import { phpApiRequest } from '../lib/api'
import type { CardWithBalance } from '../types/database'
import { ArrowLeft, CreditCard, DollarSign, Calendar, Palette, Check } from 'lucide-react'
import { labelClass, inputClass } from '../lib/formStyles'

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
]

export default function AddCard() {
  const navigate = useNavigate()
  const { cardId } = useParams<{ cardId?: string }>()
  const { user } = useAuthStore()
  const { addCard, cards } = useAppStore()
  const isEditMode = !!cardId

  const [name, setName] = useState('')
  const [cardLimit, setCardLimit] = useState('')
  const [closingDay, setClosingDay] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [color, setColor] = useState(CARD_COLORS[0].value)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCard, setIsLoadingCard] = useState(isEditMode)
  const [error, setError] = useState('')

  // Load existing card data when in edit mode
  useEffect(() => {
    if (!isEditMode || !cardId) return

    const loadCard = async () => {
      try {
        setIsLoadingCard(true)
        // Try to find card in store first
        const existingCard = (cards as CardWithBalance[]).find(
          (c) => (c.card_id ?? c.id) === Number(cardId)
        )

        if (existingCard) {
          setName(existingCard.card_name ?? existingCard.name ?? '')
          setCardLimit(String(existingCard.card_limit ?? 0))
          setClosingDay(String(existingCard.closing_day ?? ''))
          setDueDay(String(existingCard.due_day ?? ''))
          setColor(existingCard.color ?? CARD_COLORS[0].value)
        } else {
          // Fetch from API if not in store
          const cardsData: CardWithBalance[] = await phpApiRequest('cards.php', { method: 'GET' })
          if (Array.isArray(cardsData)) {
            const card = cardsData.find((c) => (c.card_id ?? c.id) === Number(cardId))
            if (card) {
              setName(card.card_name ?? card.name ?? '')
              setCardLimit(String(card.card_limit ?? 0))
              setClosingDay(String(card.closing_day ?? ''))
              setDueDay(String(card.due_day ?? ''))
              setColor(card.color ?? CARD_COLORS[0].value)
            } else {
              setError('Cartão não encontrado')
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar cartão:', err)
        setError('Erro ao carregar dados do cartão')
      } finally {
        setIsLoadingCard(false)
      }
    }

    loadCard()
  }, [isEditMode, cardId, cards])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!user) {
      setError('Usuário não autenticado')
      return
    }

    if (!name.trim()) {
      setError('Digite o nome do cartão')
      return
    }

    const limit = parseFloat(cardLimit)
    if (isNaN(limit) || limit <= 0) {
      setError('Digite um limite válido')
      return
    }

    const closing = parseInt(closingDay)
    if (isNaN(closing) || closing < 1 || closing > 31) {
      setError('Dia de fechamento deve ser entre 1 e 31')
      return
    }

    const due = parseInt(dueDay)
    if (isNaN(due) || due < 1 || due > 31) {
      setError('Dia de vencimento deve ser entre 1 e 31')
      return
    }

    try {
      setIsLoading(true)

      if (isEditMode && cardId) {
        // Update existing card
        const updatedCard = await phpApiRequest('cards.php', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            card_id: Number(cardId),
            name: name.trim(),
            card_limit: limit,
            closing_day: closing,
            due_day: due,
            color,
          })
        })

        if (updatedCard) {
          // Refresh all cards to ensure store is synced
          const cardsData = await phpApiRequest('cards.php', { method: 'GET' })
          if (Array.isArray(cardsData)) {
            useAppStore.getState().setCards(cardsData)
          }
          navigate(`/cards/${cardId}`)
        } else {
          setError('Erro ao atualizar cartão')
        }
      } else {
        // Create new card
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
        })

        if (newCard) {
          addCard(newCard)
          navigate('/dashboard')
        } else {
          setError('Erro ao criar cartão')
        }
      }
    } catch (err) {
      console.error(`Erro ao ${isEditMode ? 'atualizar' : 'criar'} cartão:`, err)
      setError(`Erro ao ${isEditMode ? 'atualizar' : 'criar'} cartão`)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingCard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando cartão...</p>
        </div>
      </div>
    )
  }

  const selectedColorName = CARD_COLORS.find((c) => c.value === color)?.name

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors pb-16 lg:pb-0">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(isEditMode ? `/cards/${cardId}` : '/dashboard')}
            className="p-2 cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditMode ? 'Editar Cartão' : 'Adicionar Cartão'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isEditMode ? 'Atualize as informações do seu cartão' : 'Cadastre um novo cartão de crédito'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 transition-colors">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome do Cartão */}
            <div>
              <label htmlFor="name" className={labelClass}>
                <CreditCard className="w-3.5 h-3.5" />
                Nome do Cartão
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Nubank, Itaú, C6..."
                className={inputClass('purple')}
                required
                autoFocus
              />
            </div>

            {/* Limite do Cartão */}
            <div>
              <label htmlFor="limit" className={labelClass}>
                <DollarSign className="w-3.5 h-3.5" />
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
                className={inputClass('purple')}
                required
              />
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="closing" className={labelClass}>
                  <Calendar className="w-3.5 h-3.5" />
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
                  className={inputClass('purple')}
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Dia 1 a 31</p>
              </div>

              <div>
                <label htmlFor="due" className={labelClass}>
                  <Calendar className="w-3.5 h-3.5" />
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
                  className={inputClass('purple')}
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Dia 1 a 31</p>
              </div>
            </div>

            {/* Cor do Cartão */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`${labelClass} mb-0`}>
                  <Palette className="w-3.5 h-3.5" />
                  Cor do Cartão
                </label>
                {selectedColorName && (
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{selectedColorName}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {CARD_COLORS.map((c) => {
                  const selected = color === c.value
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      title={c.name}
                      className={`relative cursor-pointer w-10 h-10 rounded-full transition-all flex items-center justify-center ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ${
                        selected ? 'ring-2 ring-purple-500 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}
                    >
                      {selected && <Check className="w-4 h-4 text-white drop-shadow" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Preview do Cartão */}
            <div>
              <label className={labelClass}>Preview</label>
              <div
                className="p-5 rounded-2xl shadow-lg text-white"
                style={{ backgroundColor: color }}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-xs opacity-80">Limite Total</p>
                    <p className="text-2xl font-bold">
                      R$ {parseFloat(cardLimit || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <CreditCard className="w-8 h-8 opacity-80" />
                </div>
                <div>
                  <p className="text-base font-semibold">{name || 'Nome do Cartão'}</p>
                  <p className="text-xs opacity-80 mt-1">
                    Fecha dia {closingDay || '__'} • Vence dia {dueDay || '__'}
                  </p>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(isEditMode ? `/cards/${cardId}` : '/dashboard')}
                className="flex-1 px-6 py-2.5 cursor-pointer border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 cursor-pointer px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                {isLoading ? 'Salvando...' : (isEditMode ? 'Salvar' : 'Adicionar')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
