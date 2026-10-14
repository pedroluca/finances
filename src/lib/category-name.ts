import { i18n } from '../i18n'

// As categorias padrão vêm do banco com o nome em português (as criadas no cadastro antigo
// e a "Assinaturas"). Essas são traduzidas pelo nome; as do usuário aparecem como ele escreveu.
// A mesma lista existe no app (finances-app/src/lib/category-name.ts).
const DEFAULT_CATEGORY_KEYS = {
  'Alimentação': 'food',
  'Transporte': 'transport',
  'Saúde': 'health',
  'Educação': 'education',
  'Lazer': 'leisure',
  'Moradia': 'housing',
  'Streaming': 'streaming',
  'Assinaturas': 'subscriptions',
  'Compras': 'shopping',
  'Contas': 'bills',
  'Outros': 'other',
} as const

type DefaultCategoryName = keyof typeof DEFAULT_CATEGORY_KEYS

const isDefaultName = (name: string): name is DefaultCategoryName => name in DEFAULT_CATEGORY_KEYS

/** Nome da categoria para exibir: as padrão no idioma do app, as do usuário como vieram */
export function categoryName(name: string | null | undefined): string {
  if (!name) return ''
  return isDefaultName(name) ? i18n.t(`categoryNames.${DEFAULT_CATEGORY_KEYS[name]}`) : name
}
