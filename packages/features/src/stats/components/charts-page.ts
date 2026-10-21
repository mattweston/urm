import { type Html, inertHtml as h } from "foldkit/html"
import { chartsView, type StatsInput } from "./charts.ts"

export const chartsPageView = (input: StatsInput): Html => {
    return h.div(
        [h.Class("flex min-h-0 flex-col gap-6")],
        [
            h.div(
                [h.Class("flex items-start justify-between gap-4")],
                [
                    h.div(
                        [h.Class("space-y-1")],
                        [
                            h.h2(
                                [
                                    h.Class(
                                        "text-2xl font-semibold tracking-tight"
                                    ),
                                ],
                                ["Stats"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    input.domain_name === undefined
                                        ? "Current domain reporting."
                                        : `Current reporting for ${input.domain_name}.`,
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            ...(input.domain_name === undefined
                ? [
                      h.div(
                          [
                              h.Class(
                                  "rounded-[var(--radius-control)] border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground"
                              ),
                          ],
                          [
                              "Select or create a domain to populate these charts.",
                          ]
                      ),
                  ]
                : []),
            chartsView(input),
        ]
    )
}
