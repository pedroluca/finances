// Tipos do banco de dados

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface Card {
  id: number;
  user_id: number;
  name: string;
  card_limit: number;
  closing_day: number;
  due_day: number;
  color: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CardOwner {
  id: number;
  card_id: number;
  user_id: number;
  permission: 'view' | 'edit' | 'admin';
  created_at: Date;
}

export interface Invoice {
  id: number;
  card_id: number;
  reference_month: number;
  reference_year: number;
  closing_date: Date;
  due_date: Date;
  total_amount: number;
  paid_amount: number;
  status: 'open' | 'closed' | 'paid' | 'overdue';
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: number;
  user_id: number;
  name: string;
  color: string;
  icon: string;
  is_default: boolean;
  created_at: Date;
}

export interface Author {
  id: number;
  user_id: number;
  name: string;
  is_owner: boolean;
  linked_user_id?: number | null;
  linked_user_email?: string | null;
  created_at: Date;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  description: string;
  amount: number;
  category_id: number | null;
  author_id: number;
  is_paid: boolean;
  is_installment: boolean;
  installment_number: number | null;
  total_installments: number | null;
  installment_group_id: string | null;
  purchase_date: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  assignments?: {
    id: number;
    invoice_item_id: number;
    author_id: number;
    author_name: string;
    amount: number;
    is_paid: boolean;
  }[];
}

// Tipos com relacionamentos

export interface InvoiceWithCard extends Invoice {
  card_name: string;
  card_color: string;
  remaining_amount: number;
}

export interface InvoiceItemWithDetails extends InvoiceItem {
  reference_month: number;
  reference_year: number;
  card_id: number;
  card_name: string;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  author_name: string;
  assignments?: {
    id: number;
    invoice_item_id: number;
    author_id: number;
    author_name: string;
    amount: number;
    is_paid: boolean;
  }[];
}

export interface CardWithBalance extends Card {
  card_id: number; // id da view
  card_name: string; // nome da view
  current_debt: number;
  available_balance: number;
  color: string; // cor da view
  is_shared?: boolean;
  owner_name?: string;
  author_id_on_owner?: number;
}

export interface MonthlyTotal {
  card_id: number;
  reference_year: number;
  reference_month: number;
  name: string;
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  remaining_amount: number;
  user_id: number;
  /** Portão do usuário logado (próprio ou compartilhado) */
  user_unpaid_amount: number;
  /** true se este total é de um cartão compartilhado (não pertence ao usuário) */
  is_shared_portion: boolean;
}

// DTOs para criação
export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
}

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface CreateCardDTO {
  user_id: number;
  name: string;
  card_limit: number;
  closing_day: number;
  due_day: number;
  color?: string;
}

export interface UpdateCardDTO {
  name?: string;
  card_limit?: number;
  closing_day?: number;
  due_day?: number;
  color?: string;
  active?: boolean;
}

export interface CreateInvoiceDTO {
  card_id: number;
  reference_month: number;
  reference_year: number;
}

export interface CreateCategoryDTO {
  user_id: number;
  name: string;
  color?: string;
  icon?: string;
}

export interface CreateAuthorDTO {
  user_id: number;
  name: string;
  is_owner?: boolean;
}

export interface CreateInvoiceItemDTO {
  invoice_id: number;
  description: string;
  amount: number;
  category_id?: number | null;
  author_id: number;
  purchase_date?: Date | null;
  notes?: string | null;
}

export type CreateItemDTO = CreateInvoiceItemDTO;

export interface CreateInstallmentDTO {
  card_id: number;
  description: string;
  total_amount: number;
  total_installments: number;
  author_id: number;
  category_id?: number | null;
  purchase_date?: Date;
  start_month: number;
  start_year: number;
  current_installment?: number;
}

export type BillingCycle = 'monthly' | 'semiannual' | 'annual';

export interface Subscription {
  id: number;
  user_id: number;
  description: string;
  amount: number;
  card_id: number;
  card_name: string;
  card_color: string;
  author_id: number;
  author_name: string;
  category_id: number | null;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  billing_day: number;
  billing_cycle: BillingCycle;
  next_billing_date: string;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSubscriptionDTO {
  user_id: number;
  description: string;
  amount: number;
  card_id: number;
  author_id: number;
  category_id?: number | null;
  billing_day: number;
  billing_cycle?: BillingCycle;
  notes?: string | null;
  assignments?: { author_id: number; amount: number }[];
}

export interface UpdateSubscriptionDTO {
  id: number;
  user_id: number;
  description?: string;
  amount?: number;
  card_id?: number;
  author_id?: number;
  category_id?: number | null;
  billing_day?: number;
  billing_cycle?: BillingCycle;
  notes?: string | null;
  active?: boolean;
  assignments?: { author_id: number; amount: number }[];
}

