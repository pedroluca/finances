import { create } from 'zustand';
import type {
  Card,
  Category,
  Author,
  InvoiceWithCard,
  InvoiceItemWithDetails,
  MonthlyTotal,
} from '../types/database';

interface AppState {
  // Data
  cards: Card[];
  categories: Category[];
  authors: Author[];
  invoices: InvoiceWithCard[];
  currentInvoice: InvoiceWithCard | null;
  currentInvoiceItems: InvoiceItemWithDetails[];
  monthlyTotals: MonthlyTotal[];
  selectedItems: number[];
  cardOrder: number[]; // card_ids na ordem definida pelo usuário

  // Computed
  orderedCards: () => Card[];

  // UI State
  isLoading: boolean;
  selectedMonth: number;
  selectedYear: number;
  selectedCardId: number | null;

  // Actions - Cards
  setCards: (cards: Card[]) => void;
  addCard: (card: Card) => void;
  updateCard: (cardId: number, card: Partial<Card>) => void;
  removeCard: (cardId: number) => void;
  setCardOrder: (order: number[]) => void;

  // Actions - Categories
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (categoryId: number, category: Partial<Category>) => void;
  removeCategory: (categoryId: number) => void;

  // Actions - Authors
  setAuthors: (authors: Author[]) => void;
  addAuthor: (author: Author) => void;
  updateAuthor: (authorId: number, author: Partial<Author>) => void;
  removeAuthor: (authorId: number) => void;

  // Actions - Invoices
  setInvoices: (invoices: InvoiceWithCard[]) => void;
  setCurrentInvoice: (invoice: InvoiceWithCard | null) => void;
  addInvoice: (invoice: InvoiceWithCard) => void;
  updateInvoice: (invoiceId: number, invoice: Partial<InvoiceWithCard>) => void;
  removeInvoice: (invoiceId: number) => void;

  // Actions - Invoice Items
  setCurrentInvoiceItems: (items: InvoiceItemWithDetails[]) => void;
  addInvoiceItem: (item: InvoiceItemWithDetails) => void;
  updateInvoiceItem: (itemId: number, item: Partial<InvoiceItemWithDetails>) => void;
  removeInvoiceItem: (itemId: number) => void;

  // Actions - Monthly Totals
  setMonthlyTotals: (totals: MonthlyTotal[]) => void;

  // Actions - Selected Items
  toggleItemSelection: (itemId: number) => void;
  selectAllItems: (itemIds: number[]) => void;
  clearSelection: () => void;
  isItemSelected: (itemId: number) => boolean;

  // Actions - UI
  setLoading: (loading: boolean) => void;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  setSelectedCardId: (cardId: number | null) => void;
  setCurrentMonth: () => void;

  // Actions - Reset
  resetStore: () => void;
}

const currentDate = new Date();

