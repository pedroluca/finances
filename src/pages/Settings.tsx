import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Info, Users, ChevronRight } from 'lucide-react'

export default function Settings() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="cursor-pointer p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Configurações
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        
        {/* Navigation Cards */}
        <Link
          to="/settings/manage-authors"
          className="block w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-colors p-4 md:p-6 hover:shadow-md cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Gerenciar Pessoas
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Adicione pessoas que compartilham gastos com você e vincule suas contas.
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>
        </Link>

        {/* Sobre */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-colors">
          <div className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <Info className="w-6 h-6 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Sobre o Finances
              </h3>
            </div>
            <div className="space-y-3 text-gray-600 dark:text-gray-400">
              <p>
                Sistema de gerenciamento de faturas de cartão de crédito.
              </p>
              <p className="text-sm">
                Versão 1.1.0
              </p>
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm">
                  <span className="font-medium text-gray-900 dark:text-white">Desenvolvido por:</span> <Link to='https://pedroluca.dev.br' target='_blank' rel='noopener noreferrer' className="text-purple-600 dark:text-purple-400 hover:underline">Pedro Luca Prates</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
