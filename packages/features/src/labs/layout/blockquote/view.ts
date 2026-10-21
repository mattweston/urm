import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import { ToggledQuotes, type Message } from "./message.ts"
import type { Model } from "./model.ts"

// blockquote::before { content: open-quote; display: inline }
// blockquote::after  { content: close-quote; display: inline }
//
// `content-[open-quote]` sets --tw-content, which the before:/after: variants
// feed into `content`. The marks come from CSS, so they are drawn but not
// selectable and never end up in a copied quotation.
const quoteMarksClassName =
    "before:content-[open-quote] before:inline after:content-[close-quote] after:inline"

const blockquoteClassName =
    "border-l-2 border-border pl-4 text-lg leading-7 text-foreground"

const citeClassName = "mt-2 block text-sm not-italic text-muted-foreground"

const checkboxClassName =
    "flex h-5 w-5 shrink-0 items-center justify-center rounded border-(length:--surface-border-width) border-border cursor-pointer data-[checked]:bg-primary data-[checked]:border-primary"

const checkboxLabelClassName =
    "text-sm font-normal text-foreground cursor-pointer select-none"

const descriptionClassName = "text-sm text-muted-foreground"

const tableCellClassName = "px-3 py-2 align-top"

const codeClassName =
    "rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground"

type Translation = Readonly<{ css: string; tailwind: string }>

const TRANSLATIONS: ReadonlyArray<Translation> = [
    {
        css: "blockquote::before { content: open-quote }",
        tailwind: "before:content-[open-quote]",
    },
    {
        css: "blockquote::before { display: inline }",
        tailwind: "before:inline",
    },
    {
        css: "blockquote::after { content: close-quote }",
        tailwind: "after:content-[close-quote]",
    },
    {
        css: "blockquote::after { display: inline }",
        tailwind: "after:inline",
    },
]

const translationTable = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.div(
        [
            h.Class(
                "max-w-3xl overflow-x-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.table(
                [h.Class("min-w-full divide-y divide-border text-left")],
                [
                    h.thead(
                        [h.Class("bg-muted")],
                        [
                            h.tr(
                                [],
                                ["CSS", "Tailwind"].map((label) =>
                                    h.th(
                                        [
                                            h.Class(
                                                `${tableCellClassName} text-xs font-medium uppercase tracking-wider text-muted-foreground`
                                            ),
                                        ],
                                        [label]
                                    )
                                )
                            ),
                        ]
                    ),
                    h.tbody(
                        [h.Class("divide-y divide-border")],
                        TRANSLATIONS.map((translation) =>
                            h.keyed("tr")(
                                translation.tailwind,
                                [],
                                [
                                    h.td(
                                        [h.Class(tableCellClassName)],
                                        [
                                            h.code(
                                                [h.Class(codeClassName)],
                                                [translation.css]
                                            ),
                                        ]
                                    ),
                                    h.td(
                                        [h.Class(tableCellClassName)],
                                        [
                                            h.code(
                                                [h.Class(codeClassName)],
                                                [translation.tailwind]
                                            ),
                                        ]
                                    ),
                                ]
                            )
                        )
                    ),
                ]
            ),
        ]
    )

const quotesToggle = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Checkbox.view(
        {
            id: "layout-blockquote-quotes",
            isChecked: model.showQuotes,
            onToggle: (isShown) => toParentMessage(ToggledQuotes({ isShown })),
            toView: (attributes) =>
                h.div(
                    [h.Class("flex items-center gap-2")],
                    [
                        h.button(
                            [
                                ...attributes.checkbox,
                                h.Class(checkboxClassName),
                            ],
                            model.showQuotes
                                ? [
                                      h.span(
                                          [
                                              h.Class(
                                                  "text-xs text-primary-foreground"
                                              ),
                                          ],
                                          ["✓"]
                                      ),
                                  ]
                                : []
                        ),
                        h.label(
                            [
                                ...attributes.label,
                                h.Class(checkboxLabelClassName),
                            ],
                            ["Draw the quote marks"]
                        ),
                    ]
                ),
        },
        h
    )

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Blockquote"]
            ),

            h.p(
                [h.Class(`${descriptionClassName} max-w-2xl`)],
                [
                    "open-quote and close-quote are content keywords that draw the quotation marks for the document's language, rather than hard-coding a particular glyph. Nested quotations step through the quotes property automatically, and because the marks live in a pseudo-element they are never part of the selection a reader copies.",
                ]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Demo"]
            ),
            h.div([h.Class("mb-4")], [quotesToggle(model, toParentMessage, h)]),
            h.figure(
                [h.Class("max-w-2xl")],
                [
                    h.blockquote(
                        [
                            h.Class(
                                model.showQuotes
                                    ? `${blockquoteClassName} ${quoteMarksClassName}`
                                    : blockquoteClassName
                            ),
                        ],
                        [
                            "The most damaging phrase in the language is: 'We've always done it this way.'",
                        ]
                    ),
                    h.figcaption(
                        [],
                        [h.cite([h.Class(citeClassName)], ["Grace Hopper"])]
                    ),
                ]
            ),
            h.p(
                [h.Class(`${descriptionClassName} mt-3 max-w-2xl`)],
                [
                    "Select the quotation and copy it: the marks stay behind, because they are drawn by CSS rather than written into the markup.",
                ]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["CSS to Tailwind"]
            ),
            translationTable(h),
        ]
    )
