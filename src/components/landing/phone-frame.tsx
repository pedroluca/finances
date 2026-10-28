import { useState } from 'react'
import { cn } from '../../lib/cn'
import { LogoMark } from '../app-header'

type PhoneFrameProps = {
  /** Print do app em public/landing/screens (1080×2340, a proporção da tela do iPhone) */
  src: string
  alt: string
  /** Largura e posição (relative, absolute...): o cn não resolve classes que brigam, então a moldura não fixa nenhuma */
  className?: string
  /** O print do topo da página carrega na hora; os outros, quando chegam perto da tela */
  priority?: boolean
}

/**
 * Moldura de iPhone só com CSS (aro de titânio, borda preta, Dynamic Island e botões), em porcentagens
 * para escalar com a largura. Enquanto o print não existe, mostra o espaço reservado com o nome da tela.
 */
export function PhoneFrame({ src, alt, className, priority = false }: PhoneFrameProps) {
  const [missing, setMissing] = useState(false)

  return (
    <div className={cn('select-none', className)}>
      <div className="relative">
        {/* Botões: ação e volume à esquerda, liga/desliga à direita */}
        <span aria-hidden className="absolute -left-[1.1%] top-[17%] h-[3.5%] w-[1.6%] rounded-l-sm bg-zinc-500" />
        <span aria-hidden className="absolute -left-[1.1%] top-[24%] h-[7%] w-[1.6%] rounded-l-sm bg-zinc-500" />
        <span aria-hidden className="absolute -left-[1.1%] top-[33%] h-[7%] w-[1.6%] rounded-l-sm bg-zinc-500" />
        <span aria-hidden className="absolute -right-[1.1%] top-[27%] h-[11%] w-[1.6%] rounded-r-sm bg-zinc-500" />

        <div className="relative rounded-[15%/7%] bg-gradient-to-br from-zinc-400 via-zinc-700 to-zinc-500 p-[1.1%] shadow-[0_40px_80px_-20px_rgba(15,10,60,0.55)]">
          <div className="rounded-[14%/6.5%] bg-black p-[3%]">
            <div className="relative aspect-[1080/2340] overflow-hidden rounded-[11.5%/5.3%] bg-surface">
              {missing ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-[#9710FA]/25 to-[#155DFC]/25 px-6 text-center">
                  <LogoMark size={44} />
                  <span className="text-xs font-medium text-muted">{alt}</span>
                </div>
              ) : (
                <img
                  src={src}
                  alt={alt}
                  loading={priority ? 'eager' : 'lazy'}
                  decoding="async"
                  draggable={false}
                  onError={() => setMissing(true)}
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
              )}
              {/* Dynamic Island, por cima da barra de status do print (o meio dela é vazio no Android) */}
              <span aria-hidden className="absolute left-1/2 top-[1.5%] h-[3.6%] w-[31%] -translate-x-1/2 rounded-full bg-black" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
