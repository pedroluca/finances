import { StackHeader } from '../components/app-header'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <StackHeader title="Política de Privacidade" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-12">
        <div className="bg-surface rounded-2xl border border-border p-6 md:p-8 space-y-6 text-muted leading-relaxed">

          <p className="text-sm text-subtle">
            Última atualização: abril de 2026
          </p>

          <p>
            Bem-vindo ao <strong className="text-foreground">Finances</strong>. Esta Política de Privacidade
            descreve como coletamos, usamos e protegemos suas informações quando você utiliza nosso aplicativo.
          </p>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">1. Informações que coletamos</h2>
            <p>
              Para fornecer nossos serviços, podemos coletar as seguintes informações:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Nome e endereço de e-mail fornecidos no cadastro;</li>
              <li>Dados financeiros inseridos por você (faturas, cartões, assinaturas e categorias);</li>
              <li>Informações de uso do aplicativo para fins de melhoria do serviço.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">2. Como usamos suas informações</h2>
            <p>Suas informações são utilizadas exclusivamente para:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Autenticar e manter sua conta ativa;</li>
              <li>Exibir e gerenciar seus dados financeiros dentro do app;</li>
              <li>Enviar comunicações relacionadas à sua conta quando necessário;</li>
              <li>Melhorar a experiência e as funcionalidades do aplicativo.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">3. Compartilhamento de informações</h2>
            <p>
              Não vendemos, alugamos nem compartilhamos suas informações pessoais com terceiros para fins
              comerciais. Seus dados são de uso exclusivo do Finances e nunca serão utilizados para publicidade
              de terceiros.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">4. Armazenamento e segurança</h2>
            <p>
              Seus dados são armazenados em servidores seguros. Adotamos medidas técnicas e organizacionais
              adequadas para proteger suas informações contra acesso não autorizado, alteração, divulgação ou
              destruição.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">5. Seus direitos</h2>
            <p>Você tem o direito de:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Acessar, corrigir ou excluir seus dados pessoais a qualquer momento;</li>
              <li>Solicitar a exclusão completa da sua conta e de todos os dados associados;</li>
              <li>Entrar em contato conosco para tirar dúvidas sobre o uso das suas informações.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">6. Retenção de dados</h2>
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa. Após a solicitação de exclusão de conta,
              todos os seus dados serão removidos permanentemente de nossos servidores em até 30 dias.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">7. Alterações nesta política</h2>
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Quando isso ocorrer, notificaremos
              você por meio do aplicativo ou por e-mail. O uso contínuo do Finances após as alterações implica
              na aceitação da nova política.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">8. Contato</h2>
            <p>
              Em caso de dúvidas sobre esta Política de Privacidade, entre em contato pelo e-mail:{' '}
              <a
                href="mailto:pedrolucadev@outlook.com"
                className="text-primary hover:underline"
              >
                pedrolucadev@outlook.com
              </a>
            </p>
          </section>

        </div>
      </main>
    </div>
  )
}
