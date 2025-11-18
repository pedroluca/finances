import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Configurações
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sobre */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-colors">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Info className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Sobre o Finances
              </h3>
            </div>
            <div className="space-y-3 text-gray-600 dark:text-gray-400">
              <p>
                Sistema de gerenciamento de faturas de cartão de crédito.
              </p>
              <p className="text-sm">
                Versão 1.0.0
              </p>
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm">
                  <span className="font-medium text-gray-900 dark:text-white">Desenvolvido por:</span> Pedro Luca Prates
                </p>
                <p className="text-sm mt-2">
                  <span className="font-medium text-gray-900 dark:text-white">Funcionalidades:</span>
                </p>
                <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
                  <li>Gerenciamento de múltiplos cartões</li>
                  <li>Controle de faturas mensais</li>
                  <li>Parcelamento de compras</li>
                  <li>Categorização de gastos</li>
                  <li>Múltiplos usuários por cartão</li>
                  <li>Tema escuro</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
