import { Schema } from "effect"
import { Email } from "./contacts.ts"

const invoice_text = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(255)
)
const invoice_date = Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/),
    Schema.makeFilter((value) => {
        const date = new Date(`${value}T00:00:00Z`)
        return (
            Number.isFinite(date.getTime()) &&
            date.toISOString().slice(0, 10) === value
        )
    })
)

export const InvoiceLine = Schema.Struct({
    description: invoice_text,
    quantity: Schema.Number.check(
        Schema.isInt(),
        Schema.isBetween({ minimum: 1, maximum: 1000 })
    ),
    unit_price_minor: Schema.Number.check(
        Schema.isInt(),
        Schema.isBetween({ minimum: 0, maximum: 999999999 })
    ),
})
export type InvoiceLine = typeof InvoiceLine.Type

export const InvoicePreview = Schema.Struct({
    invoice_number: invoice_text,
    seller_name: invoice_text,
    customer_name: invoice_text,
    customer_email: Email,
    issued_on: invoice_date,
    due_on: invoice_date,
    currency: Schema.Literal("GBP"),
    lines: Schema.Array(InvoiceLine).check(
        Schema.isMinLength(1),
        Schema.isMaxLength(50)
    ),
}).check(Schema.makeFilter((invoice) => invoice.due_on >= invoice.issued_on))
export type InvoicePreview = typeof InvoicePreview.Type
export type InvoicePreviewEncoded = typeof InvoicePreview.Encoded

type InvoiceTotalInput = Pick<InvoicePreviewEncoded, "lines">

export const invoice_total_minor = (invoice: InvoiceTotalInput): number =>
    invoice.lines.reduce(
        (total, line) => total + line.quantity * line.unit_price_minor,
        0
    )

const money_formatter = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
})
export const format_invoice_money = (minor: number): string =>
    money_formatter.format(minor / 100)
