import type { Html, HtmlBuilder } from "foldkit/html"
import type { CodeGroup } from "./transport.ts"
import { SelectedMatch, ShowMoreMatches, PreviousMatches } from "./model.ts"
import type { Message } from "./model.ts"
import { syntax_slice } from "./syntax.view.ts"

type FileGroup = Omit<CodeGroup, "origin" | "offset">
type ContextLine = FileGroup["blocks"][number]["lines"][number]

const line_content = (
    line: ContextLine,
    selected: string | undefined,
    h: HtmlBuilder<Message>
) => {
    const content: Html[] = []
    let offset = 0
    for (const match of line.matches) {
        content.push(
            ...syntax_slice(line.text, line.tokens, offset, match.start, h)
        )
        content.push(
            h.keyed("button")(
                match.id,
                [
                    h.Type("button"),
                    h.AriaLabel(
                        `Select occurrence at line ${match.line}, column ${match.column}`
                    ),
                    h.AriaPressed(selected === match.id ? "true" : "false"),
                    h.Class(
                        `rounded-sm text-inherit focus-visible:outline-2 focus-visible:outline-ring ${selected === match.id ? "bg-primary/30 ring-1 ring-primary/60" : "bg-primary/15 hover:bg-primary/25"}`
                    ),
                    h.OnClick(SelectedMatch({ id: match.id })),
                ],
                syntax_slice(line.text, line.tokens, match.start, match.end, h)
            )
        )
        offset = match.end
    }
    content.push(
        ...syntax_slice(line.text, line.tokens, offset, line.text.length, h)
    )
    return content
}

export const code_file_view = (
    file: FileGroup & { offset?: number; origin?: string },
    selected: string | undefined,
    h: HtmlBuilder<Message>
) =>
    h.keyed("article")(
        file.path,
        [h.Class("min-w-0 overflow-hidden rounded-lg border")],
        [
            h.div(
                [
                    h.Class(
                        "flex items-start justify-between gap-3 border-b bg-muted/40 px-4 py-3"
                    ),
                ],
                [
                    h.h3(
                        [h.Class("min-w-0 break-all font-mono text-xs")],
                        [
                            `${file.origin === undefined ? "" : `${file.origin} · `}${file.path}`,
                        ]
                    ),
                    h.span(
                        [
                            h.Class(
                                "shrink-0 text-xs text-muted-foreground tabular-nums"
                            ),
                        ],
                        [`${file.occurrences} matches`]
                    ),
                ]
            ),
            ...((file.offset ?? 0) > 0
                ? [
                      h.button(
                          [
                              h.Type("button"),
                              h.OnClick(PreviousMatches({ path: file.path })),
                          ],
                          ["Previous occurrences"]
                      ),
                  ]
                : []),
            ...file.blocks.map((block) =>
                h.keyed("div")(
                    block.id,
                    [h.Class("overflow-x-auto border-b last:border-b-0 py-2")],
                    [
                        h.pre(
                            [
                                h.Class(
                                    "w-max min-w-full text-[12.5px] leading-relaxed"
                                ),
                            ],
                            block.lines.map((line) =>
                                h.keyed("div")(
                                    String(line.number),
                                    [h.Class("flex")],
                                    [
                                        h.span(
                                            [
                                                h.AriaHidden(true),
                                                h.Class(
                                                    "sticky left-0 w-14 shrink-0 select-none bg-background pr-4 text-right text-muted-foreground tabular-nums"
                                                ),
                                            ],
                                            [String(line.number)]
                                        ),
                                        h.span(
                                            [h.Class("pr-4")],
                                            line_content(line, selected, h)
                                        ),
                                    ]
                                )
                            )
                        ),
                    ]
                )
            ),
            ...(file.occurrences > file.shown_matches + (file.offset ?? 0)
                ? [
                      h.button(
                          [
                              h.Type("button"),
                              h.Class(
                                  "w-full border-t px-4 py-3 text-left text-sm text-primary hover:bg-muted/40"
                              ),
                              h.OnClick(ShowMoreMatches({ path: file.path })),
                          ],
                          [
                              `Next ${Math.min(20, file.occurrences - file.shown_matches - (file.offset ?? 0))} occurrences · ${file.occurrences - file.shown_matches - (file.offset ?? 0)} remaining`,
                          ]
                      ),
                  ]
                : []),
        ]
    )
