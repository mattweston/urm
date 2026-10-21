import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as FiberMapDemo from "./fiber-map.ts"

type ToParentMessage<ParentMessage> = (
    message: FiberMapDemo.Message
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
    message: FiberMapDemo.Message,
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
    model: FiberMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect FiberMap examples"),
        ],
        FiberMapDemo.stages.map((stage: FiberMapDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        FiberMapDemo.Message.SelectedFiberMapStage({ stage })
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
    details: FiberMapDemo.StageDetails,
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
    const snapshot = FiberMapDemo.manage_snapshot()

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.8fr_1.2fr]")],
        [
            panel(
                "Live keys",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "isFiberMap",
                                        String(snapshot.isFiberMap),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "initial size",
                                        String(snapshot.initialSize),
                                        h
                                    ),
                                    metric(
                                        "running size",
                                        String(snapshot.runningSize),
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "iterated keys",
                                        snapshot.iteratedKeys,
                                        h
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("grid grid-cols-3 gap-3")],
                                [
                                    metric(
                                        "has search",
                                        String(snapshot.hasSearch),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "has autosave",
                                        String(snapshot.hasAutosave),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "get search",
                                        snapshot.getSearch,
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
            panel(
                "Remove one → clear all",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "size after remove(search)",
                                        String(snapshot.afterRemoveSize),
                                        h
                                    ),
                                    metric(
                                        "search interrupted",
                                        String(snapshot.searchInterrupted),
                                        h,
                                        "amber"
                                    ),
                                    metric(
                                        "autosave still present",
                                        String(snapshot.autosaveStillPresent),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "size after clear",
                                        String(snapshot.afterClearSize),
                                        h,
                                        "green"
                                    ),
                                ]
                            ),
                            metric(
                                "autosave interrupted",
                                String(snapshot.autosaveInterrupted),
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
                                    "remove targets one key. clear interrupts every remaining managed fiber. Both rely on completion observers to remove entries from the map.",
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
    model: FiberMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = FiberMapDemo.replace_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Same-key policy",
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
                                        FiberMapDemo.Message.SelectedFiberMapReplaceMode(
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
                                        FiberMapDemo.Message.SelectedFiberMapReplaceMode(
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
                            metric("managed search", snapshot.managedSearch, h),
                            metric(
                                "map size with autosave",
                                String(snapshot.sizeWithSibling),
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Key isolation",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "first search interrupted",
                                        String(snapshot.firstInterrupted),
                                        h,
                                        snapshot.firstInterrupted
                                            ? "amber"
                                            : "green"
                                    ),
                                    metric(
                                        "incoming interrupted",
                                        String(snapshot.incomingInterrupted),
                                        h,
                                        snapshot.incomingInterrupted
                                            ? "amber"
                                            : "green"
                                    ),
                                    metric(
                                        "autosave still present",
                                        String(snapshot.siblingStillPresent),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "incoming result",
                                        snapshot.replacementResult,
                                        h
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
                                    "The autosave key is unaffected by search replacement. FiberMap scopes replacement to the occupied key rather than the whole collection.",
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
    const snapshot = FiberMapDemo.wait_snapshot()

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
                                "size before",
                                String(snapshot.beforeSize),
                                h,
                                "cyan"
                            ),
                            metric("result", snapshot.awaitEmptyResult, h),
                            metric(
                                "size after",
                                String(snapshot.afterEmptySize),
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
                                    "Both keyed fibers complete and auto-remove. awaitEmpty returns only when no managed fibers remain.",
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
                                    "A reportable failure from any managed key completes the shared failure Deferred, so join fails with that error.",
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
    const snapshot = FiberMapDemo.runtime_snapshot()

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-2")],
        [
            panel(
                "Key-aware runtime",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "makeRuntime key a",
                                        String(snapshot.makeRuntimeA),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "makeRuntime key b",
                                        String(snapshot.makeRuntimeB),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "runtime(existing) key c",
                                        String(snapshot.runtimeExisting),
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "distinct keys",
                                        snapshot.distinctKeys,
                                        h
                                    ),
                                ]
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
                                    "Promise runners take the same key + Effect shape. Success resolves with A; failure rejects with Cause.squash. Same-key replacement rules are unchanged.",
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
    details: FiberMapDemo.StageDetails,
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
    model: FiberMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = FiberMapDemo.stage_details[model.stage]

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
                                        ["effect / FiberMap"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        ["Keyed fibers with scoped ownership"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Run unrelated keys concurrently, replace work only within an occupied key, wait for an empty map or propagated failure, and capture key-aware runners.",
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
                                        ["19 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["one fiber / key"]
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
