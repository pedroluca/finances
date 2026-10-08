import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/** Card de total no topo de Contas, Cartões e Assinaturas (degradê da primária com arcos) */
export function SummaryCard({ icon: Icon, label, value, caption }: { icon: LucideIcon; label: string; value: ReactNode; caption?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary to-primary-strong text-white">
      <svg className="absolute right-0 top-0 pointer-events-none" width="320" height="140" viewBox="0 0 320 140" aria-hidden>
        <circle cx="300" cy="-10" r="110" stroke="#fff" strokeOpacity={0.1} strokeWidth={1.2} fill="none" />
        <circle cx="300" cy="-10" r="80" stroke="#fff" strokeOpacity={0.08} strokeWidth={1.2} fill="none" />
      </svg>
      <div className="relative p-5 md:p-6 space-y-1">
        <div className="flex items-center gap-2 text-white/85">
          <Icon size={18} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <p className="text-3xl font-bold truncate">{value}</p>
        {caption && <p className="text-sm text-white/70">{caption}</p>}
      </div>
    </div>
  )
}
