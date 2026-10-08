import { useEffect, useState } from 'react'
import { Download, Smartphone, Bell, Share } from 'lucide-react'
import { Sheet } from './ui/sheet'
import { Button } from './ui/button'

const WAITLIST_FORM_URL = 'https://forms.gle/ezFNgoAG5UxBVDs89'
const DISMISSED_KEY = 'install_banner_dismissed_v2'

declare global {
  interface Navigator {
    standalone?: boolean
  }
}

function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent)
}

function isIOS(): boolean {
  const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isIPadOS13Plus = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return isAppleMobile || isIPadOS13Plus
}

function isIOSStandalone(): boolean {
  return navigator.standalone === true
}

function isAlreadyInWebView(): boolean {
  // Se já está rodando no WebView do app, não precisa mostrar o banner
  return typeof window.AndroidApp !== 'undefined'
}

function detectPlatform(): 'android' | 'ios' | null {
  if (isAndroid() && !isAlreadyInWebView()) return 'android'
  if (isIOS() && !isIOSStandalone()) return 'ios'
  return null
}

export function InstallAppBanner() {
  const [visible, setVisible] = useState(false)
  const [showIosInstructions, setShowIosInstructions] = useState(false)
  const [platform] = useState(detectPlatform)

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY)
    if (platform && !dismissed) {
      // Pequeno delay para não aparecer instantaneamente ao logar
      const t = setTimeout(() => setVisible(true), 1200)
      return () => clearTimeout(t)
    }
  }, [platform])

  const dismiss = (permanent = false) => {
    if (permanent) localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  if (!platform) return null

  const icon = (Icon: typeof Share) => (
    <div className="flex justify-center mb-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/12 text-primary flex items-center justify-center">
        <Icon size={30} />
      </div>
    </div>
  )

  return (
    <Sheet open={visible} onClose={() => dismiss(false)}>
      <div className="pt-2 text-center">
        {platform === 'ios' && showIosInstructions ? (
          <>
            {icon(Share)}
            <h2 className="text-xl font-bold text-foreground mb-3">Como instalar</h2>
            <ol className="text-sm leading-relaxed text-muted text-left list-decimal list-inside space-y-1.5 mb-6">
              <li>Toque no ícone de compartilhar <Share className="w-4 h-4 inline align-text-bottom" /> na barra do Safari</li>
              <li>Selecione "Adicionar à Tela de Início"</li>
              <li>Toque em "Adicionar" no canto superior direito</li>
            </ol>
            <Button label="Entendi" size="lg" fullWidth onClick={() => dismiss(true)} />
          </>
        ) : (
          <>
            {icon(Smartphone)}
            <h2 className="text-xl font-bold text-foreground mb-2">Instale o app Finances!</h2>
            <p className="text-sm leading-relaxed text-muted mb-6">
              {platform === 'android'
                ? 'O app está chegando na Google Play! Entre na lista de espera para ser avisado(a) assim que for lançado.'
                : 'Adicione o Finances à tela de início para uma experiência mais rápida, com notificações push.'}
            </p>

            <div className="flex flex-col gap-2">
              {platform === 'android' ? (
                <a
                  href={WAITLIST_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => dismiss(true)}
                  className="flex items-center justify-center gap-2.5 w-full h-14 rounded-2xl bg-primary hover:bg-primary-strong text-on-primary text-[17px] font-semibold transition-colors"
                >
                  <Bell size={20} />
                  Entrar na lista de espera
                </a>
              ) : (
                <Button label="Instalar" icon={Download} size="lg" fullWidth onClick={() => setShowIosInstructions(true)} />
              )}
              <button type="button" onClick={() => dismiss(true)} className="w-full h-11 text-sm text-muted hover:text-foreground transition-colors">
                Não mostrar novamente
              </button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}
