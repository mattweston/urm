import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as LayerRefDemo from "./layer-ref.ts"

type ToParentMessage<ParentMessage> = (
    message: LayerRefDemo.Message
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
    message: LayerRefDemo.Message,
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
    model: LayerRefDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect LayerRef examples"),
        ],
        LayerRefDemo.stages.map((stage: LayerRefDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        LayerRefDemo.Message.SelectedLayerRefStage({ stage })
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
    details: LayerRefDemo.StageDetails,
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

const build_label = (value: LayerRefDemo.BuildCase): string =>
    value.toLowerCase()

const build_view = <ParentMessage>(
    model: LayerRefDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = LayerRefDemo.build_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Construction",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Lazy", "Preload", "Schedule"] as const).map(
                                    (buildCase: LayerRefDemo.BuildCase) =>
                                        choice_button(
                                            build_label(buildCase),
                                            model.buildCase === buildCase,
                                            LayerRefDemo.Message.SelectedLayerRefBuildCase(
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
                                "acquisition",
                                snapshot.acquisition,
                                h,
                                "cyan"
                            ),
                            metric("preload", snapshot.preload, h),
                            metric(
                                "constructor error",
                                snapshot.constructorError,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Lifecycle options",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("idleTimeToLive", snapshot.idle, h, "green"),
                            metric(
                                "invalidationSchedule",
                                snapshot.scheduledAction,
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
                                    "The same LayerRef can be purely lazy, eagerly preloaded, periodically invalidated, or periodically refreshed depending on the option combination.",
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

const access_label = (value: LayerRefDemo.AccessCase): string =>
    value.toLowerCase()

const access_view = <ParentMessage>(
    model: LayerRefDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = LayerRefDemo.access_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Access surface",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Layer", "Context", "Reuse"] as const).map(
                                    (accessCase: LayerRefDemo.AccessCase) =>
                                        choice_button(
                                            access_label(accessCase),
                                            model.accessCase === accessCase,
                                            LayerRefDemo.Message.SelectedLayerRefAccessCase(
                                                {
                                                    accessCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("get", snapshot.get, h, "cyan"),
                            metric(
                                "contextEffect",
                                snapshot.context,
                                h,
                                "green"
                            ),
                            metric("rcRef", snapshot.cache, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Reference counting",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("borrow scope", snapshot.scope, h, "cyan"),
                            metric("reuse", snapshot.reuse, h, "green"),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Both access paths borrow from the same RcRef cache. The Layer form integrates with Effect.provide; contextEffect exposes the built Context directly.",
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

const invalidate_label = (value: LayerRefDemo.InvalidateCase): string =>
    value.toLowerCase()

const invalidate_view = <ParentMessage>(
    model: LayerRefDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = LayerRefDemo.invalidate_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.75fr_1.25fr]")],
        [
            panel(
                "Refresh mode",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Invalidate",
                                        "Refresh",
                                        "Borrowed",
                                    ] as const
                                ).map(
                                    (
                                        invalidateCase: LayerRefDemo.InvalidateCase
                                    ) =>
                                        choice_button(
                                            invalidate_label(invalidateCase),
                                            model.invalidateCase ===
                                                invalidateCase,
                                            LayerRefDemo.Message.SelectedLayerRefInvalidateCase(
                                                {
                                                    invalidateCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "invalidate",
                                snapshot.invalidate,
                                h,
                                "amber"
                            ),
                            metric("refresh", snapshot.refresh, h, "cyan"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Generation handoff",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "current borrowers",
                                snapshot.currentBorrowers,
                                h,
                                "green"
                            ),
                            metric(
                                "later borrowers",
                                snapshot.laterBorrowers,
                                h,
                                "cyan"
                            ),
                            metric(
                                "generation story",
                                snapshot.generationStory,
                                h
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Refresh is stronger than invalidate: it immediately performs a fresh acquisition after invalidating, while invalidate alone defers rebuilding until the next access.",
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

const service_label = (value: LayerRefDemo.ServiceCase): string =>
    value.toLowerCase()

const service_view = <ParentMessage>(
    model: LayerRefDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = LayerRefDemo.service_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Service class",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Wrapper", "Layers", "Helpers"] as const).map(
                                    (serviceCase: LayerRefDemo.ServiceCase) =>
                                        choice_button(
                                            service_label(serviceCase),
                                            model.serviceCase === serviceCase,
                                            LayerRefDemo.Message.SelectedLayerRefServiceCase(
                                                {
                                                    serviceCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("TagClass", snapshot.classShape, h, "cyan"),
                            metric("layers", snapshot.layers, h),
                            metric(
                                "static helpers",
                                snapshot.helpers,
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Helper types",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("get", snapshot.getType, h, "cyan"),
                            metric("refresh", snapshot.refreshType, h, "green"),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "The generated class is itself a service tag for LayerRef<I, E>. Its static helpers access that service and forward to the underlying cached reference.",
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
    details: LayerRefDemo.StageDetails,
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
    model: LayerRefDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = LayerRefDemo.stage_details[model.stage]

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
                                        ["effect / LayerRef"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "One refreshable, reference-counted Layer context",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Build one Layer into a cached Context, borrow it through a Layer or scoped Effect, invalidate or refresh the cache safely, and optionally expose the whole reference as a Context service.",
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
                                        ["4 public exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["RcRef-backed"]
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
                : model.stage === "Access"
                  ? access_view(model, to_parent_message, h)
                  : model.stage === "Invalidate"
                    ? invalidate_view(model, to_parent_message, h)
                    : service_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
