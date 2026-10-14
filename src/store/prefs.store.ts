import { create } from 'zustand'

const HIDE_VALUES_KEY = 'hideValues'
const LANGUAGE_KEY = 'language'
const LAST_QUICK_CARD_KEY = 'lastQuickCardId'

/** "system" segue o idioma do navegador */
export type LanguagePreference = 'pt-BR' | 'en' | 'system'
const LANGUAGES: LanguagePreference[] = ['pt-BR', 'en', 'system']

interface PrefsState {
  /** Esconde os valores no Início, em Contas e em Cartões (vale para todas as telas) */
  hideValues: boolean
  language: LanguagePreference
  /** Último cartão usado na "Nova despesa" (já vem selecionado na próxima) */
  lastQuickCardId: number | null
  toggleHideValues: () => void
  setHideValues: (hide: boolean) => void
  setLanguage: (language: LanguagePreference) => void
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
  language: LANGUAGES.find((language) => language === read(LANGUAGE_KEY)) ?? 'system',
  lastQuickCardId: Number(read(LAST_QUICK_CARD_KEY)) || null,
  toggleHideValues: () => get().setHideValues(!get().hideValues),
  setHideValues: (hideValues) => {
    localStorage.setItem(HIDE_VALUES_KEY, String(hideValues))
    set({ hideValues })
  },
  // O i18n escuta essa mudança e troca o idioma (src/i18n)
  setLanguage: (language) => {
    localStorage.setItem(LANGUAGE_KEY, language)
    set({ language })
  },
  setLastQuickCardId: (lastQuickCardId) => {
    localStorage.setItem(LAST_QUICK_CARD_KEY, String(lastQuickCardId))
    set({ lastQuickCardId })
  },
}))
