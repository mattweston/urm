import { AccountCategory } from "@urm/domain/finance"
import type { Html, HtmlBuilder } from "foldkit/html"

const category_labels: Readonly<Record<AccountCategory, string>> = {
    asset: "Assets",
    liability: "Liabilities",
    equity: "Equity",
    income: "Income",
    expense: "Expenses",
}

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
    h.div(
        [
            h.Class(
                "mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8"
            ),
        ],
        [
            h.div(
                [h.Class("space-y-1")],
                [
                    h.h1(
                        [h.Class("text-2xl font-semibold tracking-tight")],
                        ["Finance"]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        ["Your chart of accounts and bookkeeping workspace."]
                    ),
                ]
            ),
            h.section(
                [h.Class("space-y-4 rounded-lg border bg-card p-6")],
                [
                    h.h2(
                        [h.Class("text-lg font-semibold")],
                        ["Chart of accounts"]
                    ),
                    h.p(
                        [h.Class("max-w-prose text-sm text-muted-foreground")],
                        [
                            "Organize your accounts into five categories. Account creation and editing are coming soon.",
                        ]
                    ),
                    h.ul(
                        [h.Class("list-disc space-y-2 pl-5 text-sm")],
                        AccountCategory.literals.map((category) =>
                            h.li([], [category_labels[category]])
                        )
                    ),
                ]
            ),
        ]
    )
