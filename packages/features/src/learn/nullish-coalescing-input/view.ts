import type { Html, HtmlBuilder } from "foldkit/html"

import { ChangedInputValue, type Message } from "./message.ts"
import type { Model } from "./model.ts"

const source = `const normalize_input = (value: string): string | null =>
    value === "" ? null : value

const displayed_value =
    model.input_value ?? "Default Value"`

const examples: ReadonlyArray<
    Readonly<{ expression: string; result: string }>
> = [
    { expression: "null ?? fallback", result: "fallback" },
    { expression: "undefined ?? fallback", result: "fallback" },
    { expression: '"" ?? fallback', result: "empty string" },
    { expression: "0 ?? fallback", result: "0" },
    { expression: "false ?? fallback", result: "false" },
]

export const view = <ParentMessage>(
    model: Model,
    to_parent_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const displayed_value = model.input_value ?? "Default Value"
    const raw_value =
        model.input_value === null ? "null" : JSON.stringify(model.input_value)

    return h.main(
        [h.Class("w-full space-y-8")],
        [
            h.header(
                [h.Class("max-w-2xl space-y-3")],
                [
                    h.p(
                        [h.Class("text-sm font-medium text-primary")],
                        ["Learn / JavaScript"]
                    ),
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-bold tracking-tight text-balance"
                            ),
                        ],
                        ["Nullish Coalescing Input"]
                    ),
                    h.p(
                        [h.Class("text-pretty text-muted-foreground")],
                        [
                            "Use the nullish coalescing operator to provide a fallback only when a value is null or undefined.",
                        ]
                    ),
                ]
            ),
            h.section(
                [
                    h.Class(
                        "grid gap-6 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 [box-shadow:var(--shadow-card)] sm:p-6"
                    ),
                ],
                [
                    h.div(
                        [h.Class("space-y-2")],
                        [
                            h.label(
                                [
                                    h.For("nullish-coalescing-value"),
                                    h.Class("block text-sm font-medium"),
                                ],
                                ["Custom value"]
                            ),
                            h.p(
                                [
                                    h.Id("nullish-coalescing-value-hint"),
                                    h.Class("text-sm text-muted-foreground"),
                                ],
                                [
                                    "Type a value, then clear the field to restore the default.",
                                ]
                            ),
                            h.input([
                                h.Id("nullish-coalescing-value"),
                                h.Name("custom_value"),
                                h.Type("text"),
                                h.Autocomplete("off"),
                                h.Placeholder("Enter a custom value…"),
                                h.AriaDescribedBy(
                                    "nullish-coalescing-value-hint"
                                ),
                                h.Value(model.input_value ?? ""),
                                h.OnInput((value) =>
                                    to_parent_message(
                                        ChangedInputValue({ value })
                                    )
                                ),
                                h.Class(
                                    "min-h-12 w-full rounded-[var(--radius-control)] border-(length:--control-border-width) border-border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                ),
                            ]),
                        ]
                    ),
                    h.div(
                        [h.Class("grid gap-3 sm:grid-cols-2")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-control)] bg-muted p-4"
                                    ),
                                ],
                                [
                                    h.p(
                                        [
                                            h.Class(
                                                "text-xs font-medium text-muted-foreground"
                                            ),
                                        ],
                                        ["Stored value"]
                                    ),
                                    h.code(
                                        [
                                            h.Class(
                                                "mt-2 block break-words font-mono text-base"
                                            ),
                                        ],
                                        [raw_value]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-control)] bg-primary/10 p-4 ring-1 ring-inset ring-primary/20"
                                    ),
                                ],
                                [
                                    h.p(
                                        [
                                            h.Class(
                                                "text-xs font-medium text-muted-foreground"
                                            ),
                                        ],
                                        ["Displayed value"]
                                    ),
                                    h.output(
                                        [
                                            h.For("nullish-coalescing-value"),
                                            h.Class(
                                                "mt-2 block break-words text-lg font-semibold"
                                            ),
                                        ],
                                        [displayed_value]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            h.section(
                [h.Class("space-y-4")],
                [
                    h.h2(
                        [h.Class("text-xl font-semibold")],
                        ["What ?? checks"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "max-w-2xl text-pretty text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Only null and undefined use the right-hand fallback. Other falsy values—including an empty string, zero, and false—remain unchanged. This input deliberately converts its empty string to null before applying ??.",
                        ]
                    ),
                    h.ul(
                        [
                            h.Class("grid list-none gap-2 sm:grid-cols-2"),
                            h.Role("list"),
                        ],
                        examples.map((example) =>
                            h.li(
                                [
                                    h.Class(
                                        "flex flex-wrap items-baseline justify-between gap-2 rounded-[var(--radius-control)] border border-border px-4 py-3"
                                    ),
                                ],
                                [
                                    h.code(
                                        [h.Class("font-mono text-sm")],
                                        [example.expression]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "text-sm font-medium text-muted-foreground"
                                            ),
                                        ],
                                        [example.result]
                                    ),
                                ]
                            )
                        )
                    ),
                ]
            ),
            h.section(
                [
                    h.Class("space-y-3"),
                    h.AriaLabelledBy("nullish-source-heading"),
                ],
                [
                    h.h2(
                        [
                            h.Id("nullish-source-heading"),
                            h.Class("text-lg font-semibold"),
                        ],
                        ["Core logic"]
                    ),
                    h.pre(
                        [
                            h.Tabindex(0),
                            h.Class(
                                "overflow-x-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted p-4 text-sm leading-relaxed"
                            ),
                        ],
                        [h.code([], [source])]
                    ),
                ]
            ),
        ]
    )
}
