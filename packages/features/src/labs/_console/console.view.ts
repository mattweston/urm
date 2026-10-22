import * as Ui from "@foldkit/ui"
import { Array as Arr } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as ConsoleDemo from "./console.ts"

type ToParentMessage<ParentMessage> = (
    message: ConsoleDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const stage_button = <ParentMessage>(
    stage: ConsoleDemo.Stage,
    model: ConsoleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(
                ConsoleDemo.Message.SelectedConsoleStage({ stage })
            ),
            isDisabled: model.stage === stage,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            model.stage === stage
                                ? "rounded-[var(--radius-surface)] bg-foreground px-3 py-2 text-xs font-semibold tracking-wider text-background uppercase"
                                : "rounded-[var(--radius-surface)] px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground"
                        ),
                    ],
                    [stage]
                ),
        },
        h
    )

const stage_tabs = <ParentMessage>(
    model: ConsoleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Console examples"),
        ],
        [
            stage_button("Levels", model, to_parent_message, h),
            stage_button("Inspect", model, to_parent_message, h),
            stage_button("Counters", model, to_parent_message, h),
            stage_button("Scope", model, to_parent_message, h),
        ]
    )

const api_pills = <ParentMessage>(
    apis: ReadonlyArray<string>,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    apis.map((api) =>
        h.keyed("span")(
            api,
            [
                h.Class(
                    "rounded-full border border-cyan-500/30 bg-cyan-500/5 px-2.5 py-1 font-mono text-[10px] text-cyan-600"
                ),
            ],
            [api]
        )
    )

const run_button = <ParentMessage>(
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(
                ConsoleDemo.Message.ClickedRunConsoleDemo()
            ),
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            "rounded-[var(--radius-surface)] bg-foreground px-4 py-2 text-xs font-semibold tracking-wider text-background uppercase transition-opacity hover:opacity-85"
                        ),
                    ],
                    ["Run program"]
                ),
        },
        h
    )

const clear_button = <ParentMessage>(
    model: ConsoleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(
                ConsoleDemo.Message.ClickedClearConsoleOutput()
            ),
            isDisabled: Arr.isArrayEmpty(model.entries),
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground disabled:cursor-default disabled:opacity-35"
                        ),
                    ],
                    ["Clear"]
                ),
        },
        h
    )

const program_panel = <ParentMessage>(
    details: ConsoleDemo.StageDetails,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.header(
                [
                    h.Class(
                        "flex flex-col gap-4 border-b-(length:--surface-border-width) border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
                    ),
                ],
                [
                    h.div(
                        [h.Class("min-w-0")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "text-[10px] font-semibold tracking-[0.18em] text-cyan-600 uppercase"
                                    ),
                                ],
                                [details.eyebrow]
                            ),
                            h.h3(
                                [
                                    h.Class(
                                        "mt-1 text-base font-semibold tracking-tight"
                                    ),
                                ],
                                [details.title]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-2 max-w-2xl text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [details.description]
                            ),
                        ]
                    ),
                    run_button(to_parent_message, h),
                ]
            ),
            h.div(
                [h.Class("p-4")],
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-x-auto rounded-[var(--radius-surface)] border border-border bg-background p-4"
                            ),
                        ],
                        [
                            h.code(
                                [
                                    h.Class(
                                        "font-mono text-xs leading-6 text-foreground"
                                    ),
                                ],
                                [details.code]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("mt-4 flex flex-wrap gap-2")],
                        api_pills(details.apis, h)
                    ),
                ]
            ),
        ]
    )

const entry_tone = (kind: ConsoleDemo.EntryKind): string => {
    if (kind === "Error" || kind === "Assert") {
        return "border-red-500/30 bg-red-500/5 text-red-600"
    }

    if (kind === "Warn") {
        return "border-amber-500/30 bg-amber-500/5 text-amber-600"
    }

    if (kind === "Info") {
        return "border-blue-500/30 bg-blue-500/5 text-blue-600"
    }

    if (kind === "Debug") {
        return "border-violet-500/30 bg-violet-500/5 text-violet-600"
    }

    if (kind === "Count") {
        return "border-emerald-500/30 bg-emerald-500/5 text-emerald-600"
    }

    if (kind === "Group" || kind === "Timer") {
        return "border-cyan-500/30 bg-cyan-500/5 text-cyan-600"
    }

    if (kind === "Table" || kind === "Inspect") {
        return "border-fuchsia-500/30 bg-fuchsia-500/5 text-fuchsia-600"
    }

    return "border-border bg-muted/40 text-muted-foreground"
}

