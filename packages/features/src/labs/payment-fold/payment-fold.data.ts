import { Array } from "effect"

export type PaymentLine = Readonly<{
    label: string
    amount: number
}>

export const payment_lines: ReadonlyArray<PaymentLine> = [
    { label: "Workshop ticket", amount: 24.99 },
    { label: "Delivery", amount: 4.99 },
    { label: "VAT", amount: 6 },
]

export const payment_total = Array.reduce(
    payment_lines,
    0,
    (total, line) => total + line.amount
)
