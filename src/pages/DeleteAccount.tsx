import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Mail, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'

export default function DeleteAccount() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const supportEmail = 'pedrolucadev@outlook.com'
  const subject = encodeURIComponent('Solicitação de Exclusão de Conta - Finances')
  const body = encodeURIComponent(
    `Olá,\n\nGostaria de solicitar a exclusão completa da minha conta no aplicativo Finances.\n\nDados da conta:\n- Nome: ${user?.name ?? ''}\n- E-mail: ${user?.email ?? ''}\n\nEntendo que esta ação é irreversível e que todos os meus dados serão permanentemente removidos.\n\nAtenciosamente,\n${user?.name ?? ''}`
  )

  const mailtoLink = `mailto:${supportEmail}?subject=${subject}&body=${body}`

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="cursor-pointer p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 p-2 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Excluir Conta
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">

        {/* Aviso */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 flex gap-4">
          <AlertTriangle className="w-6 h-6 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="font-semibold text-red-800 dark:text-red-300">Ação irreversível</h2>
            <p className="text-sm text-red-700 dark:text-red-400">
              A exclusão da sua conta é permanente. Todos os seus dados — cartões, faturas, assinaturas e
              configurações — serão removidos definitivamente e não poderão ser recuperados.
            </p>
          </div>
        </div>

        {/* Card principal */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-colors p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Como solicitar a exclusão
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Para excluir sua conta, envie um e-mail para nossa equipe de suporte. Ao clicar no botão
              abaixo, seu aplicativo de e-mail será aberto com uma mensagem pré-preenchida.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="font-medium">Suporte:</span>
              <span>{supportEmail}</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 pl-6">
              Sua solicitação será processada em até <strong className="text-gray-700 dark:text-gray-200">30 dias úteis</strong>.
            </p>
          </div>

          <a
            href={mailtoLink}
            className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            <Mail className="w-5 h-5" />
            Enviar solicitação por e-mail
          </a>
        </div>

        {/* Aviso LGPD */}
        <p className="text-xs text-center text-gray-400 dark:text-gray-500 px-4">
          Em conformidade com a Lei Geral de Proteção de Dados (LGPD), você tem o direito de solicitar a exclusão
          dos seus dados pessoais a qualquer momento.
        </p>
      </main>
    </div>
  )
}
