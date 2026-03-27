import { useEffect, useState } from 'react'
import { X, Download, Smartphone } from 'lucide-react'

const APK_URL = 'https://pedroluca.dev.br/downloads/Finances.apk'
const DISMISSED_KEY = 'apk_banner_dismissed'

function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent)
}

function isAlreadyInWebView(): boolean {
  // Se já está rodando no WebView do app, não precisa mostrar o banner
  return typeof window.AndroidApp !== 'undefined'
}

export function AndroidInstallBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Só mostra se: for Android + não estiver no WebView + não tiver dispensado antes
    const dismissed = localStorage.getItem(DISMISSED_KEY)
    if (isAndroid() && !isAlreadyInWebView() && !dismissed) {
      // Pequeno delay para não aparecer instantaneamente ao logar
      const t = setTimeout(() => setVisible(true), 1200)
      return () => clearTimeout(t)
    }
  }, [])

  const dismiss = (permanent = false) => {
    if (permanent) localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={() => dismiss(false)}
      />

      {/* Modal */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
        <div className="bg-gray-900 border border-gray-700 rounded-t-2xl shadow-2xl p-6 mx-0">
          {/* Close button */}
          <button
            onClick={() => dismiss(false)}
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

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
              Tenha uma experiência otimizada com notificações push e acesso mais rápido direto na sua tela inicial.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <a
              href={APK_URL}
              onClick={() => dismiss(true)}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold rounded-xl transition-colors"
            >
              <Download className="w-5 h-5" />
              Baixar app
            </a>
            <button
              onClick={() => dismiss(true)}
              className="w-full py-3 text-sm text-gray-500 hover:text-gray-400 transition-colors"
            >
              Não mostrar novamente
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
