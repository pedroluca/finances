import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { useAppStore } from '../store/app.store'
import type { CardWithBalance } from '../types/database'
import { phpApiRequest } from '../lib/api'
import { DashboardHeader } from '../components/dashboard/d-header'
import { DashboardCardsList } from '../components/dashboard/d-cards-list'

export default function Cards() {
  const navigate = useNavigate()
  const { user, logout, isAuthenticated } = useAuthStore()
  const { setCards, monthlyTotals, setMonthlyTotals, orderedCards, cards } = useAppStore()

  const [isLoading, setIsLoading] = useState(cards.length === 0)
  const [hideValues, setHideValues] = useState(localStorage.getItem('hideValues') === 'true')

  const activeCards = orderedCards() as CardWithBalance[]

  const toggleHideValues = () => {
    setHideValues((prev) => !prev)
    localStorage.setItem('hideValues', String(!hideValues))
  }

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login')
      return
    }

    const loadData = async () => {
      try {
        setIsLoading(true)
        const [cardsData, monthlyTotalsData] = await Promise.all([
          phpApiRequest('cards.php', { method: 'GET' }),
          phpApiRequest('invoices.php?action=monthlyTotals', { method: 'GET' }),
        ])
        setCards(cardsData)
        setMonthlyTotals(monthlyTotalsData)
      } catch (error) {
        console.error('Erro ao carregar cartões:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isAuthenticated, user, navigate, setCards, setMonthlyTotals])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors pb-16 lg:pb-0">
      <DashboardHeader
        userName={user?.name || ''}
        userEmail={user?.email || ''}
        onLogout={logout}
        hideValues={hideValues}
        onToggleHideValues={toggleHideValues}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardCardsList cards={activeCards} hideValues={hideValues} monthlyTotals={monthlyTotals} />
      </main>
    </div>
  )
}
