import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, GripVertical, Save } from 'lucide-react'
import { useAppStore } from '../../store/app.store'
import { useAuthStore } from '../../store/auth.store'
import { phpApiRequest } from '../../lib/api'
import { useToast } from '../../components/Toast'
import type { CardWithBalance } from '../../types/database'
import { StackContent, StackHeader } from '../../components/app-header'
import { Button } from '../../components/ui/button'
import { EmptyState } from '../../components/ui/misc'

export default function ManageCardOrder() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { orderedCards, setCardOrder, cardOrder, setCards } = useAppStore()

  const { showToast } = useToast()

  const [localOrder, setLocalOrder] = useState<CardWithBalance[]>(() => orderedCards() as CardWithBalance[])
  const [isSaving, setIsSaving] = useState(false)

  // Re-sync quando o store atualizar a ordem (ex: primeira carga do dashboard)
  useEffect(() => {
    setLocalOrder(orderedCards() as CardWithBalance[])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardOrder])

  // Carrega cards e ordem se a store estiver vazia (acesso direto à página)
  useEffect(() => {
    if (orderedCards().length === 0 && user?.id) {
      Promise.all([
        phpApiRequest(`cards.php?user_id=${user.id}`, { method: 'GET' }),
        phpApiRequest(`card_order.php?user_id=${user.id}`, { method: 'GET' }),
      ]).then(([cardsData, orderData]) => {
        setCards(cardsData)
        if (Array.isArray(orderData) && orderData.length > 0) {
          setCardOrder(orderData.map((o: { card_id: number }) => o.card_id))
        }
      }).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    <div className="min-h-screen bg-background">
      <StackHeader title="Ordem dos Cartões" onBack={() => navigate('/settings')} />

      <StackContent className="space-y-5">
        <p className="text-sm text-muted px-1">
          Arraste os cartões para definir a ordem em que aparecem no dashboard.
        </p>

        {localOrder.length === 0 ? (
          <EmptyState icon={CreditCard} title="Nenhum cartão encontrado." tint="subtle" />
        ) : (
          <>
            <div className="space-y-3">
              {localOrder.map((card, index) => (
                <div
                  key={card.card_id ?? card.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={handleDrop}
                  className="h-[68px] flex items-center gap-4 bg-surface rounded-2xl border border-border px-4 cursor-grab active:cursor-grabbing select-none transition-colors hover:bg-surface-2"
                >
                  <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: card.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{card.card_name}</p>
                    {!!card.is_shared && (
                      <p className="text-xs text-subtle truncate">Compartilhado com {card.owner_name}</p>
                    )}
                  </div>
                  <span className="text-xs font-medium text-subtle w-5 text-center shrink-0">{index + 1}</span>
                  <GripVertical size={20} className="text-subtle shrink-0" />
                </div>
              ))}
            </div>

            <Button label={isSaving ? 'Salvando...' : 'Salvar ordem'} icon={Save} loading={isSaving} onClick={handleSave} />
          </>
        )}
      </StackContent>
    </div>
  )
}
