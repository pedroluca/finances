import { Mail, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import { StackHeader } from '../components/app-header'

export default function DeleteAccount() {
  const { user } = useAuthStore()

  const supportEmail = 'pedrolucadev@outlook.com'
  const subject = encodeURIComponent('Solicitação de Exclusão de Conta - Finances')
  const body = encodeURIComponent(
    `Olá,\n\nGostaria de solicitar a exclusão completa da minha conta no aplicativo Finances.\n\nDados da conta:\n- Nome: ${user?.name ?? ''}\n- E-mail: ${user?.email ?? ''}\n\nEntendo que esta ação é irreversível e que todos os meus dados serão permanentemente removidos.\n\nAtenciosamente,\n${user?.name ?? ''}`
  )

  const mailtoLink = `mailto:${supportEmail}?subject=${subject}&body=${body}`

  return (
    <div className="min-h-screen bg-background">
      <StackHeader title="Excluir Conta" />

      <main className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-12 space-y-4">

        {/* Aviso */}
        <div className="bg-danger/8 rounded-2xl p-5 flex gap-4 text-danger">
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="font-semibold">Ação irreversível</h2>
            <p className="text-sm leading-5">
              A exclusão da sua conta é permanente. Todos os seus dados — cartões, faturas, assinaturas e
              configurações — serão removidos definitivamente e não poderão ser recuperados.
            </p>
          </div>
        </div>

        {/* Card principal */}
        <div className="bg-surface rounded-2xl border border-border p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">
              Como solicitar a exclusão
            </h2>
            <p className="text-sm text-muted">
              Para excluir sua conta, envie um e-mail para nossa equipe de suporte. Ao clicar no botão
              abaixo, seu aplicativo de e-mail será aberto com uma mensagem pré-preenchida.
            </p>
          </div>

          <div className="bg-surface-2 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <Mail className="w-4 h-4 text-subtle" />
              <span className="font-medium">Suporte:</span>
              <span>{supportEmail}</span>
            </div>
            <p className="text-muted pl-6">
              Sua solicitação será processada em até <strong className="text-foreground">30 dias úteis</strong>.
            </p>
          </div>

          <a
            href={mailtoLink}
            className="flex items-center justify-center gap-2 w-full h-12 bg-red-600 hover:bg-red-700 active:opacity-80 text-white font-semibold px-5 rounded-xl transition-colors"
          >
            <Mail className="w-5 h-5" />
            Enviar solicitação por e-mail
          </a>
        </div>

        {/* Aviso LGPD */}
        <p className="text-xs text-center text-subtle px-4">
          Em conformidade com a Lei Geral de Proteção de Dados (LGPD), você tem o direito de solicitar a exclusão
          dos seus dados pessoais a qualquer momento.
        </p>
      </main>
    </div>
  )
}
