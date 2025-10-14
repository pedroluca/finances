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
  created_at: Date;
}

export interface Author {
  id: number;
  user_id: number;
  name: string;
  is_owner: boolean;
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
}

export interface CardWithBalance extends Card {
  current_debt: number;
  available_balance: number;
}

export interface MonthlyTotal {
  reference_year: number;
  reference_month: number;
  total_cards: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  user_id: number;
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
