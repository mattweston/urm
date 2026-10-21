/** # Data Table view */
import { inertHtml } from "foldkit/html"
import type { Html } from "foldkit/html"

import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@urm/ui/foldkit/data-table.view.ts"
import { dinosaurs } from "../routing/query-sync-table/query-sync-table.data.ts"

/**
 * This inert example demonstrates the table’s responsive layout, semantic
 * columns, status treatment, and action placement without introducing model
 * state where none is required.
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
                        ["Data Table"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "max-w-2xl text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Reusable table primitives for consistent layout, spacing, and responsive overflow.",
                        ]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    Table({
                        class: "border-collapse",
                        children: [
                            TableCaption({
                                children: [
                                    "A shared dinosaur dataset rendered with the generic Foldkit table.",
                                ],
                            }),
                            TableHeader({
                                class: "border-b-(length:--surface-border-width) border-border bg-muted/40",
                                children: [
                                    h.tr(
                                        [],
                                        [
                                            TableHead({ children: ["Name"] }),
                                            TableHead({ children: ["Period"] }),
                                            TableHead({ children: ["Diet"] }),
                                            TableHead({
                                                class: "text-end",
                                                children: ["Length (m)"],
                                            }),
                                            TableHead({
                                                class: "text-end",
                                                children: ["Weight (kg)"],
                                            }),
                                        ]
                                    ),
                                ],
                            }),
                            TableBody({
                                children: dinosaurs.map((dinosaur) =>
                                    TableRow({
                                        key: dinosaur.name,
                                        children: [
                                            TableCell({
                                                children: [dinosaur.name],
                                            }),
                                            TableCell({
                                                children: [dinosaur.period],
                                            }),
                                            TableCell({
                                                children: [dinosaur.diet],
                                            }),
                                            TableCell({
                                                class: "text-end tabular-nums",
                                                children: [
                                                    `${dinosaur.lengthMeters} m`,
                                                ],
                                            }),
                                            TableCell({
                                                class: "text-end tabular-nums",
                                                children: [
                                                    `${dinosaur.weightKg} kg`,
                                                ],
                                            }),
                                        ],
                                    })
                                ),
                            }),
                        ],
                    }),
                ]
            ),
        ]
    )
}
