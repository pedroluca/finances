import { create } from 'zustand'

const HIDE_VALUES_KEY = 'hideValues'

interface PrefsState {
  /** Esconde os valores no Início, em Contas e em Cartões (vale para todas as telas) */
  hideValues: boolean
  toggleHideValues: () => void
  setHideValues: (hide: boolean) => void
}

const readHideValues = () => {
  try {
    return localStorage.getItem(HIDE_VALUES_KEY) === 'true'
  } catch {
    return false
  }
}

/** Preferências do aparelho (sobrevivem ao logout) */
export const usePrefsStore = create<PrefsState>()((set, get) => ({
  hideValues: readHideValues(),
  toggleHideValues: () => get().setHideValues(!get().hideValues),
  setHideValues: (hideValues) => {
    localStorage.setItem(HIDE_VALUES_KEY, String(hideValues))
    set({ hideValues })
  },
}))
