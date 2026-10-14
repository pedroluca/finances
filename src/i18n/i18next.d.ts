import 'i18next'
import type { ptBR } from './locales/pt-BR'

// Chaves do t() tipadas pelo dicionário em português (autocomplete e erro em chave que não existe)
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof ptBR }
  }
}
