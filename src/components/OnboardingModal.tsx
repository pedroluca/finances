import { useState } from 'react'
import { ChevronLeft, ChevronRight, CreditCard, PartyPopper, Sparkles, TrendingUp } from 'lucide-react'
import { ScrollIndicator } from './ui/scroll-indicator'
import { Dialog } from './ui/sheet'
import { Button } from './ui/button'

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
    <Dialog open>
      <div className="space-y-5">
        <div className="flex justify-end -mt-2 -mr-2">
          <Button label="Pular" variant="ghost" size="sm" onClick={onComplete} />
        </div>

        <div className="flex flex-col items-center gap-3 min-h-48 justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/12 text-primary flex items-center justify-center mb-1">
            <Icon size={30} />
          </div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <p className="text-sm leading-5 text-muted">{description}</p>
        </div>

        <div className="flex justify-center">
          <ScrollIndicator total={STEPS.length} current={step} visibleCount={STEPS.length} onSelect={setStep} />
        </div>

        <div className="flex gap-2">
          {step > 0 && <Button label="Voltar" icon={ChevronLeft} variant="secondary" onClick={() => setStep((s) => s - 1)} />}
          <Button
            label={isLastStep ? 'Começar' : 'Próximo'}
            icon={isLastStep ? undefined : ChevronRight}
            className="flex-1"
            onClick={() => (isLastStep ? onComplete() : setStep((s) => s + 1))}
          />
        </div>
      </div>
    </Dialog>
  )
}
