import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function Settings() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-colors">
          {/* Tema */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                ) : (
                  <Sun className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Tema
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Escolha entre tema claro ou escuro
                  </p>
                </div>
              </div>
              
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                  theme === 'dark' ? 'bg-primary-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
                  }`}
                >
                  {theme === 'dark' ? (
                    <Moon className="w-4 h-4 text-primary-600 m-1" />
                  ) : (
                    <Sun className="w-4 h-4 text-gray-600 m-1" />
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Informações */}
          <div className="p-6">
            <div className="flex items-center gap-3">
              <Monitor className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Preferência do Sistema
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  O tema é salvo automaticamente e será aplicado em todas as páginas
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sobre */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Sobre o Finances
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sistema de gerenciamento de faturas de cartão de crédito.
            <br />
            Versão 1.0.0
          </p>
        </div>
      </main>
    </div>
  );
}