export const useAppStore = create<AppState>((set, get) => ({
  // Initial State
  cards: [],
  categories: [],
  authors: [],
  invoices: [],
  currentInvoice: null,
  currentInvoiceItems: [],
  monthlyTotals: [],
  selectedItems: [],
  cardOrder: [],
  isLoading: false,
  selectedMonth: currentDate.getMonth() + 1,
  selectedYear: currentDate.getFullYear(),
  selectedCardId: null,

  // Computed
  orderedCards: () => {
    const { cards, cardOrder } = get();
    if (cardOrder.length === 0) return cards;
    // CardWithBalance vem da view com `card_id`; Card simples usa `id`
    const getCardId = (c: Card) => (c as any).card_id ?? c.id;
    const indexed = new Map(cards.map((c) => [getCardId(c), c]));
    const sorted = cardOrder
      .map((id) => indexed.get(id))
      .filter((c): c is Card => c !== undefined);
    // Cartões sem entrada na ordem vão pro fim
    const inOrder = new Set(cardOrder);
    const rest = cards.filter((c) => !inOrder.has(getCardId(c)));
    return [...sorted, ...rest];
  },

  // Cards
  setCards: (cards) => set({ cards }),
  addCard: (card) => set((state) => ({ cards: [...state.cards, card] })),
  updateCard: (cardId, updates) =>
    set((state) => ({
      cards: state.cards.map((c) => (c.id === cardId ? { ...c, ...updates } : c)),
    })),
  removeCard: (cardId) =>
    set((state) => ({ cards: state.cards.filter((c) => c.id !== cardId) })),
  setCardOrder: (order) => set({ cardOrder: order }),

  // Categories
  setCategories: (categories) => set({ categories }),
  addCategory: (category) =>
    set((state) => ({ categories: [...state.categories, category] })),
  updateCategory: (categoryId, updates) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === categoryId ? { ...c, ...updates } : c
      ),
    })),
  removeCategory: (categoryId) =>
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== categoryId),
    })),

  // Authors
  setAuthors: (authors) => set({ authors }),
  addAuthor: (author) => set((state) => ({ authors: [...state.authors, author] })),
  updateAuthor: (authorId, updates) =>
    set((state) => ({
      authors: state.authors.map((a) =>
        a.id === authorId ? { ...a, ...updates } : a
      ),
    })),
  removeAuthor: (authorId) =>
    set((state) => ({ authors: state.authors.filter((a) => a.id !== authorId) })),

  // Invoices
  setInvoices: (invoices) => set({ invoices }),
  setCurrentInvoice: (invoice) => set({ currentInvoice: invoice }),
  addInvoice: (invoice) =>
    set((state) => ({ invoices: [...state.invoices, invoice] })),
  updateInvoice: (invoiceId, updates) =>
    set((state) => ({
      invoices: state.invoices.map((i) =>
        i.id === invoiceId ? { ...i, ...updates } : i
      ),
      currentInvoice:
        state.currentInvoice?.id === invoiceId
          ? { ...state.currentInvoice, ...updates }
          : state.currentInvoice,
    })),
  removeInvoice: (invoiceId) =>
    set((state) => ({
      invoices: state.invoices.filter((i) => i.id !== invoiceId),
      currentInvoice:
        state.currentInvoice?.id === invoiceId ? null : state.currentInvoice,
    })),

  // Invoice Items
  setCurrentInvoiceItems: (items) => set({ currentInvoiceItems: items }),
  addInvoiceItem: (item) =>
    set((state) => ({
      currentInvoiceItems: [...state.currentInvoiceItems, item],
    })),
  updateInvoiceItem: (itemId, updates) =>
    set((state) => ({
      currentInvoiceItems: state.currentInvoiceItems.map((i) =>
        i.id === itemId ? { ...i, ...updates } : i
      ),
    })),
  removeInvoiceItem: (itemId) =>
    set((state) => ({
      currentInvoiceItems: state.currentInvoiceItems.filter((i) => i.id !== itemId),
      selectedItems: state.selectedItems.filter((id) => id !== itemId),
    })),

  // Monthly Totals
  setMonthlyTotals: (totals) => set({ monthlyTotals: totals }),

  // Selected Items
  toggleItemSelection: (itemId) =>
    set((state) => ({
      selectedItems: state.selectedItems.includes(itemId)
        ? state.selectedItems.filter((id) => id !== itemId)
        : [...state.selectedItems, itemId],
    })),
  selectAllItems: (itemIds) => set({ selectedItems: itemIds }),
  clearSelection: () => set({ selectedItems: [] }),
  isItemSelected: (itemId) => get().selectedItems.includes(itemId),

  // UI
  setLoading: (loading) => set({ isLoading: loading }),
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setSelectedYear: (year) => set({ selectedYear: year }),
  setSelectedCardId: (cardId) => set({ selectedCardId: cardId }),
  setCurrentMonth: () => {
    const now = new Date();
    set({
      selectedMonth: now.getMonth() + 1,
      selectedYear: now.getFullYear(),
    });
  },

  // Reset
  resetStore: () =>
    set({
      cards: [],
      categories: [],
      authors: [],
      invoices: [],
      currentInvoice: null,
      currentInvoiceItems: [],
      monthlyTotals: [],
      selectedItems: [],
      cardOrder: [],
      selectedCardId: null,
    }),
}));
