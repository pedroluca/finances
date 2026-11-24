// Chaves Pix: bancos, tipos de chave, validação e formatação.
// Arquivo igual no web (finances/src/lib/pix.ts) e no app (finances-app/src/lib/pix.ts);
// a API (php-api/pix_keys.php) repete a mesma normalização.

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'

export const PIX_KEY_TYPES: PixKeyType[] = ['cpf', 'cnpj', 'email', 'phone', 'random']

export interface PixKey {
  id: number
  user_id: number
  /** Id do banco em BANKS, ou 'other' (aí vale bank_name) */
  bank: string
  bank_name: string | null
  key_type: PixKeyType
  /** Normalizado: é o que vai para a área de transferência */
  key_value: string
  label: string | null
  created_at: string
}

export type PixKeyInput = Pick<PixKey, 'bank' | 'bank_name' | 'key_type' | 'key_value' | 'label'>

export interface Bank {
  id: string
  name: string
  /** Cor da marca (fundo do selo) */
  color: string
  /** Cor do texto sobre a cor da marca */
  text: string
}

const W = '#ffffff'
const D = '#1a1a1a'

/** Bancos mais comuns; a ordem é a das opções no formulário */
export const BANKS: Bank[] = [
  { id: 'nubank', name: 'Nubank', color: '#820ad1', text: W },
  { id: 'itau', name: 'Itaú', color: '#ec7000', text: W },
  { id: 'bradesco', name: 'Bradesco', color: '#cc092f', text: W },
  { id: 'santander', name: 'Santander', color: '#ec0000', text: W },
  { id: 'bb', name: 'Banco do Brasil', color: '#fcf800', text: '#1b3f8b' },
  { id: 'caixa', name: 'Caixa', color: '#005ca9', text: W },
  { id: 'inter', name: 'Inter', color: '#ff7a00', text: W },
  { id: 'c6', name: 'C6 Bank', color: '#242424', text: W },
  { id: 'picpay', name: 'PicPay', color: '#11c76f', text: W },
  { id: 'mercadopago', name: 'Mercado Pago', color: '#00b1ea', text: W },
  { id: 'pagbank', name: 'PagBank', color: '#1bb99a', text: W },
  { id: 'neon', name: 'Neon', color: '#00d6ff', text: D },
  { id: 'next', name: 'Next', color: '#00ff5f', text: D },
  { id: 'btg', name: 'BTG Pactual', color: '#0d2240', text: W },
  { id: 'xp', name: 'XP', color: '#111111', text: '#fcd000' },
  { id: 'sicoob', name: 'Sicoob', color: '#003641', text: '#c9d200' },
  { id: 'sicredi', name: 'Sicredi', color: '#3fa110', text: W },
  { id: 'banrisul', name: 'Banrisul', color: '#0068b4', text: W },
  { id: 'pan', name: 'Banco Pan', color: '#00adef', text: W },
  { id: 'original', name: 'Original', color: '#00a651', text: W },
  { id: 'will', name: 'Will Bank', color: '#ffe000', text: D },
  { id: 'safra', name: 'Safra', color: '#0b2a5b', text: '#d3b574' },
  { id: 'iti', name: 'iti', color: '#ff2f8f', text: W },
  { id: 'pernambucanas', name: 'Pernambucanas', color: '#e30613', text: W },
]

export const OTHER_BANK = 'other'
const OTHER_COLOR = { color: '#64748b', text: W }

/** Banco de uma chave: os da lista, ou o nome digitado em "Outro" */
export function bankOf(key: Pick<PixKey, 'bank' | 'bank_name'>): Bank {
  const known = BANKS.find(bank => bank.id === key.bank)
  if (known) return known
  const name = key.bank_name?.trim() || '?'
  return { id: `${OTHER_BANK}:${name.toLowerCase()}`, name, ...OTHER_COLOR }
}

/** Iniciais para o selo do banco (ex: "Banco do Brasil" → "BB", "Nubank" → "NU") */
export function bankInitials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(word => word.length > 2 || /\d/.test(word))
  if (words[0] && /\d/.test(words[0])) return words[0].slice(0, 2).toUpperCase()
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  const word = words[0] || name
  return word.slice(0, 2).toUpperCase()
}

export interface PixGroup {
  bank: Bank
  keys: PixKey[]
}

/** Agrupa as chaves por banco, na ordem em que o banco apareceu pela primeira vez */
export function groupByBank(keys: PixKey[]): PixGroup[] {
  const groups = new Map<string, PixGroup>()
  for (const key of keys) {
    const bank = bankOf(key)
    const group = groups.get(bank.id)
    if (group) group.keys.push(key)
    else groups.set(bank.id, { bank, keys: [key] })
  }
  return [...groups.values()].sort((a, b) => a.bank.name.localeCompare(b.bank.name))
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Valor normalizado da chave, ou null se não for válida para o tipo */
export function normalizePixKey(type: PixKeyType, raw: string): string | null {
  const value = raw.trim()
  let digits = value.replace(/\D/g, '')
  switch (type) {
    case 'cpf':
      return digits.length === 11 ? digits : null
    case 'cnpj':
      return digits.length === 14 ? digits : null
    case 'phone':
      if (digits.length === 13 && digits.startsWith('55')) digits = digits.slice(2)
      return digits.length === 10 || digits.length === 11 ? `+55${digits}` : null
    case 'email':
      return EMAIL.test(value) && value.length <= 77 ? value.toLowerCase() : null
    case 'random':
      return UUID.test(value) ? value.toLowerCase() : null
  }
}

/** Adivinha o tipo pelo que foi digitado/colado (null se não der para saber) */
export function detectPixKeyType(raw: string): PixKeyType | null {
  const value = raw.trim()
  if (!value) return null
  if (value.includes('@')) return 'email'
  if (UUID.test(value)) return 'random'
  if (/[a-z]/i.test(value)) return null
  const digits = value.replace(/\D/g, '')
  if (value.startsWith('+') || digits.length === 13) return 'phone'
  if (digits.length === 14) return 'cnpj'
  if (digits.length === 11) {
    // 11 dígitos pode ser CPF ou celular: o 3º dígito 9 com DDD válido sugere celular
    if (!isValidCpf(digits) && /^[1-9][1-9]9/.test(digits)) return 'phone'
    return 'cpf'
  }
  if (digits.length === 10) return 'phone'
  return null
}

function isValidCpf(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false
  const check = (length: number) => {
    let sum = 0
    for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10])
}

/** Chave para mostrar na tela (o valor copiado continua o normalizado) */
export function formatPixKey(type: PixKeyType, value: string): string {
  switch (type) {
    case 'cpf':
      return value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
    case 'cnpj':
      return value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    case 'phone': {
      const local = value.replace(/^\+55/, '')
      return local.length === 11
        ? `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
        : `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
    }
    default:
      return value
  }
}

/** Texto copiado: celular vai sem o +55 (os apps dos bancos aceitam assim e alguns recusam o +) */
export function pixKeyClipboardValue(key: Pick<PixKey, 'key_type' | 'key_value'>): string {
  return key.key_type === 'phone' ? key.key_value.replace(/^\+55/, '') : key.key_value
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- linha crua da API
export function normalizePixKeyRow(row: any): PixKey {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    bank: String(row.bank),
    bank_name: row.bank_name ?? null,
    key_type: row.key_type,
    key_value: String(row.key_value),
    label: row.label ?? null,
    created_at: row.created_at ?? '',
  }
}
