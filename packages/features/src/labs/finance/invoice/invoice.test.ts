import { Effect, Option } from "effect"
import { describe, expect, it } from "vitest"
import { Server } from "foldkit/experimental"
import type { HtmlBuilder } from "foldkit/html"
import { defaultEmailTemplateTheme } from "@urm/email/templates"
import { invoice_total_minor } from "@urm/domain/finance"
import { allSamples } from "../../../mail/templates/samples/index.ts"
import { invoice_view } from "../../../mail/templates/invoice.ts"
import { renderHtmlToEmailDocument } from "../../../mail/templates/renderer.ts"
import { init, parse_price, preview, type Model } from "./model.ts"
import {
    AddedLine,
    ChangedHeader,
    ChangedLine,
    RemovedLine,
    ResetDemo,
    update,
    type Message,
} from "./update.ts"
import { view } from "./view.ts"

describe("invoice form and email preview", () => {
    it("parses prices exactly and rejects ambiguous or oversized amounts", () => {
        expect(parse_price("0.10")).toBe(10)
        expect(parse_price("19.5")).toBe(1950)
        expect(parse_price("9999999.99")).toBe(999999999)
        for (const price of [
            "",
            "1.001",
            "-1",
            "1e2",
            "1,000",
            "10000000",
            "Infinity",
            " 2",
        ]) {
            expect(parse_price(price)).toBeUndefined()
        }
    })

    it("recalculates the same invoice used by the email template after editing", () => {
        const initial = init()
        const model = update(
            update(
                initial,
                ChangedLine({ id: 0, field: "quantity", value: "3" })
            ),
            ChangedLine({ id: 0, field: "unit_price", value: "0.10" })
        )
        const invoice = Option.getOrThrow(preview(model))
        expect(invoice_total_minor(invoice)).toBe(1980)
        const html = renderHtmlToEmailDocument(
            invoice_view(invoice),
            defaultEmailTemplateTheme
        )
        expect(html).toContain("£19.80")
        expect(initial.lines[0]?.quantity).toBe("2")
        expect(
            allSamples.some((sample) => sample.id === "sample-invoice")
        ).toBe(true)
    })

    it("clears the preview for invalid dates, quantities, prices, and required fields", () => {
        const initial = init()
        for (const model of [
            { ...initial, issued_on: "2026-02-30" },
            { ...initial, due_on: "2026-01-01" },
            { ...initial, customer_email: "invalid" },
            { ...initial, seller_name: " " },
            update(
                initial,
                ChangedLine({ id: 0, field: "quantity", value: "0" })
            ),
            update(
                initial,
                ChangedLine({ id: 0, field: "quantity", value: "1001" })
            ),
            update(
                initial,
                ChangedLine({ id: 0, field: "quantity", value: "1.5" })
            ),
            update(
                initial,
                ChangedLine({ id: 0, field: "unit_price", value: "1.001" })
            ),
        ])
            expect(Option.isNone(preview(model))).toBe(true)
    })

    it("keeps stable line identities, at least one line, and a maximum of 50", () => {
        const initial = init()
        const removed = update(initial, RemovedLine({ id: 0 }))
        expect(update(removed, RemovedLine({ id: 1 }))).toEqual(removed)
        const added = update(removed, AddedLine())
        expect(added.lines.map((line) => line.id)).toEqual([1, 2])
        let model = initial
        for (let i = 0; i < 60; i++) model = update(model, AddedLine())
        expect(model.lines).toHaveLength(50)
        expect(update(added, ResetDemo())).toEqual(initial)
    })

    it("escapes user-entered markup in the email document", () => {
        const model = update(
            init(),
            ChangedHeader({
                field: "seller_name",
                value: "<script>alert(1)</script>",
            })
        )
        const html = renderHtmlToEmailDocument(
            invoice_view(Option.getOrThrow(preview(model))),
            defaultEmailTemplateTheme
        )
        expect(html).toContain("&lt;script&gt;")
        expect(html).not.toContain("<script>")
    })

    it("renders Foldkit UI labels and a sandboxed email preview", async () => {
        const rendered = await Effect.runPromise(
            Server.renderToString(
                {
                    init: () => ({ model: init(), commands: [] }),
                    view: (model: Model, h: HtmlBuilder<Message>) => ({
                        title: "Invoice form demo",
                        body: h.submodel({
                            slotId: "invoice-form",
                            model,
                            view,
                            toParentMessage: (message) => message,
                        }),
                    }),
                },
                { buildId: "invoice-form-demo" }
            )
        )
        expect(rendered.html).toContain('for="invoice-customer_email"')
        expect(rendered.html).toContain(
            'aria-describedby="invoice-customer_email-description"'
        )
        expect(rendered.html).toContain('sandbox=""')
        expect(rendered.html).toContain('title="Invoice email preview"')
        expect(rendered.html).toContain("Nothing is saved or sent.")
    })
})
