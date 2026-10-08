import { create } from 'zustand'

interface QuickExpenseState {
  open: boolean
  /** Muda a cada abertura: a folha remonta e sempre começa limpa */
  key: number
  show: () => void
  hide: () => void
}

/** "Nova despesa": aberta pelo "+" da tab bar (celular) ou pelo botão da barra lateral (desktop) */
export const useQuickExpense = create<QuickExpenseState>()((set) => ({
  open: false,
  key: 0,
  show: () => set((state) => ({ open: true, key: state.key + 1 })),
  hide: () => set({ open: false }),
}))

/** Evento disparado depois de lançar uma despesa (a fatura aberta recarrega se for do mesmo cartão) */
export const EXPENSE_ADDED_EVENT = 'finances:expense-added'
