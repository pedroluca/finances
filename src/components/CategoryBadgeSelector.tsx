import type { Category } from "../types/database"

interface CategoryBadgeSelectorProps {
  categories: Category[]
  value: string
  onChange: (value: string) => void
}

export default function CategoryBadgeSelector({
  categories,
  value,
  onChange,
}: CategoryBadgeSelectorProps) {
  const pill = (active: boolean) =>
    `px-2.5 py-1 cursor-pointer rounded-full text-xs font-medium border transition-colors flex-shrink-0 flex items-center gap-1 ${
      active
        ? "bg-indigo-600 border-indigo-600 text-white"
        : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
    }`

  return (
    <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto custom-scrollbar pr-1">
      <button type="button" onClick={() => onChange("")} className={pill(value === "")}>
        Sem categoria
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onChange(String(cat.id))}
          className={pill(value === String(cat.id))}
        >
          <span>{cat.icon}</span> {cat.name}
        </button>
      ))}
    </div>
  )
}
