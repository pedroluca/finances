import { useCallback, useEffect, useState } from 'react'
import { useNotificationsStore } from '../../store/notifications.store'
import type { AppNotification } from '../../types/database'

const unreadIds = (items: AppNotification[]) => items.filter((item) => !item.read).map((item) => item.id)

/**
 * Estado da lista aberta (página ou menu do sino). Abrir atualiza e zera o sino, mas os avisos
 * que chegaram sem ler seguem destacados enquanto a lista está aberta.
 */
export function useNotificationsInbox() {
  const items = useNotificationsStore((state) => state.items)
  const hasMore = useNotificationsStore((state) => state.hasMore)

  // Com cache, a lista abre direto e atualiza em silêncio
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(items.length ? 'ready' : 'loading')
  const [highlighted, setHighlighted] = useState(() => new Set(unreadIds(items)))
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(async () => {
    const { refresh, markAllRead } = useNotificationsStore.getState()
    try {
      await refresh()
      const fresh = unreadIds(useNotificationsStore.getState().items)
      setHighlighted((current) => new Set([...current, ...fresh]))
      setStatus('ready')
      markAllRead().catch(() => {})
    } catch {
      // Sem rede: fica com o cache, se houver
      setStatus((current) => (current === 'ready' ? current : 'error'))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const loadMore = async () => {
    setLoadingMore(true)
    await useNotificationsStore.getState().loadMore().catch(() => {})
    setLoadingMore(false)
  }

  return { items, hasMore, status, highlighted, load, loadMore, loadingMore }
}

/** Mantém o contador do sino em dia: ao entrar e sempre que a aba volta a ficar visível */
export function useNotificationsSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const refresh = () => {
      useNotificationsStore.getState().refresh().catch(() => {})
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    refresh()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [enabled])
}
