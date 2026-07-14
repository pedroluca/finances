import { useState } from 'react'
import { Sparkles, CreditCard, TrendingUp, PartyPopper } from 'lucide-react'
import { ScrollIndicator } from './ui/scroll-indicator'

interface OnboardingModalProps {
  onComplete: () => void
}

const STEPS = [
  {
    icon: Sparkles,
    title: 'Bem-vindo(a) ao Finances!',
    description: 'Seu novo jeito de organizar cartões, faturas e gastos em um só lugar.',
  },
  {
    icon: CreditCard,
    title: 'Cadastre seus cartões',
    description: 'Adicione seus cartões de crédito para acompanhar limites e faturas automaticamente.',
  },
  {
    icon: TrendingUp,
    title: 'Acompanhe seus gastos',
    description: 'Veja faturas, parcelas e gastos futuros organizados por mês, sem surpresas.',
  },
  {
    icon: PartyPopper,
    title: 'Tudo pronto!',
    description: 'Agora é só começar a usar. Você pode adicionar seu primeiro cartão quando quiser.',
  },
]

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0)
  const isLastStep = step === STEPS.length - 1
  const { icon: Icon, title, description } = STEPS[step]

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8 animate-scale-in">
        <div className="flex justify-end mb-2">
          <button
            onClick={onComplete}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
          >
            Pular
          </button>
        </div>

        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Icon className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{description}</p>
        </div>

        <div className="flex justify-center mb-6">
          <ScrollIndicator total={STEPS.length} current={step} visibleCount={STEPS.length} onSelect={setStep} />
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="cursor-pointer flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
            >
              Voltar
            </button>
          )}
          <button
            onClick={() => (isLastStep ? onComplete() : setStep((s) => s + 1))}
            className="cursor-pointer flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium"
          >
            {isLastStep ? 'Começar' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  )
}
