import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, CreditCard, Plus } from 'lucide-react'
import { useAppStore } from '../store/app.store'
import { useAuthStore } from '../store/auth.store'
import { usePrefsStore } from '../store/prefs.store'
import { EXPENSE_ADDED_EVENT, useQuickExpense } from '../store/quick-expense.store'
import { phpApiRequest } from '../lib/api'
import { ensureInvoice, invoiceMonthFor } from '../lib/invoices'
import { CARD_RATIO, cardInk, withAlpha } from '../lib/colors'
import { money } from '../lib/format'
import { cn } from '../lib/cn'
import type { Author, CardWithBalance } from '../types/database'
import { CardSurface } from './cards/CreditCardTile'
import { AddItemForm } from './AddItemModal'
import { useToast } from './Toast'
import { Sheet } from './ui/sheet'
import { EmptyState } from './ui/misc'
import { FieldLabel } from './ui/field'

const cardIdOf = (card: CardWithBalance) => card.card_id ?? card.id

/** Recarrega cartões e totais (limite disponível e faturas) depois de lançar uma despesa */
async function reloadCards() {
  const [cards, monthlyTotals] = await Promise.all([
    phpApiRequest('cards.php', { method: 'GET' }),
    phpApiRequest('invoices.php?action=monthlyTotals', { method: 'GET' }),
  ])
  const store = useAppStore.getState()
  store.setCards(cards)
  store.setMonthlyTotals(monthlyTotals)
}

/** "Nova despesa" (o "+" da tab bar e o botão da barra lateral); fica montada uma vez no app */
export function QuickExpenseSheet() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { open, key, hide } = useQuickExpense()
  if (!isAuthenticated) return null
  // Remonta a cada abertura: sempre começa limpa e com o último cartão usado
  return <QuickExpense key={key} open={open} onClose={hide} />
}

/**
 * Escolhe o cartão (o último usado já vem marcado) e preenche os mesmos campos de "Adicionar
 * Item" da fatura. A fatura em que a compra cai é criada antes, se ainda não existir.
 */
function QuickExpense({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const hideValues = usePrefsStore((state) => state.hideValues)
  const lastCardId = usePrefsStore((state) => state.lastQuickCardId)
  const setLastQuickCardId = usePrefsStore((state) => state.setLastQuickCardId)
  const ordered = useAppStore((state) => state.orderedCards)() as CardWithBalance[]

  const [selectedId, setSelectedId] = useState<number | null>(lastCardId)
  const card = ordered.find((item) => cardIdOf(item) === selectedId) ?? ordered[0]

  // Cartão compartilhado: as pessoas são as da conta do dono (guardadas por dono)
  const [ownerAuthors, setOwnerAuthors] = useState<Record<number, Author[]>>({})
  const sharedOwnerId = card?.is_shared ? card.user_id : undefined
  useEffect(() => {
    if (!open || !sharedOwnerId || ownerAuthors[sharedOwnerId]) return
    phpApiRequest(`authors.php?user_id=${sharedOwnerId}`)
      .then((list: Author[]) => setOwnerAuthors((previous) => ({ ...previous, [sharedOwnerId]: list })))
      .catch(() => {})
  }, [open, sharedOwnerId, ownerAuthors])

  const handleSaved = () => {
    if (!card) return
    const cardId = cardIdOf(card)
    setLastQuickCardId(cardId)
    onClose()
    showToast(`Despesa adicionada no ${card.card_name}`, 'success')
    reloadCards().catch(() => {})
    window.dispatchEvent(new CustomEvent(EXPENSE_ADDED_EVENT, { detail: { cardId } }))
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nova despesa" size="lg">
      {!card ? (
        <EmptyState
          icon={CreditCard}
          title="Nenhum cartão cadastrado"
          description="Cadastre um cartão para lançar despesas nele."
          actionLabel="Adicionar cartão"
          actionIcon={Plus}
          onAction={() => {
            onClose()
            navigate('/cards/new')
          }}
          className="py-6"
        />
      ) : (
        <div className="space-y-4">
          <div>
            <FieldLabel label="Cartão" icon={CreditCard} />
            {/* No celular os cartões rolam de lado até a borda da folha; no desktop quebram em linhas */}
            <div
              role="radiogroup"
              aria-label="Cartão"
              className="-mx-5 px-5 flex gap-3 overflow-x-auto scrollbar-hide pt-1.5 pb-5 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-x-visible sm:pb-3"
            >
              {ordered.map((item) => (
                <MiniCard
                  key={cardIdOf(item)}
                  card={item}
                  selected={cardIdOf(item) === cardIdOf(card)}
                  hideValues={hideValues}
                  onSelect={() => setSelectedId(cardIdOf(item))}
                />
              ))}
            </div>
          </div>

          <AddItemForm
            card={card}
            linkedAuthorId={card.is_shared ? card.author_id_on_owner : undefined}
            cardOwnerAuthors={card.is_shared ? ownerAuthors[card.user_id] ?? [] : undefined}
            isAuthorLocked={!!card.is_shared}
            prepare={(purchaseDate) => {
              // A fatura em que a compra cai precisa existir com o fechamento certo (meses curtos)
              const target = invoiceMonthFor(card, purchaseDate)
              return ensureInvoice(card, target.month, target.year)
            }}
            onCancel={onClose}
            onSaved={handleSaved}
          />
        </div>
      )}
    </Sheet>
  )
}

function MiniCard({ card, selected, hideValues, onSelect }: { card: CardWithBalance; selected: boolean; hideValues: boolean; onSelect: () => void }) {
  const ink = cardInk(card.color)
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={card.card_name}
      onClick={onSelect}
      className={cn('relative shrink-0 rounded-[17px] p-[3px] border-2 transition-transform active:scale-95', selected ? 'border-primary' : 'border-transparent hover:border-border')}
    >
      <CardSurface color={card.color} radius={12} style={{ width: 128, aspectRatio: CARD_RATIO }}>
        <div className="h-full flex flex-col justify-between p-2.5 text-left" style={{ color: ink }}>
          <p className="text-[13px] font-bold truncate">{card.card_name}</p>
          {card.is_shared ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.6px] truncate" style={{ color: withAlpha(ink, 0.8) }}>
              Compartilhado
            </p>
          ) : (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.6px]" style={{ color: withAlpha(ink, 0.75) }}>Disponível</p>
              <p className="text-xs font-bold truncate">{money(Number(card.available_balance), hideValues)}</p>
            </div>
          )}
        </div>
      </CardSurface>
      {selected && (
        <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center border-2 border-surface">
          <Check size={13} strokeWidth={3} />
        </span>
      )}
    </button>
  )
}
