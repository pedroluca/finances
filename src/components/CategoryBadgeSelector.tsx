import type { Category } from "../types/database"
import { Chip } from "./ui/misc"

interface CategoryBadgeSelectorProps {
  categories: Category[]
  value: string
  onChange: (value: string) => void
}

/** Categorias em pílulas numa linha que rola de lado (como no app) */
export default function CategoryBadgeSelector({ categories, value, onChange }: CategoryBadgeSelectorProps) {
  return (
    <div className="-mx-5 px-5 flex gap-2 overflow-x-auto custom-scrollbar sm:mx-0 sm:px-0 sm:flex-wrap sm:max-h-[84px] sm:overflow-x-hidden sm:overflow-y-auto">
      <Chip label="Sem categoria" size="sm" selected={value === ""} onClick={() => onChange("")} />
      {categories.map((cat) => (
        <Chip
          key={cat.id}
          label={cat.name}
          emoji={cat.icon}
          size="sm"
          selected={value === String(cat.id)}
          onClick={() => onChange(String(cat.id))}
        />
      ))}
    </div>
  )
}
