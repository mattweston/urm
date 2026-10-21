import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as FiberHandleDemo from "./fiber-handle.ts"

type ToParentMessage<ParentMessage> = (
    message: FiberHandleDemo.Message
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
    tone: "default" | "cyan" | "green" | "amber" | "red" = "default"
): Html => {
    const toneClass =
        tone === "cyan"
            ? "border-cyan-500/30 bg-cyan-500/5"
            : tone === "green"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : tone === "amber"
                ? "border-amber-500/30 bg-amber-500/5"
                : tone === "red"
                  ? "border-red-500/30 bg-red-500/5"
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
    message: FiberHandleDemo.Message,
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
    model: FiberHandleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect FiberHandle examples"),
        ],
        FiberHandleDemo.stages.map((stage: FiberHandleDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        FiberHandleDemo.Message.SelectedFiberHandleStage({
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
    details: FiberHandleDemo.StageDetails,
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

const manage_view = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    const snapshot = FiberHandleDemo.manage_snapshot()

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.8fr_1.2fr]")],
        [
            panel(
                "Lifecycle",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "isFiberHandle",
                                String(snapshot.isFiberHandle),
                                h,
                                "green"
                            ),
                            metric("initial", snapshot.initial, h),
                            metric(
                                "after run / getUnsafe",
                                snapshot.duringUnsafe,
                                h,
                                "cyan"
                            ),
                            metric(
                                "after run / get",
                                snapshot.duringEffectful,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Clear + scope state",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "after clear",
                                snapshot.afterClear,
                                h,
                                "green"
                            ),
                            metric(
                                "managed fiber interrupted",
                                String(snapshot.fiberInterrupted),
                                h,
                                "amber"
                            ),
                            metric(
                                "handle state inside scope",
                                snapshot.state,
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
                                    "clear interrupts the current managed fiber and empties the handle without closing it. The surrounding Scope owns final closure.",
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

const replace_view = <ParentMessage>(
    model: FiberHandleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = FiberHandleDemo.replace_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Policy",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                [
                                    choice_button(
                                        "replace",
                                        model.replaceMode === "Replace",
                                        FiberHandleDemo.Message.SelectedFiberHandleReplaceMode(
                                            {
                                                replaceMode: "Replace",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                    choice_button(
                                        "onlyIfMissing",
                                        model.replaceMode === "OnlyIfMissing",
                                        FiberHandleDemo.Message.SelectedFiberHandleReplaceMode(
                                            {
                                                replaceMode: "OnlyIfMissing",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                ]
                            ),
                            metric("policy", snapshot.policy, h, "cyan"),
                            metric(
                                "managed after second run",
                                snapshot.managedAfterSecond,
                                h
                            ),
                            metric(
                                "first is current",
                                String(snapshot.firstIsCurrent),
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Fiber outcomes",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "incoming interrupted",
                                        String(snapshot.incomingInterrupted),
                                        h,
                                        snapshot.incomingInterrupted
                                            ? "amber"
                                            : "green"
                                    ),
                                    metric(
                                        "first eventually interrupted",
                                        String(
                                            snapshot.firstEventuallyInterrupted
                                        ),
                                        h,
                                        "amber"
                                    ),
                                    metric(
                                        "second result",
                                        snapshot.secondResult,
                                        h,
                                        snapshot.secondResult === "second"
                                            ? "green"
                                            : "amber"
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
                                    model.replaceMode === "Replace"
                                        ? "The second fiber becomes the managed fiber immediately, and the first receives the handle's internal interruption."
                                        : "The existing first fiber stays installed. The attempted second fiber is returned already interrupted.",
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

const wait_view = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    const snapshot = FiberHandleDemo.wait_snapshot()

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-2")],
        [
            panel(
                "awaitEmpty",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "before completion",
                                snapshot.awaitEmptyBefore,
                                h,
                                "cyan"
                            ),
                            metric(
                                "awaitEmpty result",
                                snapshot.awaitEmptyResult,
                                h
                            ),
                            metric(
                                "after completion",
                                snapshot.awaitEmptyAfter,
                                h,
                                "green"
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "A normally successful managed fiber removes itself. awaitEmpty returns after that current fiber completes.",
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "join",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("join Exit", snapshot.joinExit, h, "amber"),
                            metric(
                                "typed error",
                                snapshot.joinTypedError,
                                h,
                                "amber"
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    'join listens for the handle\'s failure signal. A managed Effect.fail("boom") therefore causes join to fail with that typed error.',
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

const runtime_view = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    const snapshot = FiberHandleDemo.runtime_snapshot()

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-2")],
        [
            panel(
                "Captured runners",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "makeRuntime result",
                                String(snapshot.makeRuntimeResult),
                                h,
                                "green"
                            ),
                            metric(
                                "runtime(existing) result",
                                String(snapshot.runtimeExistingResult),
                                h,
                                "cyan"
                            ),
                            metric(
                                "replacement behavior",
                                snapshot.replacementSemantics,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Promise boundary",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "variants",
                                snapshot.promiseVariants,
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
                                    "The Promise runners resolve successes and reject with a squashed failure Cause. They use the same underlying runtime runner and one-fiber replacement policy.",
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

const notice_panel = <ParentMessage>(
    details: FiberHandleDemo.StageDetails,
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
    model: FiberHandleDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = FiberHandleDemo.stage_details[model.stage]

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
                                        ["effect / FiberHandle"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "One managed fiber, scoped replacement",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Track one fiber, replace or reject incoming work, distinguish waiting from failure propagation, and capture runners for imperative boundaries.",
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
                                        ["15 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["scope-owned"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["no explicit any"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            stage_tabs(model, to_parent_message, h),
            intro_panel(details, h),
            model.stage === "Manage"
                ? manage_view(h)
                : model.stage === "Replace"
                  ? replace_view(model, to_parent_message, h)
                  : model.stage === "Wait"
                    ? wait_view(h)
                    : runtime_view(h),
            notice_panel(details, h),
        ]
    )
}
