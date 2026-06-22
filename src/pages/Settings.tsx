import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Info, Users, Sun, Moon, GripVertical, Tag, Repeat, LogOut } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import { useAuthStore } from '../store/auth.store'
import SettingsCard from '../components/SettingsCard'
import { version } from '../../package.json'

export default function Settings() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors pb-16 lg:pb-0">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Perfil */}
        <SettingsCard
          icon={<span className="font-semibold text-lg text-blue-600 dark:text-blue-400">{user?.name?.charAt(0).toUpperCase()}</span>}
          iconBgClassName="bg-blue-100 dark:bg-blue-900/30"
          title={user?.name ?? ''}
          description={user?.email}
          truncateText
          largeCard
          action={{ type: 'button', icon: <LogOut className="w-5 h-5" />, onClick: logout, ariaLabel: 'Sair' }}
        />

        {/* Gerenciar Pessoas */}
        <SettingsCard
          icon={<Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
          iconBgClassName="bg-purple-100 dark:bg-purple-900/30"
          title="Gerenciar Pessoas"
          description="Adicione pessoas que compartilham gastos com você e vincule suas contas."
          action={{ type: 'link', to: '/settings/manage-authors' }}
        />

        {/* Ordem dos Cartões */}
        <SettingsCard
          icon={<GripVertical className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
          iconBgClassName="bg-blue-100 dark:bg-blue-900/30"
          title="Ordem dos Cartões"
          description="Defina a ordem em que os cartões aparecem."
          action={{ type: 'link', to: '/settings/card-order' }}
        />

        {/* Categorias */}
        <SettingsCard
          icon={<Tag className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
          iconBgClassName="bg-emerald-100 dark:bg-emerald-900/30"
          title="Categorias"
          description="Crie e gerencie suas categorias personalizadas."
          action={{ type: 'link', to: '/settings/categories' }}
        />

        {/* Assinaturas */}
        <SettingsCard
          icon={<Repeat className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
          iconBgClassName="bg-purple-100 dark:bg-purple-900/30"
          title="Assinaturas"
          description="Gerencie cobranças recorrentes mensais e renovações automáticas."
          action={{ type: 'link', to: '/settings/subscriptions' }}
        />

        {/* Aparência */}
        <SettingsCard
          icon={
            theme === 'dark'
              ? <Moon className="w-6 h-6 text-yellow-500 dark:text-yellow-400" />
              : <Sun className="w-6 h-6 text-yellow-500" />
          }
          iconBgClassName="bg-yellow-100 dark:bg-yellow-900/30"
          title="Aparência"
          description={theme === 'dark' ? 'Modo escuro ativado' : 'Modo claro ativado'}
          action={{ type: 'toggle', checked: theme === 'dark', onChange: toggleTheme, ariaLabel: 'Alternar tema' }}
        />

        {/* Sobre */}
        <SettingsCard
          icon={<Info className="w-6 h-6 text-gray-500 dark:text-gray-400" />}
          iconBgClassName="bg-gray-100 dark:bg-gray-700"
          title="Sobre o Finances"
          description="Sistema de gerenciamento de faturas de cartão de crédito."
          action={{ type: 'none' }}
          largeCard
          footer={
            <p className="text-sm text-gray-600 dark:text-gray-400">
              v{version} · Desenvolvido por{' '}
              <Link to="https://pedroluca.dev.br" target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline">
                Pedro Luca Prates
              </Link>
            </p>
          }
        />
      </main>
    </div>
  )
}
