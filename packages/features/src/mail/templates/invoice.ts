import { inertHtml as h, type Html } from "foldkit/html"
import {
    format_invoice_money,
    invoice_total_minor,
    type InvoicePreviewEncoded,
} from "@urm/domain/finance"
import { emailContainer, emailHr } from "./samples/shared.ts"

export const invoice_view = (invoice: InvoicePreviewEncoded): Html =>
    emailContainer(
        {},
        [
            h.p(
                [
                    h.Class("text-muted-foreground"),
                    h.Style({ paddingTop: "24px" }),
                ],
                [invoice.seller_name]
            ),
            h.h1(
                [h.Class("text-2xl font-semibold")],
                [`Invoice ${invoice.invoice_number}`]
            ),
            h.p([], [`Bill to: ${invoice.customer_name}`]),
            h.p([], [invoice.customer_email]),
            h.p([], [`Issued: ${invoice.issued_on} · Due: ${invoice.due_on}`]),
            emailHr(),
            h.table(
                [
                    h.Style({
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "14px",
                    }),
                ],
                [
                    h.caption(
                        [h.Style({ textAlign: "left", paddingBottom: "12px" })],
                        ["Invoice items · GBP"]
                    ),
                    h.thead(
                        [],
                        [
                            h.tr(
                                [],
                                [
                                    "Description",
                                    "Qty",
                                    "Unit price",
                                    "Amount",
                                ].map((label) =>
                                    h.th(
                                        [
                                            h.Scope("col"),
                                            h.Style({
                                                textAlign: "left",
                                                padding: "8px 4px",
                                            }),
                                        ],
                                        [label]
                                    )
                                )
                            ),
                        ]
                    ),
                    h.tbody(
                        [],
                        invoice.lines.map((line) =>
                            h.tr(
                                [],
                                [
                                    line.description,
                                    String(line.quantity),
                                    format_invoice_money(line.unit_price_minor),
                                    format_invoice_money(
                                        line.quantity * line.unit_price_minor
                                    ),
                                ].map((value) =>
                                    h.td(
                                        [
                                            h.Style({
                                                padding: "12px 4px",
                                                verticalAlign: "top",
                                                overflowWrap: "anywhere",
                                            }),
                                        ],
                                        [value]
                                    )
                                )
                            )
                        )
                    ),
                ]
            ),
            emailHr(),
            h.p(
                [h.Class("text-xl font-semibold")],
                [`Total: ${format_invoice_money(invoice_total_minor(invoice))}`]
            ),
            h.p(
                [
                    h.Class("text-muted-foreground"),
                    h.Style({ paddingBottom: "24px", fontSize: "12px" }),
                ],
                [
                    "Demo invoice · Tax is not calculated. No payment is requested.",
                ]
            ),
        ],
        { padding: "24px" }
    )
