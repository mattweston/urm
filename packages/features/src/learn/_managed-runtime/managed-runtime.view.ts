import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as ManagedRuntimeDemo from "./managed-runtime.ts"

type ToParentMessage<ParentMessage> = (
    message: ManagedRuntimeDemo.Message
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
    message: ManagedRuntimeDemo.Message,
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
    model: ManagedRuntimeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect ManagedRuntime examples"),
        ],
        ManagedRuntimeDemo.stages.map((stage: ManagedRuntimeDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        ManagedRuntimeDemo.Message.SelectedManagedRuntimeStage({
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
    details: ManagedRuntimeDemo.StageDetails,
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

const build_view = <ParentMessage>(
    model: ManagedRuntimeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = ManagedRuntimeDemo.build_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Runtime construction",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Make", "Context", "Types"] as const).map(
                                    (buildCase: ManagedRuntimeDemo.BuildCase) =>
                                        choice_button(
                                            buildCase.toLowerCase(),
                                            model.buildCase === buildCase,
                                            ManagedRuntimeDemo.Message.SelectedManagedRuntimeBuildCase(
                                                {
                                                    buildCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "constructor",
                                snapshot.constructor,
                                h,
                                "cyan"
                            ),
                            metric("input Layer", snapshot.layerRequirement, h),
                            metric("guard", snapshot.guard, h, "green"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Context surface",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "contextEffect",
                                snapshot.contextEffect,
                                h,
                                "cyan"
                            ),
                            metric(
                                "context()",
                                snapshot.contextPromise,
                                h,
                                "green"
                            ),
                            metric("type helpers", snapshot.typeHelpers, h),
                            metric(
                                "Foldkit boundary",
                                snapshot.foldkitBoundary,
                                h,
                                "amber"
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const run_label = (value: ManagedRuntimeDemo.RunCase): string =>
    value === "FiberCallback" ? "fiber + callback" : value.toLowerCase()

const run_view = <ParentMessage>(
    model: ManagedRuntimeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = ManagedRuntimeDemo.run_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Runner family",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Promise",
                                        "Sync",
                                        "FiberCallback",
                                    ] as const
                                ).map((runCase: ManagedRuntimeDemo.RunCase) =>
                                    choice_button(
                                        run_label(runCase),
                                        model.runCase === runCase,
                                        ManagedRuntimeDemo.Message.SelectedManagedRuntimeRunCase(
                                            {
                                                runCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("runPromise", snapshot.promise, h, "green"),
                            metric("runSync", snapshot.sync, h, "cyan"),
                            metric("Exit variants", snapshot.exit, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Imperative bridges",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("runFork", snapshot.fork, h, "cyan"),
                            metric("runCallback", snapshot.callback, h),
                            metric(
                                "service / error rule",
                                snapshot.serviceRule,
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

const cache_view = <ParentMessage>(
    model: ManagedRuntimeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = ManagedRuntimeDemo.cache_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Lazy build",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Lazy", "Reuse", "MemoMap"] as const).map(
                                    (cacheCase: ManagedRuntimeDemo.CacheCase) =>
                                        choice_button(
                                            cacheCase === "MemoMap"
                                                ? "memo map"
                                                : cacheCase.toLowerCase(),
                                            model.cacheCase === cacheCase,
                                            ManagedRuntimeDemo.Message.SelectedManagedRuntimeCacheCase(
                                                {
                                                    cacheCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("first use", snapshot.firstUse, h, "cyan"),
                            metric("build Fiber", snapshot.buildFiber, h),
                            metric("later use", snapshot.laterUse, h, "green"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Reuse strategy",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "cachedContext",
                                snapshot.cachedContext,
                                h,
                                "green"
                            ),
                            metric(
                                "shared MemoMap",
                                snapshot.sharedMemo,
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
                                    "The ManagedRuntime test suite verifies both build-once reuse inside one runtime and a shared MemoMap build across two different runtimes.",
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

const dispose_label = (value: ManagedRuntimeDemo.DisposeCase): string =>
    value === "AsyncDispose" ? "async dispose" : value.toLowerCase()

const dispose_view = <ParentMessage>(
    model: ManagedRuntimeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = ManagedRuntimeDemo.dispose_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.75fr_1.25fr]")],
        [
            panel(
                "Shutdown API",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Promise",
                                        "Effect",
                                        "AsyncDispose",
                                    ] as const
                                ).map(
                                    (
                                        disposeCase: ManagedRuntimeDemo.DisposeCase
                                    ) =>
                                        choice_button(
                                            dispose_label(disposeCase),
                                            model.disposeCase === disposeCase,
                                            ManagedRuntimeDemo.Message.SelectedManagedRuntimeDisposeCase(
                                                {
                                                    disposeCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("dispose", snapshot.promise, h, "cyan"),
                            metric("disposeEffect", snapshot.effect, h),
                            metric(
                                "Symbol.asyncDispose",
                                snapshot.asyncDispose,
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "After shutdown",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "runtime state",
                                snapshot.afterDispose,
                                h,
                                "amber"
                            ),
                            metric(
                                "tracked fibers",
                                snapshot.fibers,
                                h,
                                "cyan"
                            ),
                            metric("type guard", snapshot.guard, h),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const notice_panel = <ParentMessage>(
    details: ManagedRuntimeDemo.StageDetails,
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
    model: ManagedRuntimeDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = ManagedRuntimeDemo.stage_details[model.stage]

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
                                        ["effect / ManagedRuntime"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Build services once, run Effects many times, dispose once",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Turn a top-level Layer into a reusable imperative Effect runtime. In a Foldkit app, this complements—not replaces—the Foldkit Runtime that owns Model/init/update/view and rendering.",
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
                                        ["5 public entries"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["lazy Layer build"]
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
            model.stage === "Build"
                ? build_view(model, to_parent_message, h)
                : model.stage === "Run"
                  ? run_view(model, to_parent_message, h)
                  : model.stage === "Cache"
                    ? cache_view(model, to_parent_message, h)
                    : dispose_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
