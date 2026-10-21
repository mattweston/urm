/** # Card view */
import type { Html, HtmlBuilder } from "foldkit/html"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@urm/ui/foldkit/card.view.ts"

/**
 * The card composes shared header, title, description, content, and footer views
 * into a themed surface. Its slots accept normal Foldkit HTML, so the card does
 * not need to own application state.
 */
export const view = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Card"]
            ),
            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Basic"]
            ),
            Card({
                class: "max-w-xl",
                children: [
                    CardHeader({
                        children: [
                            CardTitle({ children: ["Foldkit Card"] }),
                            CardDescription({
                                children: [
                                    "Reusable surface for grouped content and actions.",
                                ],
                            }),
                        ],
                    }),
                    CardContent({
                        children: [
                            h.div(
                                [
                                    h.Class(
                                        "space-y-3 text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    h.p(
                                        [],
                                        [
                                            "This port keeps the same layout slots as the core UI card.",
                                        ]
                                    ),
                                    h.p(
                                        [],
                                        [
                                            "Use it to frame summaries, controls, or any compact block of related content.",
                                        ]
                                    ),
                                ]
                            ),
                        ],
                    }),
                    CardFooter({
                        class: "justify-between gap-4",
                        children: [
                            h.span(
                                [h.Class("text-sm text-muted-foreground")],
                                ["Status"]
                            ),
                            h.span(
                                [
                                    h.Class(
                                        "text-sm font-medium text-foreground"
                                    ),
                                ],
                                ["Ready"]
                            ),
                        ],
                    }),
                ],
            }),
        ]
    )
}
