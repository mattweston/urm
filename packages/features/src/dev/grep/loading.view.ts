import { Skeleton } from "@urm/ui/foldkit/skeleton.view.ts"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { Message } from "./model.ts"

const card_class = "min-w-0 rounded-lg border p-4 space-y-3"

const documentation_cards: ReadonlyArray<
    readonly [key: string, title_width: string, body_width: string]
> = [
    ["documentation-skeleton-0", "w-2/5", "w-full"],
    ["documentation-skeleton-1", "w-3/5", "w-5/6"],
    ["documentation-skeleton-2", "w-1/2", "w-11/12"],
]

const code_cards: ReadonlyArray<
    readonly [
        key: string,
        path_width: string,
        lines: ReadonlyArray<readonly [key: string, width: string]>,
    ]
> = [
    [
        "code-skeleton-0",
        "w-3/5",
        [
            ["line-0", "w-11/12"],
            ["line-1", "w-4/5"],
            ["line-2", "w-2/3"],
        ],
    ],
    [
        "code-skeleton-1",
        "w-2/5",
        [
            ["line-0", "w-5/6"],
            ["line-1", "w-3/4"],
            ["line-2", "w-11/12"],
        ],
    ],
    [
        "code-skeleton-2",
        "w-1/2",
        [
            ["line-0", "w-3/4"],
            ["line-1", "w-full"],
            ["line-2", "w-4/5"],
        ],
    ],
]

export const documentation_skeleton = (
    h: HtmlBuilder<Message>
): ReadonlyArray<Html> =>
    documentation_cards.map(([key, title_width, body_width]) =>
        h.keyed("div")(
            key,
            [
                h.AriaHidden(true),
                h.DataAttribute("skeleton", "documentation-result"),
                h.Class(card_class),
            ],
            [
                Skeleton({ class: `h-5 ${title_width}` }),
                Skeleton({ class: "h-3 w-4/5" }),
                Skeleton({ class: "h-4 w-32" }),
                h.div(
                    [h.Class("space-y-3 border-t pt-3")],
                    [
                        Skeleton({ class: "h-4 w-1/3" }),
                        Skeleton({ class: "h-3 w-2/5" }),
                        Skeleton({ class: `h-3 ${body_width}` }),
                        Skeleton({ class: "h-3 w-5/6" }),
                    ]
                ),
            ]
        )
    )

export const code_skeleton = (h: HtmlBuilder<Message>): ReadonlyArray<Html> =>
    code_cards.map(([key, path_width, lines]) =>
        h.keyed("div")(
            key,
            [
                h.AriaHidden(true),
                h.DataAttribute("skeleton", "code-result"),
                h.Class("min-w-0 overflow-hidden rounded-lg border"),
            ],
            [
                h.div(
                    [
                        h.Class(
                            "flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3"
                        ),
                    ],
                    [
                        Skeleton({ class: `h-3 ${path_width}` }),
                        Skeleton({ class: "h-3 w-16 shrink-0" }),
                    ]
                ),
                h.div(
                    [h.Class("space-y-3 px-4 py-4")],
                    lines.map(([line_key, width]) =>
                        h.keyed("div")(
                            `${key}-${line_key}`,
                            [h.Class("flex items-center gap-4")],
                            [
                                Skeleton({ class: "h-3 w-8 shrink-0" }),
                                Skeleton({ class: `h-3 ${width}` }),
                            ]
                        )
                    )
                ),
            ]
        )
    )
