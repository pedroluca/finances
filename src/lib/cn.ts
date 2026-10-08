type ClassValue = string | false | null | undefined | 0

/** Junta classes condicionais ("a", cond && "b") */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ')
}
