import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./rc-ref.ts"

type ToParentMessage<ParentMessage> = (message: Demo.Message) => ParentMessage

type ButtonAttribute<ParentMessage> =
    Parameters<HtmlBuilder<ParentMessage>["button"]>[0] extends ReadonlyArray<
        infer Attribute
    >
        ? Attribute
        : never

type ButtonViewAttributes<ParentMessage> = Readonly<{
    button: ReadonlyArray<ButtonAttribute<ParentMessage>>
}>

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const panel = <ParentMessage>(
    title: string,
    children: ReadonlyArray<Html>,
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
                        [title]
                    ),
                ]
            ),
            ...children,
        ]
    )

const metric = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border border-border bg-background/70 p-3"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-[9px] font-semibold tracking-widest text-muted-foreground uppercase"
                    ),
                ],
                [label]
            ),
            h.div(
                [
                    h.Class(
                        "mt-1 whitespace-pre-wrap break-words font-mono text-xs font-semibold leading-5"
                    ),
                ],
                [value]
            ),
        ]
    )

const choice_button = <ParentMessage>(
    label: string,
    active: boolean,
    message: Demo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: active,
            toView: (attributes: ButtonViewAttributes<ParentMessage>) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            active
                                ? "rounded-[var(--radius-surface)] border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 font-mono text-xs font-semibold text-cyan-700"
                                : "rounded-[var(--radius-surface)] border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const stage_tabs = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
        ],
        Demo.stages.map((stage: Demo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        Demo.Message.SelectedRcRefStage({ stage })
                    ),
                    isDisabled: model.stage === stage,
                    toView: (attributes: ButtonViewAttributes<ParentMessage>) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    model.stage === stage
                                        ? "rounded-[var(--radius-surface)] bg-foreground px-3 py-2 text-xs font-semibold tracking-wider text-background uppercase"
                                        : "rounded-[var(--radius-surface)] px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                                ),
                            ],
                            [stage]
                        ),
                },
                h
            )
        )
    )

const intro_panel = <ParentMessage>(
    details: Demo.StageDetails,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.div(
                [h.Class("grid gap-0 lg:grid-cols-[1.05fr_0.95fr]")],
                [
                    h.div(
                        [h.Class("p-6")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "font-mono text-[10px] font-semibold tracking-[0.2em] text-cyan-600 uppercase"
                                    ),
                                ],
                                [details.eyebrow]
                            ),
                            h.h2(
                                [
                                    h.Class(
                                        "mt-2 text-2xl font-semibold tracking-tight"
                                    ),
                                ],
                                [details.title]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-3 text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [details.description]
                            ),
                            h.div(
                                [h.Class("mt-4 flex flex-wrap gap-2")],
                                details.apis.map((api: string) =>
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
                            ),
                        ]
                    ),
                    h.pre(
                        [
                            h.Class(
                                "overflow-x-auto border-t border-border bg-background/60 p-5 font-mono text-xs leading-5 lg:border-l lg:border-t-0"
                            ),
                        ],
                        [h.code([], [details.code])]
                    ),
                ]
            ),
        ]
    )

const options_for_stage = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    switch (model.stage) {
        case "Build":
            return panel(
                "Build lens",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Make", "Lazy", "Scope"] as const).map(
                            (value: Demo.BuildCase) =>
                                choice_button(
                                    value,
                                    model.buildCase === value,
                                    Demo.Message.SelectedRcRefBuildCase({
                                        buildCase: value,
                                    }),
                                    to_parent_message,
                                    h
                                )
                        )
                    ),
                ],
                h
            )

        case "Borrow":
            return panel(
                "Borrow lens",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Get", "Share", "Release"] as const).map(
                            (value: Demo.BorrowCase) =>
                                choice_button(
                                    value,
                                    model.borrowCase === value,
                                    Demo.Message.SelectedRcRefBorrowCase({
                                        borrowCase: value,
                                    }),
                                    to_parent_message,
                                    h
                                )
                        )
                    ),
                ],
                h
            )

        case "Idle":
            return panel(
                "Idle lens",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Zero", "Finite", "Reuse"] as const).map(
                            (value: Demo.IdleCase) =>
                                choice_button(
                                    value,
                                    model.idleCase === value,
                                    Demo.Message.SelectedRcRefIdleCase({
                                        idleCase: value,
                                    }),
                                    to_parent_message,
                                    h
                                )
                        )
                    ),
                ],
                h
            )

        case "Invalidate":
            return panel(
                "Invalidation lens",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Refresh", "Active", "Next"] as const).map(
                            (value: Demo.InvalidateCase) =>
                                choice_button(
                                    value,
                                    model.invalidateCase === value,
                                    Demo.Message.SelectedRcRefInvalidateCase({
                                        invalidateCase: value,
                                    }),
                                    to_parent_message,
                                    h
                                )
                        )
                    ),
                ],
                h
            )
    }
}

export const view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = Demo.stage_details[model.stage]

    const state = Demo.snapshot(model)

    return h.main(
        [h.Class("mx-auto grid w-full max-w-6xl gap-4 p-4 md:p-6")],
        [
            h.header(
                [
                    h.Class(
                        "grid gap-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 md:grid-cols-[1fr_auto] md:items-end"
                    ),
                ],
                [
                    h.div(
                        [],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "font-mono text-[10px] font-semibold tracking-[0.24em] text-cyan-600 uppercase"
                                    ),
                                ],
                                ["Effect v4 · scoped resource lifecycle"]
                            ),
                            h.h1(
                                [
                                    h.Class(
                                        "mt-2 text-3xl font-semibold tracking-tight"
                                    ),
                                ],
                                ["RcRef"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-2 max-w-2xl text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "One lazily acquired resource, shared by scoped borrowers, reference-counted automatically, optionally kept warm while idle, and refreshable with invalidate.",
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("flex flex-wrap justify-end gap-2")],
                        [
                            h.span(
                                [
                                    h.Class(
                                        "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                    ),
                                ],
                                ["5 public exports"]
                            ),
                            h.span(
                                [
                                    h.Class(
                                        "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                    ),
                                ],
                                ["reference counted"]
                            ),
                            h.span(
                                [
                                    h.Class(
                                        "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                    ),
                                ],
                                ["scope safe"]
                            ),
                        ]
                    ),
                ]
            ),

            stage_tabs(model, to_parent_message, h),

            intro_panel(details, h),

            h.div(
                [h.Class("grid gap-4 lg:grid-cols-[0.78fr_1.22fr]")],
                [
                    options_for_stage(model, to_parent_message, h),
                    panel(
                        "Runtime snapshot",
                        [
                            h.div(
                                [h.Class("grid gap-3 p-4 sm:grid-cols-2")],
                                [
                                    metric("Mode", state.mode, h),
                                    metric("Primary", state.primary, h),
                                    metric("Secondary", state.secondary, h),
                                    metric("Lifecycle", state.lifecycle, h),
                                    h.div(
                                        [h.Class("sm:col-span-2")],
                                        [metric("Gotcha", state.gotcha, h)]
                                    ),
                                ]
                            ),
                        ],
                        h
                    ),
                ]
            ),

            panel(
                "What to notice",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [details.notice]
                    ),
                ],
                h
            ),
        ]
    )
}
