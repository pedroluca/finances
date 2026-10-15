import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { usePrefsStore, type LanguagePreference } from '../store/prefs.store'
import { en } from './locales/en'
import { ptBR } from './locales/pt-BR'

export type Language = 'pt-BR' | 'en'

/** Preferência → idioma. No automático: português se o navegador estiver em português, senão inglês */
export function resolveLanguage(preference: LanguagePreference): Language {
  if (preference !== 'system') return preference
  return navigator.language?.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
}

export const i18n = createInstance()

i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    en: { translation: en },
  },
  lng: resolveLanguage(usePrefsStore.getState().language),
  fallbackLng: 'pt-BR',
  // O React já escapa o texto
  interpolation: { escapeValue: false },
  // Os dicionários vêm no bundle: inicia na hora, antes do primeiro render
  initAsync: false,
})

// Leitores de tela e o tradutor do navegador usam o lang da página
document.documentElement.lang = i18n.language
i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
})

const applyPreference = () => i18n.changeLanguage(resolveLanguage(usePrefsStore.getState().language))

usePrefsStore.subscribe((state, previous) => {
  if (state.language !== previous.language) applyPreference()
})

// No automático, acompanha a troca de idioma do navegador
window.addEventListener('languagechange', () => {
  if (usePrefsStore.getState().language === 'system') applyPreference()
})

/** Idioma atual, para quem formata fora dos componentes (valores, datas) */
export function currentLanguage(): Language {
  return i18n.language === 'en' ? 'en' : 'pt-BR'
}
