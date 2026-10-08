import { create } from 'zustand'

const HIDE_VALUES_KEY = 'hideValues'
const LAST_QUICK_CARD_KEY = 'lastQuickCardId'

interface PrefsState {
  /** Esconde os valores no Início, em Contas e em Cartões (vale para todas as telas) */
  hideValues: boolean
  /** Último cartão usado na "Nova despesa" (já vem selecionado na próxima) */
  lastQuickCardId: number | null
  toggleHideValues: () => void
  setHideValues: (hide: boolean) => void
  setLastQuickCardId: (cardId: number) => void
}

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Preferências do aparelho (sobrevivem ao logout) */
export const usePrefsStore = create<PrefsState>()((set, get) => ({
  hideValues: read(HIDE_VALUES_KEY) === 'true',
  lastQuickCardId: Number(read(LAST_QUICK_CARD_KEY)) || null,
  toggleHideValues: () => get().setHideValues(!get().hideValues),
  setHideValues: (hideValues) => {
    localStorage.setItem(HIDE_VALUES_KEY, String(hideValues))
    set({ hideValues })
  },
  setLastQuickCardId: (lastQuickCardId) => {
    localStorage.setItem(LAST_QUICK_CARD_KEY, String(lastQuickCardId))
    set({ lastQuickCardId })
  },
}))
