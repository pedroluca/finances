import { useEffect, useState } from 'react'
import { X, Download, Smartphone, Bell, Share } from 'lucide-react'

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

  if (!visible || !platform) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={() => dismiss(false)}
      />

      {/* Modal */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
        <div className="bg-gray-900 border border-gray-700 rounded-t-2xl shadow-2xl p-6 mx-0 relative">
          {/* Close button */}
          <button
            onClick={() => dismiss(false)}
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          {platform === 'ios' && showIosInstructions ? (
            <>
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Share className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Text */}
              <div className="text-center mb-6">
                <h2 className="text-white text-xl font-bold mb-2">
                  Como instalar
                </h2>
                <ol className="text-gray-400 text-sm leading-relaxed text-left list-decimal list-inside space-y-1.5">
                  <li>Toque no ícone de compartilhar <Share className="w-4 h-4 inline align-text-bottom" /> na barra do Safari</li>
                  <li>Selecione "Adicionar à Tela de Início"</li>
                  <li>Toque em "Adicionar" no canto superior direito</li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => dismiss(true)}
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold rounded-xl transition-colors"
                >
                  Entendi
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Smartphone className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Text */}
              <div className="text-center mb-6">
                <h2 className="text-white text-xl font-bold mb-2">
                  Instale o app Finances!
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {platform === 'android'
                    ? 'O app está chegando na Google Play! Entre na lista de espera para ser avisado(a) assim que for lançado.'
                    : 'Adicione o Finances à tela de início para uma experiência mais rápida, com notificações push.'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                {platform === 'android' ? (
                  <a
                    href={WAITLIST_FORM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => dismiss(true)}
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold rounded-xl transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    Entrar na lista de espera
                  </a>
                ) : (
                  <button
                    onClick={() => setShowIosInstructions(true)}
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold rounded-xl transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Instalar
                  </button>
                )}
                <button
                  onClick={() => dismiss(true)}
                  className="w-full py-3 text-sm text-gray-500 hover:text-gray-400 transition-colors"
                >
                  Não mostrar novamente
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
