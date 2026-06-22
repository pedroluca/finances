interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  id?: string
  disabled?: boolean
}

export default function Switch({ checked, onChange, label, id, disabled }: SwitchProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      {label && (
        <span
          onClick={() => !disabled && onChange(!checked)}
          className="text-sm font-medium text-gray-700 dark:text-white select-none cursor-pointer"
        >
          {label}
        </span>
      )}
    </div>
  )
}
