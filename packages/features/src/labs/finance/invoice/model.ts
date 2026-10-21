import { Option, Schema } from "effect"
import { InvoicePreview } from "@urm/domain/finance"
import { sample_invoice } from "../../../mail/templates/invoice.sample.ts"

export const HeaderField = Schema.Literals([
    "invoice_number",
    "seller_name",
    "customer_name",
    "customer_email",
    "issued_on",
    "due_on",
])
export const LineField = Schema.Literals([
    "description",
    "quantity",
    "unit_price",
])
export const DraftLine = Schema.Struct({
    id: Schema.Number,
    description: Schema.String,
    quantity: Schema.String,
    unit_price: Schema.String,
})
export const Model = Schema.Struct({
    invoice_number: Schema.String,
    seller_name: Schema.String,
    customer_name: Schema.String,
    customer_email: Schema.String,
    issued_on: Schema.String,
    due_on: Schema.String,
    lines: Schema.Array(DraftLine),
    next_id: Schema.Number,
    show_errors: Schema.Boolean,
})
export type Model = typeof Model.Type

export const init = (): Model => ({
    invoice_number: sample_invoice.invoice_number,
    seller_name: sample_invoice.seller_name,
    customer_name: sample_invoice.customer_name,
    customer_email: sample_invoice.customer_email,
    issued_on: sample_invoice.issued_on,
    due_on: sample_invoice.due_on,
    lines: sample_invoice.lines.map((line, id) => ({
        id,
        description: line.description,
        quantity: String(line.quantity),
        unit_price: (line.unit_price_minor / 100).toFixed(2),
    })),
    next_id: sample_invoice.lines.length,
    show_errors: false,
})

export const parse_price = (value: string): number | undefined => {
    if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(value)) return undefined
    const [whole = "0", fraction = ""] = value.split(".")
    return Number(whole) * 100 + Number(fraction.padEnd(2, "0"))
}

export const preview = (model: Model): Option.Option<InvoicePreview> =>
    Schema.decodeUnknownOption(InvoicePreview)({
        ...model,
        currency: "GBP",
        lines: model.lines.map((line) => ({
            description: line.description.trim(),
            quantity: /^\d{1,4}$/.test(line.quantity)
                ? Number(line.quantity)
                : undefined,
            unit_price_minor: parse_price(line.unit_price),
        })),
        invoice_number: model.invoice_number.trim(),
        seller_name: model.seller_name.trim(),
        customer_name: model.customer_name.trim(),
        customer_email: model.customer_email.trim().toLowerCase(),
    })
