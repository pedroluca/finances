import { bankInitials, type Bank } from '../../lib/pix'

/** Selo redondo com as cores e as iniciais do banco */
export function BankBadge({ bank, size = 40 }: { bank: Bank; size?: number }) {
  return (
    <span
      className="shrink-0 rounded-full inline-flex items-center justify-center font-bold"
      style={{ width: size, height: size, backgroundColor: bank.color, color: bank.text, fontSize: size * 0.36 }}
    >
      {bankInitials(bank.name)}
    </span>
  )
}
