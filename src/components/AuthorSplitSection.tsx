import { useMemo, type ReactNode } from "react"
import { User, Calculator, AlertCircle } from "lucide-react"
import Switch from "./Switch"
import type { Author } from "../types/database"

export interface SplitAssignment {
  author_id: number
  amount: number
}

interface AuthorSplitSectionProps {
  authors: Author[]
  defaultAuthorId?: number
  totalAmount: number
  authorId: string
  onAuthorIdChange: (id: string) => void
  isSplit: boolean
  onIsSplitChange: (v: boolean) => void
  assignments: SplitAssignment[]
  onAssignmentsChange: (assignments: SplitAssignment[]) => void
  isLocked?: boolean
  lockedAuthorName?: string
  /** Renderizado abaixo dos badges, apenas no modo de seleção única (ex: adicionar nova pessoa) */
  footer?: ReactNode
}

const formatCurrency = (val: number) =>
  val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function AuthorSplitSection({
  authors,
  defaultAuthorId,
  totalAmount,
  authorId,
  onAuthorIdChange,
  isSplit,
  onIsSplitChange,
  assignments,
  onAssignmentsChange,
  isLocked,
  lockedAuthorName,
  footer,
}: AuthorSplitSectionProps) {
  const orderedAuthors = useMemo(() => {
    if (!defaultAuthorId) return authors
    const def = authors.find((a) => a.id === defaultAuthorId)
    if (!def) return authors
    return [def, ...authors.filter((a) => a.id !== defaultAuthorId)]
  }, [authors, defaultAuthorId])

  const toggleAuthorInSplit = (toggledAuthorId: number) => {
    const exists = assignments.find((a) => a.author_id === toggledAuthorId)
    if (exists) {
      onAssignmentsChange(assignments.filter((a) => a.author_id !== toggledAuthorId))
    } else {
      onAssignmentsChange([...assignments, { author_id: toggledAuthorId, amount: 0 }])
    }
  }

  const updateAssignmentAmount = (authId: number, val: string) => {
    const numbers = val.replace(/\D/g, "")
    const numValue = numbers === "" ? 0 : parseInt(numbers) / 100
    onAssignmentsChange(
      assignments.map((a) => (a.author_id === authId ? { ...a, amount: numValue } : a))
    )
  }

  const distributeEqually = () => {
    if (assignments.length === 0) return
    const splitValue = Number((totalAmount / assignments.length).toFixed(2))
    const totalDistributed = splitValue * (assignments.length - 1)
    const lastValue = Number((totalAmount - totalDistributed).toFixed(2))
    onAssignmentsChange(
      assignments.map((a, index) => ({
        ...a,
        amount: index === assignments.length - 1 ? lastValue : splitValue,
      }))
    )
  }

  const splitTotal = assignments.reduce((acc, curr) => acc + curr.amount, 0)
  const splitMismatch = Math.abs(splitTotal - totalAmount) >= 0.05

  const pill = (active: boolean) =>
    `px-2.5 py-1 cursor-pointer rounded-full text-xs font-medium border transition-colors flex-shrink-0 flex items-center gap-1 ${
      active
        ? "bg-indigo-600 border-indigo-600 text-white"
        : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
    }`

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
          <User className="w-3.5 h-3.5" />
          Quem comprou?
        </label>
        {!isLocked && (
          <Switch
            id="isSplit"
            checked={isSplit}
            onChange={onIsSplitChange}
            label="Gasto compartilhado"
          />
        )}
      </div>

      {isLocked ? (
        <div className="inline-flex px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
          {lockedAuthorName || "Carregando..."}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {orderedAuthors.map((author) => {
              if (!isSplit) {
                const selected = authorId === String(author.id)
                return (
                  <button
                    key={author.id}
                    type="button"
                    onClick={() => onAuthorIdChange(String(author.id))}
                    className={pill(selected)}
                  >
                    {author.name} {author.is_owner ? "(Você)" : ""}
                  </button>
                )
              }

              const assignment = assignments.find((a) => a.author_id === author.id)
              if (assignment) {
                return (
                  <div
                    key={author.id}
                    className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-indigo-600 text-white"
                  >
                    <button
                      type="button"
                      onClick={() => toggleAuthorInSplit(author.id)}
                      className="cursor-pointer"
                    >
                      {author.name}
                    </button>
                    <input
                      type="text"
                      value={`R$ ${formatCurrency(assignment.amount)}`}
                      onChange={(e) => updateAssignmentAmount(author.id, e.target.value)}
                      className="w-20 bg-white/10 rounded px-1 text-right text-xs font-semibold focus:outline-none focus:bg-white/20"
                    />
                  </div>
                )
              }

              return (
                <button
                  key={author.id}
                  type="button"
                  onClick={() => toggleAuthorInSplit(author.id)}
                  className={pill(false)}
                >
                  + {author.name}
                </button>
              )
            })}
          </div>

          {!isSplit && footer}

          {isSplit && (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={distributeEqually}
                  className="text-xs cursor-pointer text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1"
                  title="Distribuir igualmente entre selecionados"
                >
                  <Calculator size={13} /> Distribuir igualmente
                </button>
                <span
                  className={`text-xs font-bold ${
                    splitMismatch
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  Total: R$ {formatCurrency(splitTotal)}
                </span>
              </div>
              {splitMismatch && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> A soma deve ser igual ao valor total.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
