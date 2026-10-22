import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as LayerMapDemo from "./layer-map.ts"

type ToParentMessage<ParentMessage> = (
    message: LayerMapDemo.Message
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
    message: LayerMapDemo.Message,
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
    model: LayerMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect LayerMap examples"),
        ],
        LayerMapDemo.stages.map((stage: LayerMapDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        LayerMapDemo.Message.SelectedLayerMapStage({ stage })
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
    details: LayerMapDemo.StageDetails,
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
    model: LayerMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = LayerMapDemo.build_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Constructor",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Dynamic", "Record", "Preload"] as const).map(
                                    (buildCase: LayerMapDemo.BuildCase) =>
                                        choice_button(
                                            buildCase.toLowerCase(),
                                            model.buildCase === buildCase,
                                            LayerMapDemo.Message.SelectedLayerMapBuildCase(
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
                            metric("key space", snapshot.keySpace, h),
                            metric("preload", snapshot.preload, h, "green"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Cache policy",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("idleTimeToLive", snapshot.ttl, h, "cyan"),
                            metric("result type", snapshot.resultType, h),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Dynamic lookup can compute both the layer and TTL from the key. fromRecord derives a finite key union from the record and can preload every entry with preload: true.",
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

const access_view = <ParentMessage>(
    model: LayerMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = LayerMapDemo.access_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Access mode",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Layer", "Context", "CachedOnly"] as const
                                ).map((accessCase: LayerMapDemo.AccessCase) =>
                                    choice_button(
                                        accessCase === "CachedOnly"
                                            ? "cached only"
                                            : accessCase.toLowerCase(),
                                        model.accessCase === accessCase,
                                        LayerMapDemo.Message.SelectedLayerMapAccessCase(
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
                            metric(
                                "contextEffectOption",
                                snapshot.cachedOnly,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Retention semantics",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("scope", snapshot.scope, h, "cyan"),
                            metric(
                                "missing key",
                                snapshot.missingBehavior,
                                h,
                                model.accessCase === "CachedOnly"
                                    ? "amber"
                                    : "green"
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "get is ideal for Effect.provide. contextEffect exposes the built Context directly. contextEffectOption is the non-building probe when callers only want a currently cached entry.",
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

const cache_view = <ParentMessage>(
    model: LayerMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = LayerMapDemo.cache_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.75fr_1.25fr]")],
        [
            panel(
                "Cache lifecycle",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Miss", "Invalidate", "IdleTTL"] as const
                                ).map((cacheCase: LayerMapDemo.CacheCase) =>
                                    choice_button(
                                        cacheCase === "IdleTTL"
                                            ? "idle TTL"
                                            : cacheCase.toLowerCase(),
                                        model.cacheCase === cacheCase,
                                        LayerMapDemo.Message.SelectedLayerMapCacheCase(
                                            {
                                                cacheCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("before", snapshot.before, h, "amber"),
                            metric(
                                "after acquire",
                                snapshot.afterAcquire,
                                h,
                                "green"
                            ),
                            metric(
                                "after invalidate",
                                snapshot.afterInvalidate,
                                h,
                                "cyan"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "What happens next",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "next acquire",
                                snapshot.nextAcquire,
                                h,
                                "green"
                            ),
                            metric("idle rule", snapshot.idleRule, h, "cyan"),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Invalidation removes the cache entry immediately. If that resource is still retained by an active scope, cleanup waits for those references to finish; a later lookup gets a fresh entry.",
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

const service_view = <ParentMessage>(
    model: LayerMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = LayerMapDemo.service_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Generated service",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Wrapper", "Layers", "Types"] as const).map(
                                    (serviceCase: LayerMapDemo.ServiceCase) =>
                                        choice_button(
                                            serviceCase.toLowerCase(),
                                            model.serviceCase === serviceCase,
                                            LayerMapDemo.Message.SelectedLayerMapServiceCase(
                                                {
                                                    serviceCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "service class",
                                snapshot.service,
                                h,
                                "cyan"
                            ),
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
                "Type surface",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "namespace helpers",
                                snapshot.typeHelpers,
                                h,
                                "cyan"
                            ),
                            metric(
                                "keyed layer example",
                                snapshot.keyExample,
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
                                    "Service is convenient when the keyed cache itself should be a dependency. Consumers can ask the class for a keyed Layer without first manually retrieving the LayerMap value.",
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
    details: LayerMapDemo.StageDetails,
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
    model: LayerMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = LayerMapDemo.stage_details[model.stage]

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
                                        ["effect / LayerMap"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Scoped keyed caches built from Layers",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Build service contexts on demand from keys, reuse them through a reference-counted cache, invalidate or expire idle entries, and package the map itself as a Context service.",
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
                                        ["10 public entries"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["RcMap-backed"]
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
                  : model.stage === "Cache"
                    ? cache_view(model, to_parent_message, h)
                    : service_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
