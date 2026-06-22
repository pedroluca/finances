import { pillClass, type Accent } from "../lib/formStyles"
import type { Category } from "../types/database"

interface CategoryBadgeSelectorProps {
  categories: Category[]
  value: string
  onChange: (value: string) => void
  accent?: Accent
}

export default function CategoryBadgeSelector({
  categories,
  value,
  onChange,
  accent = "indigo",
}: CategoryBadgeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto custom-scrollbar pr-1">
      <button type="button" onClick={() => onChange("")} className={pillClass(value === "", accent)}>
        Sem categoria
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onChange(String(cat.id))}
          className={pillClass(value === String(cat.id), accent)}
        >
          <span>{cat.icon}</span> {cat.name}
        </button>
      ))}
    </div>
  )
}
