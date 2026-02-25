import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, GripVertical, Save } from 'lucide-react'
import { useAppStore } from '../../store/app.store'
import { useAuthStore } from '../../store/auth.store'
import { phpApiRequest } from '../../lib/api'
import { useToast } from '../../components/Toast'
import type { CardWithBalance } from '../../types/database'

export default function ManageCardOrder() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { orderedCards, setCardOrder, cardOrder } = useAppStore()

  const { showToast } = useToast()

  const [localOrder, setLocalOrder] = useState<CardWithBalance[]>(() => orderedCards() as CardWithBalance[])
  const [isSaving, setIsSaving] = useState(false)

  // Re-sync quando o store atualizar a ordem (ex: primeira carga do dashboard)
  useEffect(() => {
    setLocalOrder(orderedCards() as CardWithBalance[])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardOrder])

  // Drag state
  const dragIndex = useRef<number | null>(null)

  const handleDragStart = (index: number) => {
    dragIndex.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex.current === null || dragIndex.current === index) return

    const updated = [...localOrder]
    const [moved] = updated.splice(dragIndex.current, 1)
    updated.splice(index, 0, moved)
    dragIndex.current = index
    setLocalOrder(updated)
  }

  const handleDrop = () => {
    dragIndex.current = null
  }

  const handleSave = async () => {
    if (!user?.id) return
    setIsSaving(true)
    try {
      const order = localOrder.map((card, index) => ({
        card_id: card.card_id ?? card.id,
        position: index,
      }))

      await phpApiRequest('card_order.php', {
        method: 'POST',
        body: JSON.stringify({ user_id: user.id, order }),
      })

      // Atualiza o store global com a nova ordem
      setCardOrder(order.map((o) => o.card_id))

      showToast('Ordem salva com sucesso!', 'success')
    } catch (err) {
      console.error('Erro ao salvar ordem:', err)
      showToast('Erro ao salvar a ordem dos cartões.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Ordem dos Cartões
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Arraste os cartões para definir a ordem em que aparecem no dashboard.
        </p>

        {localOrder.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            Nenhum cartão encontrado.
          </div>
        ) : (
          <div className="space-y-3">
            {localOrder.map((card, index) => (
              <div
                key={card.card_id ?? card.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={handleDrop}
                className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 cursor-grab active:cursor-grabbing select-none transition-colors"
              >
                {/* Color stripe */}
                <div
                  className="w-1.5 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: card.color }}
                />

                {/* Card name */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {card.card_name}
                  </p>
                  {card.is_shared ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Compartilhado com {card.owner_name}
                    </p>
                  ) : ''}
                </div>

                {/* Position badge */}
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 w-5 text-center shrink-0">
                  {index + 1}
                </span>

                {/* Drag handle */}
                <GripVertical className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* Save button */}
        {localOrder.length > 0 && (
          <div className="mt-6">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-all cursor-pointer disabled:opacity-60 bg-purple-600 hover:bg-purple-700`}
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Salvando...' : 'Salvar ordem'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
