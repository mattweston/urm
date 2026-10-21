import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./platform-error.ts"

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
    h: HtmlBuilder<ParentMessage>,
    tone: "default" | "cyan" | "green" | "amber" = "default"
): Html => {
    const toneClass =
        tone === "cyan"
            ? "border-cyan-500/30 bg-cyan-500/5"
            : tone === "green"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : tone === "amber"
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-border bg-background/70"

    return h.div(
        [
            h.Class(
                `min-w-0 rounded-[var(--radius-surface)] border p-3 ${toneClass}`
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
}

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
                                : "rounded-[var(--radius-surface)] border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
            h.AriaLabel("Effect PlatformError examples"),
        ],
        Demo.stages.map((stage: Demo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        Demo.Message.SelectedPlatformErrorStage({ stage })
                    ),
                    isDisabled: model.stage === stage,
                    toView: (attributes: ButtonViewAttributes<ParentMessage>) =>
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
        )
    )

const api_pills = <ParentMessage>(
    apis: ReadonlyArray<string>,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    apis.map((api: string) =>
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
                                        "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [details.description]
                            ),
                            h.div(
                                [h.Class("mt-4 flex flex-wrap gap-2")],
                                api_pills(details.apis, h)
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

const reason_label = (value: Demo.ReasonCase): string =>
    value === "BadArgument"
        ? "bad argument"
        : value === "SystemError"
          ? "system error"
          : "tags"

const reason_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = Demo.reason_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Reason models",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "BadArgument",
                                        "SystemError",
                                        "Tags",
                                    ] as const
                                ).map((reasonCase: Demo.ReasonCase) =>
                                    choice_button(
                                        reason_label(reasonCase),
                                        model.reasonCase === reasonCase,
                                        Demo.Message.SelectedPlatformErrorReasonCase(
                                            {
                                                reasonCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric(
                                "BadArgument _tag",
                                snapshot.badTag,
                                h,
                                "cyan"
                            ),
                            metric("module", snapshot.badModule, h),
                            metric("method", snapshot.badMethod, h, "green"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "System normalization",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "SystemError _tag",
                                snapshot.systemTag,
                                h,
                                "amber"
                            ),
                            metric("path / descriptor", snapshot.systemPath, h),
                            metric(
                                "tag count",
                                String(snapshot.tagCount),
                                h,
                                "cyan"
                            ),
                            metric(
                                "normalized tags",
                                snapshot.tags,
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const wrap_label = (value: Demo.WrapCase): string =>
    value === "BadArgument"
        ? "bad argument"
        : value === "SystemError"
          ? "system error"
          : "shape"

const wrap_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = Demo.wrap_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Outer wrapper",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "BadArgument",
                                        "SystemError",
                                        "Shape",
                                    ] as const
                                ).map((wrapCase: Demo.WrapCase) =>
                                    choice_button(
                                        wrap_label(wrapCase),
                                        model.wrapCase === wrapCase,
                                        Demo.Message.SelectedPlatformErrorWrapCase(
                                            {
                                                wrapCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric(
                                "bad outer _tag",
                                snapshot.outerBad,
                                h,
                                "cyan"
                            ),
                            metric(
                                "bad reason _tag",
                                snapshot.innerBad,
                                h,
                                "green"
                            ),
                            metric(
                                "system outer _tag",
                                snapshot.outerSystem,
                                h,
                                "cyan"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Reason inside wrapper",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "system reason _tag",
                                snapshot.innerSystem,
                                h,
                                "amber"
                            ),
                            metric("reason field", snapshot.reasonModel, h),
                            metric(
                                "wrapper forwards reason.message",
                                String(snapshot.messageForwarded),
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const message_label = (value: Demo.MessageCase): string =>
    value === "BadArgument"
        ? "bad argument"
        : value === "SystemError"
          ? "system error"
          : "details"

const message_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = Demo.message_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Formatted messages",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "BadArgument",
                                        "SystemError",
                                        "Details",
                                    ] as const
                                ).map((messageCase: Demo.MessageCase) =>
                                    choice_button(
                                        message_label(messageCase),
                                        model.messageCase === messageCase,
                                        Demo.Message.SelectedPlatformErrorMessageCase(
                                            {
                                                messageCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric(
                                "BadArgument reason",
                                snapshot.badReason,
                                h,
                                "cyan"
                            ),
                            metric(
                                "SystemError reason",
                                snapshot.systemReason,
                                h,
                                "amber"
                            ),
                            metric(
                                "wrapped BadArgument",
                                snapshot.wrappedBad,
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Structured details remain available",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "wrapped SystemError",
                                snapshot.wrappedSystem,
                                h,
                                "green"
                            ),
                            metric("syscall", snapshot.syscall, h, "cyan"),
                            metric("path / descriptor", snapshot.path, h),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const effect_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = Demo.effect_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Typed failure",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Fail", "Recover", "Inspect"] as const).map(
                                    (effectCase: Demo.EffectCase) =>
                                        choice_button(
                                            effectCase.toLowerCase(),
                                            model.effectCase === effectCase,
                                            Demo.Message.SelectedPlatformErrorEffectCase(
                                                {
                                                    effectCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "error channel",
                                snapshot.errorChannel,
                                h,
                                "cyan"
                            ),
                            metric("outer _tag", snapshot.outerTag, h, "green"),
                            metric(
                                "reason _tag",
                                snapshot.reasonTag,
                                h,
                                "amber"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Recovery boundary",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("recover", snapshot.recovery, h, "green"),
                            metric("inspect", snapshot.inspect, h, "cyan"),
                            metric(
                                "current platform uses",
                                snapshot.realUses,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const notice_panel = <ParentMessage>(
    details: Demo.StageDetails,
    h: HtmlBuilder<ParentMessage>
): Html =>
    panel(
        "What to notice",
        [
            h.p(
                [h.Class("px-5 py-4 text-sm leading-6 text-muted-foreground")],
                [details.notice]
            ),
        ],
        h
    )

export const view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = Demo.stage_details[model.stage]

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
                                        ["effect / PlatformError"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Normalized platform failures behind one typed wrapper",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Distinguish invalid caller input from host failures, normalize operating-system categories, preserve operation context, and carry everything through one PlatformError in the Effect error channel.",
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
                                        ["6 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["reason wrapper"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["strict typing"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            stage_tabs(model, to_parent_message, h),
            intro_panel(details, h),
            model.stage === "Reason"
                ? reason_view(model, to_parent_message, h)
                : model.stage === "Wrap"
                  ? wrap_view(model, to_parent_message, h)
                  : model.stage === "Message"
                    ? message_view(model, to_parent_message, h)
                    : effect_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
