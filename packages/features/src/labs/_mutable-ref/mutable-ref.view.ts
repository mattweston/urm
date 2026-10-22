import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as MutableRefDemo from "./mutable-ref.ts"

type ToParentMessage<ParentMessage> = (
    message: MutableRefDemo.Message
) => ParentMessage

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
    message: MutableRefDemo.Message,
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
    model: MutableRefDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect MutableRef examples"),
        ],
        MutableRefDemo.stages.map((stage: MutableRefDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        MutableRefDemo.Message.SelectedMutableRefStage({
                            stage,
                        })
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
    details: MutableRefDemo.StageDetails,
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

const create_view = <ParentMessage>(
    model: MutableRefDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = MutableRefDemo.create_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Reference",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Make", "Current", "GetSet"] as const).map(
                                    (createCase: MutableRefDemo.CreateCase) =>
                                        choice_button(
                                            createCase === "GetSet"
                                                ? "get / set"
                                                : createCase.toLowerCase(),
                                            model.createCase === createCase,
                                            MutableRefDemo.Message.SelectedMutableRefCreateCase(
                                                {
                                                    createCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("initial", String(snapshot.initial), h),
                            metric(
                                "direct .current read",
                                String(snapshot.directRead),
                                h,
                                "cyan"
                            ),
                            metric(
                                "direct .current write",
                                String(snapshot.directWrite),
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Helper behavior",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "MutableRef.get",
                                String(snapshot.helperRead),
                                h,
                                "cyan"
                            ),
                            metric(
                                "set returns same ref",
                                String(snapshot.sameReference),
                                h,
                                "green"
                            ),
                            metric("final", String(snapshot.final), h),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "MutableRef is just one stable mutable reference object. Direct current access and the helper functions operate on the same value.",
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

const update_view = <ParentMessage>(
    model: MutableRefDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = MutableRefDemo.update_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Return semantics",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Set", "OldValue", "NewValue"] as const).map(
                                    (updateCase: MutableRefDemo.UpdateCase) =>
                                        choice_button(
                                            updateCase === "OldValue"
                                                ? "old value"
                                                : updateCase === "NewValue"
                                                  ? "new value"
                                                  : "set",
                                            model.updateCase === updateCase,
                                            MutableRefDemo.Message.SelectedMutableRefUpdateCase(
                                                {
                                                    updateCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("start", String(snapshot.start), h),
                            metric(
                                "set returns ref",
                                String(snapshot.setReturnsRef),
                                h,
                                "green"
                            ),
                            metric(
                                "after set",
                                String(snapshot.afterSet),
                                h,
                                "cyan"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Old vs new value",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "getAndSet returns",
                                        String(snapshot.getAndSetOld),
                                        h,
                                        "amber"
                                    ),
                                    metric(
                                        "setAndGet returns",
                                        String(snapshot.setAndGetNew),
                                        h,
                                        "green"
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "getAndUpdate returns",
                                        String(snapshot.getAndUpdateOld),
                                        h,
                                        "amber"
                                    ),
                                    metric(
                                        "updateAndGet returns",
                                        String(snapshot.updateAndGetNew),
                                        h,
                                        "green"
                                    ),
                                ]
                            ),
                            metric("final", String(snapshot.final), h, "cyan"),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const numeric_view = <ParentMessage>(
    model: MutableRefDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = MutableRefDemo.numeric_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Numeric helpers",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Increment",
                                        "Decrement",
                                        "Toggle",
                                    ] as const
                                ).map(
                                    (numericCase: MutableRefDemo.NumericCase) =>
                                        choice_button(
                                            numericCase.toLowerCase(),
                                            model.numericCase === numericCase,
                                            MutableRefDemo.Message.SelectedMutableRefNumericCase(
                                                {
                                                    numericCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("start", String(snapshot.start), h),
                            metric(
                                "getAndIncrement → old",
                                String(snapshot.postIncrementOld),
                                h,
                                "amber"
                            ),
                            metric(
                                "after post-increment",
                                String(snapshot.afterPostIncrement),
                                h
                            ),
                            metric(
                                "incrementAndGet → new",
                                String(snapshot.preIncrementNew),
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Decrement + toggle",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "getAndDecrement → old",
                                        String(snapshot.postDecrementOld),
                                        h,
                                        "amber"
                                    ),
                                    metric(
                                        "decrementAndGet → new",
                                        String(snapshot.preDecrementNew),
                                        h,
                                        "green"
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "increment returns ref",
                                        String(snapshot.incrementReturnsRef),
                                        h
                                    ),
                                    metric(
                                        "decrement returns ref",
                                        String(snapshot.decrementReturnsRef),
                                        h
                                    ),
                                ]
                            ),
                            metric(
                                "toggle",
                                `${snapshot.toggleBefore} → ${snapshot.toggleAfter}`,
                                h,
                                "cyan"
                            ),
                            metric(
                                "toggle returns ref",
                                String(snapshot.toggleReturnsRef),
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

const compare_view = <ParentMessage>(
    model: MutableRefDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = MutableRefDemo.compare_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Expected-value match",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Match", "Miss", "Structural"] as const).map(
                                    (compareCase: MutableRefDemo.CompareCase) =>
                                        choice_button(
                                            compareCase.toLowerCase(),
                                            model.compareCase === compareCase,
                                            MutableRefDemo.Message.SelectedMutableRefCompareCase(
                                                {
                                                    compareCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "different object references",
                                String(snapshot.distinctExpected),
                                h
                            ),
                            metric(
                                "Equal.equals",
                                String(snapshot.equalExpected),
                                h,
                                "green"
                            ),
                            metric(
                                "same hash",
                                String(snapshot.sameHash),
                                h,
                                "cyan"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "compareAndSet",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "first compareAndSet",
                                String(snapshot.firstSucceeded),
                                h,
                                "green"
                            ),
                            metric(
                                "after first",
                                snapshot.afterFirst,
                                h,
                                "cyan"
                            ),
                            metric(
                                "stale expected value",
                                String(snapshot.secondSucceeded),
                                h,
                                "amber"
                            ),
                            metric("after miss", snapshot.afterSecond, h),
                            metric("matching rule", snapshot.rule, h),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const notice_panel = <ParentMessage>(
    details: MutableRefDemo.StageDetails,
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
    model: MutableRefDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = MutableRefDemo.stage_details[model.stage]

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
                                        ["effect / MutableRef"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Synchronous mutable state with explicit return-value semantics",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Store one current value, replace or transform it in place, choose whether helpers return the ref / old value / new value, use numeric and boolean shortcuts, and conditionally swap with Effect equality.",
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
                                        ["17 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["synchronous state"]
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
            model.stage === "Create"
                ? create_view(model, to_parent_message, h)
                : model.stage === "Update"
                  ? update_view(model, to_parent_message, h)
                  : model.stage === "Numeric"
                    ? numeric_view(model, to_parent_message, h)
                    : compare_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
