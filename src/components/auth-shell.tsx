import type { ReactNode } from 'react'
import { LogoMark } from './app-header'
import { Card } from './ui/card'

/** Moldura do login e do cadastro: card central com o logo, título e subtítulo */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background flex items-center justify-center px-4 py-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-md space-y-6">
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="mb-2">
              <LogoMark size={64} />
            </div>
            <h1 className="text-[26px] leading-8 font-bold text-foreground">{title}</h1>
            <p className="text-muted">{subtitle}</p>
          </div>
          {children}
        </Card>
        {footer}
      </div>
    </div>
  )
}
