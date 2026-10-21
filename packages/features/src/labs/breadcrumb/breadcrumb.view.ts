/** # Breadcrumb view */
import { inertHtml } from "foldkit/html"
import type { Html } from "foldkit/html"

import {
    Breadcrumb,
    BreadcrumbEllipsis,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@urm/ui/foldkit/breadcrumb.view.ts"

/**
 * Compare breadcrumb trails with different depths and labels. The examples are
 * inert because navigation hierarchy is view data rather than runtime state.
 */
export const view = (): Html => {
    const h = inertHtml

    return h.div(
        [h.Class("space-y-6")],
        [
            h.div(
                [h.Class("space-y-2")],
                [
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-bold tracking-tight text-foreground"
                            ),
                        ],
                        ["Breadcrumb"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "max-w-2xl text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "A simple Foldkit port of breadcrumb navigation with separators, a page state, and an ellipsis.",
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
                            h.h2(
                                [
                                    h.Class(
                                        "mb-4 text-base font-semibold text-foreground"
                                    ),
                                ],
                                ["Default trail"]
                            ),
                            Breadcrumb({
                                children: [
                                    BreadcrumbList({
                                        children: [
                                            BreadcrumbItem({
                                                children: [
                                                    BreadcrumbLink({
                                                        href: "#",
                                                        children: [
                                                            h.span(
                                                                [],
                                                                ["Home"]
                                                            ),
                                                        ],
                                                    }),
                                                ],
                                            }),
                                            BreadcrumbSeparator(),
                                            BreadcrumbItem({
                                                children: [
                                                    BreadcrumbLink({
                                                        href: "#",
                                                        children: [
                                                            h.span(
                                                                [],
                                                                ["Components"]
                                                            ),
                                                        ],
                                                    }),
                                                ],
                                            }),
                                            BreadcrumbSeparator(),
                                            BreadcrumbItem({
                                                children: [
                                                    BreadcrumbLink({
                                                        href: "#",
                                                        children: [
                                                            h.span(
                                                                [],
                                                                ["Navigation"]
                                                            ),
                                                        ],
                                                    }),
                                                ],
                                            }),
                                            BreadcrumbSeparator(),
                                            BreadcrumbItem({
                                                children: [
                                                    BreadcrumbPage({
                                                        children: [
                                                            h.span(
                                                                [],
                                                                ["Breadcrumb"]
                                                            ),
                                                        ],
                                                    }),
                                                ],
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                        ]
                    ),
                    h.section(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)]"
                            ),
                        ],
                        [
                            h.h2(
                                [
                                    h.Class(
                                        "mb-4 text-base font-semibold text-foreground"
                                    ),
                                ],
                                ["Collapsed trail"]
                            ),
                            Breadcrumb({
                                children: [
                                    BreadcrumbList({
                                        children: [
                                            BreadcrumbItem({
                                                children: [
                                                    BreadcrumbLink({
                                                        href: "#",
                                                        children: [
                                                            h.span(
                                                                [],
                                                                ["Home"]
                                                            ),
                                                        ],
                                                    }),
                                                ],
                                            }),
                                            BreadcrumbSeparator(),
                                            BreadcrumbItem({
                                                children: [
                                                    BreadcrumbLink({
                                                        href: "#",
                                                        children: [
                                                            h.span(
                                                                [],
                                                                ["Library"]
                                                            ),
                                                        ],
                                                    }),
                                                ],
                                            }),
                                            BreadcrumbSeparator(),
                                            BreadcrumbItem({
                                                children: [
                                                    BreadcrumbEllipsis(),
                                                ],
                                            }),
                                            BreadcrumbSeparator(),
                                            BreadcrumbItem({
                                                children: [
                                                    BreadcrumbPage({
                                                        children: [
                                                            h.span(
                                                                [],
                                                                ["Breadcrumb"]
                                                            ),
                                                        ],
                                                    }),
                                                ],
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                        ]
                    ),
                ]
            ),
        ]
    )
}
