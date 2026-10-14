import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { phpApiRequest } from '../lib/api'
import type { AppNotification } from '../types/database'

const PAGE_SIZE = 30

type ListResponse = { success: boolean; data?: AppNotification[]; unread_count?: number; has_more?: boolean }
type ReadResponse = { success: boolean; unread_count?: number }

interface NotificationsState {
  /** Mais recentes primeiro */
  items: AppNotification[]
  unreadCount: number
  hasMore: boolean
  /** Recarrega a primeira página (e o contador do sino) */
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  markAllRead: () => Promise<void>
}

// O foco da aba e a abertura da lista podem pedir ao mesmo tempo: uma requisição só
let pendingRefresh: Promise<void> | null = null

/** Histórico de avisos do sino, com cache local para a lista abrir na hora */
export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      items: [],
      unreadCount: 0,
      hasMore: false,

      refresh: () => {
        if (!pendingRefresh) {
          pendingRefresh = (phpApiRequest(`notifications.php?limit=${PAGE_SIZE}`, { method: 'GET' }) as Promise<ListResponse>)
            .then((response) => {
              if (!response?.success) return
              set({ items: response.data ?? [], unreadCount: response.unread_count ?? 0, hasMore: !!response.has_more })
            })
            .finally(() => {
              pendingRefresh = null
            })
        }
        return pendingRefresh
      },

      loadMore: async () => {
        const { items, hasMore } = get()
        const last = items[items.length - 1]
        if (!last || !hasMore) return
        const response: ListResponse = await phpApiRequest(`notifications.php?limit=${PAGE_SIZE}&before_id=${last.id}`, { method: 'GET' })
        if (!response?.success) return
        set((state) => {
          const known = new Set(state.items.map((item) => item.id))
          return {
            items: [...state.items, ...(response.data ?? []).filter((item) => !known.has(item.id))],
            unreadCount: response.unread_count ?? state.unreadCount,
            hasMore: !!response.has_more,
          }
        })
      },

      markAllRead: async () => {
        const { items, unreadCount } = get()
        if (unreadCount === 0 && items.every((item) => item.read)) return
        // Otimista: o sino zera antes da API responder
        set((state) => ({ items: state.items.map((item) => (item.read ? item : { ...item, read: true })), unreadCount: 0 }))
        const response: ReadResponse = await phpApiRequest('notifications.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'read_all' }),
        })
        if (response?.success && typeof response.unread_count === 'number') set({ unreadCount: response.unread_count })
      },
    }),
    {
      name: 'notifications-storage',
      partialize: (state) => ({ items: state.items, unreadCount: state.unreadCount, hasMore: state.hasMore }),
    },
  ),
)
