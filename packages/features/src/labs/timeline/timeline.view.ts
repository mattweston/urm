/** # Timeline view */
import { inertHtml } from "foldkit/html"
import type { Html } from "foldkit/html"

import { Timeline } from "@urm/ui/foldkit/timeline.view.ts"

/**
 * The timeline presents an ordered process with distinct idle, current, and
 * completed treatments. This page compares all three states using the same set of
 * milestones.
 */
export const view = (): Html => {
    const h = inertHtml

    const items = [
        {
            title: h.span([], ["Plan"]),
            description: h.span(
                [],
                ["Define the milestones and the rough order of work."]
            ),
            bullet: h.span(
                [
                    h.Class(
                        "text-[10px] font-semibold leading-none text-muted-foreground"
                    ),
                ],
                ["1"]
            ),
        },
        {
            title: h.span([], ["Build"]),
            description: h.span(
                [],
                ["Implement the current step and keep the previous one active."]
            ),
            bullet: h.span(
                [
                    h.Class(
                        "text-[10px] font-semibold leading-none text-muted-foreground"
                    ),
                ],
                ["2"]
            ),
        },
        {
            title: h.span([], ["Ship"]),
            description: h.span(
                [],
                ["Finish the flow and close out the line."]
            ),
            bullet: h.span(
                [
                    h.Class(
                        "text-[10px] font-semibold leading-none text-muted-foreground"
                    ),
                ],
                ["3"]
            ),
        },
    ]

    return h.div(
        [h.Class("space-y-6")],
        [
            h.div(
                [h.Class("max-w-3xl space-y-3")],
                [
                    h.h2(
                        [
                            h.Class(
                                "text-2xl font-bold tracking-tight text-foreground"
                            ),
                        ],
                        ["Timeline"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "max-w-2xl text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Foldkit port of the vertical timeline component with active-step states.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-4")],
                [
                    h.section(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)]"
                            ),
                        ],
                        [
                            h.h3(
                                [
                                    h.Class(
                                        "mb-4 text-base font-semibold text-foreground"
                                    ),
                                ],
                                ["Idle"]
                            ),
                            Timeline({ items, activeItem: -1 }),
                        ]
                    ),
                    h.section(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)]"
                            ),
                        ],
                        [
                            h.h3(
                                [
                                    h.Class(
                                        "mb-4 text-base font-semibold text-foreground"
                                    ),
                                ],
                                ["In progress"]
                            ),
                            Timeline({ items, activeItem: 1 }),
                        ]
                    ),
                    h.section(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)]"
                            ),
                        ],
                        [
                            h.h3(
                                [
                                    h.Class(
                                        "mb-4 text-base font-semibold text-foreground"
                                    ),
                                ],
                                ["Complete"]
                            ),
                            Timeline({ items, activeItem: 2 }),
                        ]
                    ),
                ]
            ),
        ]
    )
}
