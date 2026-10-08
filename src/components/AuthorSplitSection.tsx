import { useMemo, useState, useRef, useEffect, type ReactNode } from "react"
import { User, Calculator, AlertCircle } from "lucide-react"
import { AppSwitch, Chip } from "./ui/misc"
import { cn } from "../lib/cn"
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

  // Autores cujo valor foi digitado manualmente. Os demais ("automáticos") absorvem
  // o restante do valor total conforme os manuais mudam. Ao montar, os já existentes
  // (ex: transação em edição) entram como manuais para não sobrescrever valores salvos.
  const [touchedIds, setTouchedIds] = useState<Set<number>>(
    () => new Set(assignments.map((a) => a.author_id))
  )
  const isFirstTotalRender = useRef(true)

  const redistribute = (list: SplitAssignment[], touched: Set<number>): SplitAssignment[] => {
    const untouched = list.filter((a) => !touched.has(a.author_id))
    if (untouched.length === 0) return list
    const manualSum = list
      .filter((a) => touched.has(a.author_id))
      .reduce((acc, a) => acc + a.amount, 0)
    const remaining = Math.max(0, Number((totalAmount - manualSum).toFixed(2)))
    const share = Number((remaining / untouched.length).toFixed(2))
    const distributed = share * (untouched.length - 1)
    const lastShare = Number((remaining - distributed).toFixed(2))
    let seen = 0
    return list.map((a) => {
      if (touched.has(a.author_id)) return a
      const isLast = seen === untouched.length - 1
      seen++
      return { ...a, amount: isLast ? lastShare : share }
    })
  }

  const toggleAuthorInSplit = (toggledAuthorId: number) => {
    const exists = assignments.find((a) => a.author_id === toggledAuthorId)
    if (exists) {
      const newTouched = new Set(touchedIds)
      newTouched.delete(toggledAuthorId)
      setTouchedIds(newTouched)
      const remaining = assignments.filter((a) => a.author_id !== toggledAuthorId)
      onAssignmentsChange(redistribute(remaining, newTouched))
    } else {
      const withNew = [...assignments, { author_id: toggledAuthorId, amount: 0 }]
      onAssignmentsChange(redistribute(withNew, touchedIds))
    }
  }

  const updateAssignmentAmount = (authId: number, val: string) => {
    const numbers = val.replace(/\D/g, "")
    const numValue = numbers === "" ? 0 : parseInt(numbers) / 100
    const newTouched = new Set(touchedIds)
    newTouched.add(authId)
    setTouchedIds(newTouched)
    const updated = assignments.map((a) => (a.author_id === authId ? { ...a, amount: numValue } : a))
    onAssignmentsChange(redistribute(updated, newTouched))
  }

  const distributeEqually = () => {
    if (assignments.length === 0) return
    setTouchedIds(new Set())
    onAssignmentsChange(redistribute(assignments, new Set()))
  }

  useEffect(() => {
    if (isFirstTotalRender.current) {
      isFirstTotalRender.current = false
      return
    }
    if (!isSplit) return
    onAssignmentsChange(redistribute(assignments, touchedIds))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount])

  const splitTotal = assignments.reduce((acc, curr) => acc + curr.amount, 0)
  const splitDiff = Number((totalAmount - splitTotal).toFixed(2))
  const splitMismatch = Math.abs(splitDiff) >= 0.05

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted">
          <User size={14} />
          Quem comprou?
        </span>
        {!isLocked && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-[13px] font-medium text-foreground">Gasto compartilhado</span>
            <AppSwitch checked={isSplit} onChange={onIsSplitChange} label="Gasto compartilhado" />
          </label>
        )}
      </div>

      {isLocked ? (
        <div className="inline-flex items-center h-9 px-3.5 rounded-full bg-surface-2 text-sm font-medium text-foreground">
          {lockedAuthorName || "Carregando..."}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {orderedAuthors.map((author) => {
              if (!isSplit) {
                return (
                  <Chip
                    key={author.id}
                    label={`${author.name}${author.is_owner ? " (Você)" : ""}`}
                    selected={authorId === String(author.id)}
                    onClick={() => onAuthorIdChange(String(author.id))}
                  />
                )
              }

              const assignment = assignments.find((a) => a.author_id === author.id)
              if (!assignment) {
                return <Chip key={author.id} label={`+ ${author.name}`} onClick={() => toggleAuthorInSplit(author.id)} />
              }

              const isAuto = !touchedIds.has(author.id)
              return (
                <div
                  key={author.id}
                  className={cn(
                    "flex items-center gap-1.5 h-10 pl-3.5 pr-1 rounded-full bg-primary text-on-primary",
                    isAuto && "ring-1 ring-inset ring-white/40",
                  )}
                >
                  <button type="button" onClick={() => toggleAuthorInSplit(author.id)} className="text-sm font-medium" title="Remover da divisão">
                    {author.name}
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={`R$ ${formatCurrency(assignment.amount)}`}
                    onChange={(e) => updateAssignmentAmount(author.id, e.target.value)}
                    aria-label={`Valor de ${author.name}`}
                    title={isAuto ? "Valor calculado automaticamente com o restante" : undefined}
                    className={cn(
                      "w-[104px] h-8 px-3 rounded-full bg-white/15 text-right text-[13px] font-semibold outline-none focus:bg-white/25",
                      isAuto && "italic",
                    )}
                  />
                </div>
              )
            })}
          </div>

          {!isSplit && footer}

          {isSplit && (
            <div className="rounded-xl bg-surface-2 p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={distributeEqually}
                  className="flex items-center gap-1 text-[13px] font-medium text-primary hover:opacity-80"
                  title="Distribuir igualmente entre selecionados"
                >
                  <Calculator size={14} /> Distribuir igualmente
                </button>
                <span className={cn("text-[13px] font-bold", splitMismatch ? "text-danger" : "text-success")}>
                  Total: R$ {formatCurrency(splitTotal)}
                </span>
              </div>
              {splitMismatch && (
                <p className="text-xs text-danger flex items-center gap-1">
                  <AlertCircle size={12} />
                  {splitDiff > 0
                    ? `Falta distribuir R$ ${formatCurrency(splitDiff)}`
                    : `Passou R$ ${formatCurrency(Math.abs(splitDiff))} do total`}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
