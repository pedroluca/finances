export type Accent = "indigo" | "purple" | "primary"

const ACCENT_RING: Record<Accent, string> = {
  indigo: "focus:ring-indigo-500",
  purple: "focus:ring-purple-500",
  primary: "focus:ring-primary-500",
}

const ACCENT_BG: Record<Accent, string> = {
  indigo: "bg-indigo-600",
  purple: "bg-purple-600",
  primary: "bg-primary-600",
}

const ACCENT_BORDER: Record<Accent, string> = {
  indigo: "border-indigo-600",
  purple: "border-purple-600",
  primary: "border-primary-600",
}

const ACCENT_TEXT: Record<Accent, string> = {
  indigo: "text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300",
  purple: "text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300",
  primary: "text-primary-600 hover:text-primary-800 dark:text-purple-400 dark:hover:text-purple-300",
}

/** Label compacto e consistente para todos os formulários do sistema */
export const labelClass =
  "flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"

/** Input compacto e consistente para todos os formulários do sistema */
export function inputClass(accent: Accent = "indigo") {
  return `w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-100 rounded-lg focus:ring-2 ${ACCENT_RING[accent]} focus:border-transparent placeholder:text-gray-400`
}

/** Badge/pill selecionável (categorias, autores, ciclos, etc.) */
export function pillClass(active: boolean, accent: Accent = "indigo") {
  return `px-2.5 py-1 cursor-pointer rounded-full text-xs font-medium border transition-colors flex-shrink-0 flex items-center gap-1 ${
    active
      ? `${ACCENT_BG[accent]} ${ACCENT_BORDER[accent]} text-white`
      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
  }`
}

export function accentText(accent: Accent = "indigo") {
  return ACCENT_TEXT[accent]
}

export function accentBg(accent: Accent = "indigo") {
  return ACCENT_BG[accent]
}
