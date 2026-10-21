import type { InvoicePreviewEncoded } from "@urm/domain/finance"

export const sample_invoice: InvoicePreviewEncoded = {
    invoice_number: "DEMO-2026-001",
    seller_name: "Example Studio",
    customer_name: "Sample Company",
    customer_email: "billing@example.com",
    issued_on: "2026-09-08",
    due_on: "2026-10-08",
    currency: "GBP",
    lines: [
        {
            description: "Design services",
            quantity: 2,
            unit_price_minor: 25000,
        },
        { description: "Hosting", quantity: 1, unit_price_minor: 1950 },
    ],
}
