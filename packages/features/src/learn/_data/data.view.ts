import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as DataDemo from "./data.ts"

type ToParentMessage<ParentMessage> = (
    message: DataDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const stage_button = <ParentMessage>(
    stage: DataDemo.Stage,
    model: DataDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(
                DataDemo.Message.SelectedDataStage({ stage })
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
    model: DataDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Data examples"),
        ],
        DataDemo.stages.map((stage) =>
            stage_button(stage, model, to_parent_message, h)
        )
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
    const tone_class =
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
                `min-w-0 rounded-[var(--radius-surface)] border p-3 ${tone_class}`
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
                        "mt-1 break-words font-mono text-xs font-semibold leading-5"
                    ),
                ],
                [value]
            ),
        ]
    )
}

const choice_button = <ParentMessage>(
    label: string,
    is_active: boolean,
    message: DataDemo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: is_active,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            is_active
                                ? "rounded-[var(--radius-surface)] border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 font-mono text-xs font-semibold text-cyan-700"
                                : "rounded-[var(--radius-surface)] border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const intro_panel = <ParentMessage>(
    details: DataDemo.StageDetails,
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

const class_view = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    const snapshot = DataDemo.class_snapshot()

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-2")],
        [
            panel(
                "Data.Class",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid gap-3 sm:grid-cols-2")],
                                [
                                    metric("person A", snapshot.personA, h),
                                    metric("person B", snapshot.personB, h),
                                    metric(
                                        "Equal.equals(A, B)",
                                        String(snapshot.equalSameFields),
                                        h,
                                        snapshot.equalSameFields
                                            ? "green"
                                            : "amber"
                                    ),
                                    metric(
                                        "different fields equal?",
                                        String(snapshot.equalDifferentFields),
                                        h,
                                        snapshot.equalDifferentFields
                                            ? "amber"
                                            : "green"
                                    ),
                                ]
                            ),
                            metric(
                                ".pipe(...) result",
                                snapshot.pipeResult,
                                h,
                                "cyan"
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Instances carry readonly domain fields and Pipeable behavior. Equality compares the value shape rather than object identity.",
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Data.TaggedClass",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "constructed value",
                                snapshot.taggedValue,
                                h
                            ),
                            metric("owned _tag", snapshot.taggedTag, h, "cyan"),
                            h.div(
                                [
                                    h.Class(
                                        "grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[var(--radius-surface)] border border-border bg-background/60 p-4"
                                    ),
                                ],
                                [
                                    h.code(
                                        [h.Class("font-mono text-xs")],
                                        ["{ name, role }"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "h-px bg-gradient-to-r from-border via-cyan-500/50 to-border"
                                            ),
                                        ],
                                        []
                                    ),
                                    h.code(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold text-cyan-600"
                                            ),
                                        ],
                                        ["_tag: Person"]
                                    ),
                                ]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "The constructor never asks for _tag. TaggedClass installs the discriminator on every instance.",
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const enum_view = <ParentMessage>(
    model: DataDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = DataDemo.enum_snapshot(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "Choose a variant",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            choice_button(
                                "Idle",
                                model.enumVariant === "Idle",
                                DataDemo.Message.SelectedDataEnumVariant({
                                    variant: "Idle",
                                }),
                                to_parent_message,
                                h
                            ),
                            choice_button(
                                "Loading",
                                model.enumVariant === "Loading",
                                DataDemo.Message.SelectedDataEnumVariant({
                                    variant: "Loading",
                                }),
                                to_parent_message,
                                h
                            ),
                            choice_button(
                                "Success",
                                model.enumVariant === "Success",
                                DataDemo.Message.SelectedDataEnumVariant({
                                    variant: "Success",
                                }),
                                to_parent_message,
                                h
                            ),
                            choice_button(
                                "Failure",
                                model.enumVariant === "Failure",
                                DataDemo.Message.SelectedDataEnumVariant({
                                    variant: "Failure",
                                }),
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            h.div(
                [h.Class("grid gap-5 xl:grid-cols-[0.9fr_1.1fr]")],
                [
                    panel(
                        "Constructed value",
                        [
                            h.div(
                                [h.Class("space-y-3 p-5")],
                                [
                                    metric("_tag", snapshot.tag, h, "cyan"),
                                    metric("value", snapshot.value, h),
                                    metric(
                                        "runtime form",
                                        snapshot.constructorKind,
                                        h
                                    ),
                                ]
                            ),
                        ],
                        h
                    ),
                    panel(
                        "Guard + match",
                        [
                            h.div(
                                [h.Class("grid gap-3 p-5 sm:grid-cols-2")],
                                [
                                    metric(
                                        `$is("${model.enumVariant}")`,
                                        String(snapshot.selectedGuard),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        '$is("Success")',
                                        String(snapshot.successGuard),
                                        h,
                                        snapshot.successGuard
                                            ? "green"
                                            : "default"
                                    ),
                                    h.div(
                                        [h.Class("sm:col-span-2")],
                                        [
                                            metric(
                                                "$match(...) result",
                                                snapshot.matchResult,
                                                h,
                                                "cyan"
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ],
                        h
                    ),
                ]
            ),
            panel(
                "What the helper generated",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 p-5 text-center md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            metric("constructor", `.${snapshot.tag}(...)`, h),
                            h.div(
                                [h.Class("font-mono text-xs text-cyan-600")],
                                ["→"]
                            ),
                            metric("plain value", snapshot.value, h),
                            h.div(
                                [h.Class("font-mono text-xs text-cyan-600")],
                                ["→"]
                            ),
                            metric(
                                "exhaustive branch",
                                snapshot.matchResult,
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

const errors_view = <ParentMessage>(
    model: DataDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = DataDemo.error_snapshot(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "Choose an error",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            choice_button(
                                "Network",
                                model.errorVariant === "Network",
                                DataDemo.Message.SelectedDataErrorVariant({
                                    variant: "Network",
                                }),
                                to_parent_message,
                                h
                            ),
                            choice_button(
                                "NotFound",
                                model.errorVariant === "NotFound",
                                DataDemo.Message.SelectedDataErrorVariant({
                                    variant: "NotFound",
                                }),
                                to_parent_message,
                                h
                            ),
                            choice_button(
                                "Forbidden",
                                model.errorVariant === "Forbidden",
                                DataDemo.Message.SelectedDataErrorVariant({
                                    variant: "Forbidden",
                                }),
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            h.div(
                [h.Class("grid gap-5 xl:grid-cols-2")],
                [
                    panel(
                        "Yield into Effect",
                        [
                            h.div(
                                [h.Class("grid gap-3 p-5 sm:grid-cols-2")],
                                [
                                    metric("class", snapshot.className, h),
                                    metric("_tag", snapshot.tag, h, "cyan"),
                                    metric(
                                        "Effect.exit",
                                        snapshot.exitTag,
                                        h,
                                        "amber"
                                    ),
                                    metric(
                                        "message",
                                        snapshot.message || "(empty)",
                                        h
                                    ),
                                ]
                            ),
                        ],
                        h
                    ),
                    panel(
                        "Tag-based recovery",
                        [
                            h.div(
                                [h.Class("space-y-3 p-5")],
                                [
                                    metric(
                                        "catchTag available?",
                                        String(snapshot.catchTagAvailable),
                                        h,
                                        snapshot.catchTagAvailable
                                            ? "green"
                                            : "amber"
                                    ),
                                    metric(
                                        "result",
                                        snapshot.recovered,
                                        h,
                                        snapshot.catchTagAvailable
                                            ? "cyan"
                                            : "default"
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            snapshot.catchTagAvailable
                                                ? "TaggedError carries the discriminator that Effect.catchTag uses for selective recovery."
                                                : "Data.Error is still yieldable, but intentionally has no _tag for tag-based discrimination.",
                                        ]
                                    ),
                                ]
                            ),
                        ],
                        h
                    ),
                ]
            ),
        ]
    )
}

const generics_view = <ParentMessage>(
    model: DataDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = DataDemo.generic_snapshot(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "Instantiate the generic union",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            choice_button(
                                "Success<number>",
                                model.genericVariant === "Success",
                                DataDemo.Message.SelectedDataGenericVariant({
                                    variant: "Success",
                                }),
                                to_parent_message,
                                h
                            ),
                            choice_button(
                                "Failure<string>",
                                model.genericVariant === "Failure",
                                DataDemo.Message.SelectedDataGenericVariant({
                                    variant: "Failure",
                                }),
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            h.div(
                [h.Class("grid gap-5 xl:grid-cols-[1.1fr_0.9fr]")],
                [
                    panel(
                        "Type flow",
                        [
                            h.div(
                                [h.Class("space-y-3 p-5")],
                                [
                                    metric(
                                        "WithGenerics<2> → Kind",
                                        snapshot.appliedKind,
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        `Args<..., "${snapshot.tag}">`,
                                        snapshot.argsType,
                                        h
                                    ),
                                    metric(
                                        `Value<..., "${snapshot.tag}">`,
                                        snapshot.valueType,
                                        h
                                    ),
                                ]
                            ),
                        ],
                        h
                    ),
                    panel(
                        "Runtime stays simple",
                        [
                            h.div(
                                [h.Class("space-y-3 p-5")],
                                [
                                    metric("value", snapshot.value, h),
                                    metric(
                                        `$is("${snapshot.tag}")`,
                                        String(snapshot.guard),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "$match(...) result",
                                        snapshot.matchResult,
                                        h,
                                        "cyan"
                                    ),
                                ]
                            ),
                        ],
                        h
                    ),
                ]
            ),
            panel(
                "Compile-time machinery, tiny runtime objects",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "WithGenerics, Kind, Args, Value, and Constructor exist to preserve precise TypeScript relationships. The runtime constructor still returns the same small {_tag, ...fields} object.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const notice_panel = <ParentMessage>(
    details: DataDemo.StageDetails,
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
    model: DataDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = DataDemo.stage_details[model.stage]

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
                                        ["effect / Data"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        ["Small immutable domain data"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Compare value classes, closed tagged unions, yieldable domain errors, and the type machinery behind generic variants.",
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
                                        ["readonly fields"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["_tag narrowing"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["yieldable errors"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            stage_tabs(model, to_parent_message, h),
            intro_panel(details, h),
            model.stage === "Class"
                ? class_view(h)
                : model.stage === "Enum"
                  ? enum_view(model, to_parent_message, h)
                  : model.stage === "Errors"
                    ? errors_view(model, to_parent_message, h)
                    : generics_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