const entry_view = <ParentMessage>(
    entry: ConsoleDemo.ConsoleEntry,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.keyed("div")(
        entry.id,
        [
            h.Class(
                "grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0"
            ),
        ],
        [
            h.span(
                [
                    h.Class(
                        `h-fit rounded border px-2 py-1 text-center font-mono text-[9px] font-semibold tracking-wider uppercase ${entry_tone(entry.kind)}`
                    ),
                ],
                [entry.kind]
            ),
            h.code(
                [
                    h.Class(
                        "min-w-0 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-foreground"
                    ),
                ],
                [`${"  ".repeat(entry.depth)}${entry.value}`]
            ),
        ]
    )

const terminal_panel = <ParentMessage>(
    model: ConsoleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.header(
                [
                    h.Class(
                        "flex items-center justify-between gap-4 border-b-(length:--surface-border-width) border-border px-5 py-3"
                    ),
                ],
                [
                    h.div(
                        [h.Class("flex min-w-0 items-center gap-3")],
                        [
                            h.div(
                                [h.Class("flex gap-1.5"), h.AriaHidden(true)],
                                [
                                    h.span([
                                        h.Class(
                                            "size-2.5 rounded-full bg-red-500/70"
                                        ),
                                    ]),
                                    h.span([
                                        h.Class(
                                            "size-2.5 rounded-full bg-amber-500/70"
                                        ),
                                    ]),
                                    h.span([
                                        h.Class(
                                            "size-2.5 rounded-full bg-emerald-500/70"
                                        ),
                                    ]),
                                ]
                            ),
                            h.h3(
                                [
                                    h.Class(
                                        "truncate font-mono text-xs font-semibold text-muted-foreground"
                                    ),
                                ],
                                ["captured Console service"]
                            ),
                        ]
                    ),
                    clear_button(model, to_parent_message, h),
                ]
            ),
            Arr.isArrayEmpty(model.entries)
                ? h.div(
                      [
                          h.Class(
                              "grid min-h-80 place-items-center px-8 py-12 text-center"
                          ),
                      ],
                      [
                          h.div(
                              [h.Class("max-w-sm")],
                              [
                                  h.div(
                                      [
                                          h.Class(
                                              "font-mono text-xs font-semibold text-cyan-600"
                                          ),
                                      ],
                                      ["awaiting Effect"]
                                  ),
                                  h.p(
                                      [
                                          h.Class(
                                              "mt-2 text-sm leading-6 text-muted-foreground"
                                          ),
                                      ],
                                      [
                                          "Run the selected program. Its Console service calls will be captured and returned as a Foldkit Message.",
                                      ]
                                  ),
                              ]
                          ),
                      ]
                  )
                : h.div(
                      [h.Class("min-h-80 bg-background/40")],
                      model.entries.map((entry) => entry_view(entry, h))
                  ),
        ]
    )

const service_boundary = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.div(
                [
                    h.Class(
                        "grid gap-0 md:grid-cols-[1fr_auto_1fr] md:items-stretch"
                    ),
                ],
                [
                    h.div(
                        [h.Class("p-5")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                    ),
                                ],
                                ["your program"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-2 font-mono text-sm font-semibold"
                                    ),
                                ],
                                ["Effect<void>"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-2 text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Calls Console.log, Console.table, Console.group, and friends without owning a concrete console.",
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid place-items-center border-y border-border px-5 py-3 font-mono text-xs text-cyan-600 md:border-x md:border-y-0"
                            ),
                        ],
                        ["provideService →"]
                    ),
                    h.div(
                        [h.Class("p-5")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                    ),
                                ],
                                ["active service"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-2 font-mono text-sm font-semibold"
                                    ),
                                ],
                                ["Console.Console"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-2 text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "The demo injects a capture implementation. Production normally uses the default global console automatically.",
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

const notice_panel = <ParentMessage>(
    details: ConsoleDemo.StageDetails,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.header(
                [
                    h.Class(
                        "border-b-(length:--surface-border-width) border-border px-5 py-3"
                    ),
                ],
                [
                    h.h3(
                        [
                            h.Class(
                                "text-xs font-semibold tracking-widest uppercase"
                            ),
                        ],
                        ["What to notice"]
                    ),
                ]
            ),
            h.p(
                [h.Class("px-5 py-4 text-sm leading-6 text-muted-foreground")],
                [details.notice]
            ),
        ]
    )

export const view = <ParentMessage>(
    model: ConsoleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = ConsoleDemo.stage_details[model.stage]

    return h.div(
        [h.Class("space-y-5")],
        [
            h.section(
                [h.Class(PANEL_CLASS)],
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("max-w-3xl")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-[10px] font-semibold tracking-[0.2em] text-cyan-600 uppercase"
                                            ),
                                        ],
                                        ["effect / Console"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        ["Console as an Effect service"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Run real Effect Console programs against an injected capture service and watch the calls come back through the Foldkit Model.",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "flex flex-wrap gap-2 lg:justify-end"
                                    ),
                                ],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["default service"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["scoped cleanup"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["testable"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            stage_tabs(model, to_parent_message, h),
            service_boundary(h),
            h.div(
                [h.Class("grid gap-5 xl:grid-cols-2")],
                [
                    program_panel(details, to_parent_message, h),
                    terminal_panel(model, to_parent_message, h),
                ]
            ),
            notice_panel(details, h),
        ]
    )
}
