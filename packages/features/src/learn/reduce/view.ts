import type { Html, HtmlBuilder } from "foldkit/html"

import { ChangedPrice, SubmittedReduce, type Message } from "./message.ts"
import type { Model } from "./model.ts"

const source = `const total = prices.reduce(
    (accumulator, current_value) => accumulator + current_value,
    0
)`

export const view = <ParentMessage>(
    model: Model,
    to_parent_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.main(
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
                        [h.Class("text-3xl font-bold tracking-tight")],
                        ["Reduce"]
                    ),
                    h.p(
                        [h.Class("text-muted-foreground")],
                        [
                            "Reduce walks through an array and combines its values into one result. Edit the prices, then reduce them into a total.",
                        ]
                    ),
                ]
            ),
            h.section(
                [h.Class("space-y-4")],
                [
                    h.h2(
                        [h.Class("text-xl font-semibold")],
                        ["Addition and reduce"]
                    ),
                    h.p(
                        [h.Class("max-w-2xl text-muted-foreground")],
                        [
                            "Addition and reduce do different jobs. Addition combines two values. Reduce processes every item in an array and carries one accumulated result forward.",
                        ]
                    ),
                    h.div(
                        [h.Class("grid gap-4 sm:grid-cols-2")],
                        [
                            h.article(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5"
                                    ),
                                ],
                                [
                                    h.h3(
                                        [h.Class("font-semibold")],
                                        ["Addition"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "The + operator combines two operands at a time. With numbers it adds; with strings it joins text.",
                                        ]
                                    ),
                                    h.code(
                                        [
                                            h.Class(
                                                "mt-4 block rounded bg-muted px-3 py-2 font-mono text-sm"
                                            ),
                                        ],
                                        ["1 + 3 // 4"]
                                    ),
                                ]
                            ),
                            h.article(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5"
                                    ),
                                ],
                                [
                                    h.h3(
                                        [h.Class("font-semibold")],
                                        ["Reduce"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Array.reduce calls a function once for each item. That function decides how to combine the accumulator and the current item.",
                                        ]
                                    ),
                                    h.code(
                                        [
                                            h.Class(
                                                "mt-4 block rounded bg-muted px-3 py-2 font-mono text-sm"
                                            ),
                                        ],
                                        ["[1, 3, 5].reduce(add, 0) // 9"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "max-w-2xl rounded-[var(--radius-control)] border border-primary/30 bg-primary/10 p-4 text-sm leading-6"
                            ),
                        ],
                        [
                            "This demo uses addition inside reduce, so the accumulated result is a sum. Reduce can also build an object, find a maximum, group items, or perform any other operation described by its callback. The initial value 0 gives the accumulator a numeric starting point and makes an empty array total 0.",
                        ]
                    ),
                ]
            ),
            h.form(
                [
                    h.OnSubmit(to_parent_message(SubmittedReduce())),
                    h.Class(
                        "space-y-6 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 [box-shadow:var(--shadow-card)]"
                    ),
                ],
                [
                    h.fieldset(
                        [h.Class("space-y-4")],
                        [
                            h.legend(
                                [h.Class("text-lg font-semibold")],
                                ["Prices"]
                            ),
                            h.ul(
                                [
                                    h.Class(
                                        "grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3"
                                    ),
                                    h.Role("list"),
                                ],
                                model.prices.map((price, index) => {
                                    const id = `reduce-price-${index}`
                                    return h.li(
                                        [h.Class("space-y-2")],
                                        [
                                            h.label(
                                                [
                                                    h.For(id),
                                                    h.Class(
                                                        "block text-sm font-medium"
                                                    ),
                                                ],
                                                [`Price ${index + 1}`]
                                            ),
                                            h.div(
                                                [h.Class("relative")],
                                                [
                                                    h.span(
                                                        [
                                                            h.Class(
                                                                "pointer-events-none absolute inset-y-0 left-3 flex items-center font-semibold text-muted-foreground"
                                                            ),
                                                            h.AriaHidden(true),
                                                        ],
                                                        ["£"]
                                                    ),
                                                    h.input([
                                                        h.Id(id),
                                                        h.Name(
                                                            `price_${index}`
                                                        ),
                                                        h.Type("number"),
                                                        h.InputMode("decimal"),
                                                        h.Min("0"),
                                                        h.Step("0.01"),
                                                        h.Value(price),
                                                        h.OnInput((value) =>
                                                            to_parent_message(
                                                                ChangedPrice({
                                                                    index,
                                                                    value,
                                                                })
                                                            )
                                                        ),
                                                        h.Class(
                                                            "min-h-12 w-full rounded-[var(--radius-control)] border-(length:--control-border-width) border-border bg-background py-2 pr-3 pl-8 text-base tabular-nums text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                                        ),
                                                    ]),
                                                ]
                                            ),
                                        ]
                                    )
                                })
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5"
                            ),
                        ],
                        [
                            h.p(
                                [h.Class("flex items-baseline gap-2")],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        ["Total"]
                                    ),
                                    h.output(
                                        [
                                            h.Class(
                                                "font-mono text-2xl font-semibold tabular-nums"
                                            ),
                                            h.AriaLive("polite"),
                                        ],
                                        [
                                            model.sum === null
                                                ? "Not calculated"
                                                : `£${model.sum.toFixed(2)}`,
                                        ]
                                    ),
                                ]
                            ),
                            h.button(
                                [
                                    h.Type("submit"),
                                    h.Class(
                                        "min-h-12 rounded-[var(--radius-control)] border-(length:--control-border-width) border-primary bg-primary px-5 py-2 text-sm font-medium text-primary-foreground [box-shadow:var(--shadow-primary)] hover:bg-primary/90"
                                    ),
                                ],
                                ["Reduce prices"]
                            ),
                        ]
                    ),
                ]
            ),
            h.section(
                [
                    h.Class("space-y-3"),
                    h.AriaLabelledBy("reduce-source-heading"),
                ],
                [
                    h.h2(
                        [
                            h.Id("reduce-source-heading"),
                            h.Class("text-lg font-semibold"),
                        ],
                        ["The reduction"]
                    ),
                    h.pre(
                        [
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
