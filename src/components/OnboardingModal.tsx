import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, CreditCard, PartyPopper, Sparkles, TrendingUp } from 'lucide-react'
import { ScrollIndicator } from './ui/scroll-indicator'
import { Dialog } from './ui/sheet'
import { Button } from './ui/button'

interface OnboardingModalProps {
  onComplete: () => void
}

const STEPS = [
  { key: 'welcome', icon: Sparkles },
  { key: 'cards', icon: CreditCard },
  { key: 'track', icon: TrendingUp },
  { key: 'ready', icon: PartyPopper },
] as const

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const isLastStep = step === STEPS.length - 1
  const { key, icon: Icon } = STEPS[step]

  return (
    <Dialog open>
      <div className="space-y-5">
        <div className="flex justify-end -mt-2 -mr-2">
          <Button label={t('common.skip')} variant="ghost" size="sm" onClick={onComplete} />
        </div>

        <div className="flex flex-col items-center gap-3 min-h-48 justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/12 text-primary flex items-center justify-center mb-1">
            <Icon size={30} />
          </div>
          <h2 className="text-xl font-bold text-foreground">{t(`onboarding.${key}.title`)}</h2>
          <p className="text-sm leading-5 text-muted">{t(`onboarding.${key}.description`)}</p>
        </div>

        <div className="flex justify-center">
          <ScrollIndicator total={STEPS.length} current={step} visibleCount={STEPS.length} onSelect={setStep} />
        </div>

        <div className="flex gap-2">
          {step > 0 && <Button label={t('common.back')} icon={ChevronLeft} variant="secondary" onClick={() => setStep((s) => s - 1)} />}
          <Button
            label={isLastStep ? t('onboarding.start') : t('common.next')}
            icon={isLastStep ? undefined : ChevronRight}
            className="flex-1"
            onClick={() => (isLastStep ? onComplete() : setStep((s) => s + 1))}
          />
        </div>
      </div>
    </Dialog>
  )
}
