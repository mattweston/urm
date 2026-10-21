/**
 * # Design ideas placeholder
 *
 * Reserves the route without persistence, code execution or publishing. Generated
 * designs would require an isolated preview and explicit authorized promotion;
 * a proposed interface must never become trusted publication input implicitly.
 */
import type { Html, HtmlBuilder } from "foldkit/html"

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
    h.main(
        [
            h.Class(
                "mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:px-8"
            ),
        ],
        [
            h.header(
                [h.Class("grid gap-2 border-b border-border pb-6")],
                [
                    h.p(
                        [
                            h.Class(
                                "text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
                            ),
                        ],
                        ["Design"]
                    ),
                    h.h1(
                        [
                            h.Class(
                                "text-2xl font-semibold tracking-tight text-foreground"
                            ),
                        ],
                        ["Ideas"]
                    ),
                    h.p(
                        [h.Class("max-w-2xl text-sm text-muted-foreground")],
                        [
                            "Explore and develop custom interface ideas for this site.",
                        ]
                    ),
                ]
            ),
            h.section(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border border-border bg-card p-6 text-card-foreground"
                    ),
                ],
                [
                    h.h2(
                        [h.Class("text-lg font-semibold")],
                        ["Ideas workspace"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground"
                            ),
                        ],
                        [
                            "Custom interface generation, previews, and saved ideas will appear here.",
                        ]
                    ),
                ]
            ),
        ]
    )
