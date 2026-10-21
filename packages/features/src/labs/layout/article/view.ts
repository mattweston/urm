import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import { ToggledGuides, type Message } from "./message.ts"
import type { Model } from "./model.ts"

// Every declaration from the original note, as a Tailwind utility. Arbitrary
// values carry no spaces, which is what lets `clamp()` survive as a class.
//
//   width: clamp(200px, 50%, 600px)   -> w-[clamp(200px,50%,600px)]
//   scrollbar-gutter: stable          -> [scrollbar-gutter:stable]
//   margin-block: clamp(1rem,5vh,2.5rem)
//   margin-inline: clamp(2rem,5vw,4rem)
//   scroll-padding-top: 1rem          -> scroll-pt-4
const articleClassName =
    "w-[clamp(200px,50%,600px)] [scrollbar-gutter:stable] my-[clamp(1rem,5vh,2.5rem)] mx-[clamp(2rem,5vw,4rem)] scroll-pt-4"

// the measure: never narrower than 45 characters, never wider than 75
const paragraphClassName = "w-[clamp(45ch,100%,75ch)]"

const guideClassName = "outline outline-2 outline-dashed outline-primary"

const paragraphGuideClassName = "outline outline-1 outline-dashed outline-ring"

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
        css: "width: clamp(200px, 50%, 600px)",
        tailwind: "w-[clamp(200px,50%,600px)]",
    },
    {
        css: "scrollbar-gutter: stable",
        tailwind: "[scrollbar-gutter:stable]",
    },
    {
        css: "margin-block: clamp(1rem, 5vh, 2.5rem)",
        tailwind: "my-[clamp(1rem,5vh,2.5rem)]",
    },
    {
        css: "margin-inline: clamp(2rem, 5vw, 4rem)",
        tailwind: "mx-[clamp(2rem,5vw,4rem)]",
    },
    {
        css: "scroll-padding-top: 1rem",
        tailwind: "scroll-pt-4",
    },
    {
        css: "p { width: clamp(45ch, 100%, 75ch) }",
        tailwind: "w-[clamp(45ch,100%,75ch)]",
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

const guidesToggle = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Checkbox.view(
        {
            id: "layout-article-guides",
            isChecked: model.showGuides,
            onToggle: (isShown) => toParentMessage(ToggledGuides({ isShown })),
            toView: (attributes) =>
                h.div(
                    [h.Class("flex items-center gap-2")],
                    [
                        h.button(
                            [
                                ...attributes.checkbox,
                                h.Class(checkboxClassName),
                            ],
                            model.showGuides
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
                            ["Outline the article and its paragraphs"]
                        ),
                    ]
                ),
        },
        h
    )

const demoParagraph = <ParentMessage>(
    model: Model,
    text: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.p(
        [
            h.Class(
                model.showGuides
                    ? `${paragraphClassName} ${paragraphGuideClassName} mb-3 text-sm leading-6 text-foreground`
                    : `${paragraphClassName} mb-3 text-sm leading-6 text-foreground`
            ),
        ],
        [text]
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
                ["Article"]
            ),

            h.p(
                [h.Class(`${descriptionClassName} max-w-2xl`)],
                [
                    "A fluid article that sizes itself. clamp() gives the element a preferred width of 50% with a hard floor and ceiling, so it tracks the viewport without ever becoming unreadably narrow or wide. The margins clamp against vh and vw, and the paragraphs clamp against the character measure rather than the pixel width.",
                ]
            ),
            h.p(
                [h.Class(`${descriptionClassName} mt-2 max-w-2xl`)],
                [
                    "scrollbar-gutter: stable reserves the scrollbar's width whether or not it is showing, so content does not shift sideways when a scrollbar appears.",
                ]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Demo"]
            ),
            h.div([h.Class("mb-4")], [guidesToggle(model, toParentMessage, h)]),
            h.div(
                [
                    h.Class(
                        "max-h-96 overflow-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border bg-muted/30"
                    ),
                ],
                [
                    h.article(
                        [
                            h.Class(
                                model.showGuides
                                    ? `${articleClassName} ${guideClassName}`
                                    : articleClassName
                            ),
                        ],
                        [
                            h.h4(
                                [
                                    h.Class(
                                        "mb-3 text-lg font-semibold text-foreground"
                                    ),
                                ],
                                ["On sizing text by its measure"]
                            ),
                            demoParagraph(
                                model,
                                "Line length is the one dimension a reader actually feels. Too short and the eye jumps back to the left margin constantly; too long and it loses the start of the next line on the way back. Typographers put the comfortable range somewhere between 45 and 75 characters, which is why this paragraph is clamped in ch units rather than pixels.",
                                h
                            ),
                            demoParagraph(
                                model,
                                "Because the floor and ceiling are expressed in characters, the measure follows the font. Change the type size and the paragraph rewraps to keep the same number of characters per line, which a pixel width could never do.",
                                h
                            ),
                        ]
                    ),
                ]
            ),
            h.p(
                [h.Class(`${descriptionClassName} mt-3 max-w-2xl`)],
                [
                    "Resize the window: the article holds 50% of the width until it hits 200px or 600px, and the margins grow with the viewport rather than in steps at breakpoints.",
                ]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["CSS to Tailwind"]
            ),
            translationTable(h),
        ]
    )
