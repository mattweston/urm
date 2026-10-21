import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./rc-map.ts"

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
        [h.Class(`rounded-[var(--radius-surface)] border p-3 ${toneClass}`)],
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
                        Demo.Message.SelectedRcMapStage({ stage })
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

const build_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = Demo.build_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-2")],
        [
            panel(
                "Construction",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Make", "Capacity", "State"] as const).map(
                                    (buildCase: Demo.BuildCase) =>
                                        choice_button(
                                            buildCase.toLowerCase(),
                                            model.buildCase === buildCase,
                                            Demo.Message.SelectedRcMapBuildCase(
                                                { buildCase }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("surface", snapshot.exports, h),
                            metric(
                                "State namespace",
                                snapshot.nested,
                                h,
                                "cyan"
                            ),
                            metric(
                                "default capacity",
                                snapshot.defaultCapacity,
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Defaults + state",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "default idle TTL",
                                snapshot.defaultTtl,
                                h,
                                "green"
                            ),
                            metric(
                                "bounded error",
                                snapshot.boundedError,
                                h,
                                "amber"
                            ),
                            metric(
                                "lifecycle state",
                                snapshot.state,
                                h,
                                "cyan"
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const acquire_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = Demo.acquire_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-2")],
        [
            panel(
                "Reference acquisition",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Lazy", "Share", "Scope"] as const).map(
                                    (acquireCase: Demo.AcquireCase) =>
                                        choice_button(
                                            acquireCase.toLowerCase(),
                                            model.acquireCase === acquireCase,
                                            Demo.Message.SelectedRcMapAcquireCase(
                                                { acquireCase }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("first get", snapshot.first, h, "cyan"),
                            metric("stored hit", snapshot.hit, h, "green"),
                            metric("in-flight sharing", snapshot.inFlight, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Scope semantics",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("references", snapshot.refs, h, "cyan"),
                            metric(
                                "last release",
                                snapshot.release,
                                h,
                                "green"
                            ),
                            metric("closed map", snapshot.closed, h, "amber"),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const retain_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = Demo.retain_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-2")],
        [
            panel(
                "Cached-only access",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Option", "Has", "Keys"] as const).map(
                                    (retainCase: Demo.RetainCase) =>
                                        choice_button(
                                            retainCase.toLowerCase(),
                                            model.retainCase === retainCase,
                                            Demo.Message.SelectedRcMapRetainCase(
                                                { retainCase }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("missing", snapshot.missing, h, "amber"),
                            metric("cached", snapshot.cached, h, "green"),
                            metric("shared failure", snapshot.failure, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Inspection",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("has", snapshot.has, h, "cyan"),
                            metric("keys", snapshot.keys, h, "green"),
                            metric(
                                "closed behavior",
                                snapshot.closed,
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

const lifecycle_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = Demo.lifecycle_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-2")],
        [
            panel(
                "Idle lifetime",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["TTL", "Touch", "Invalidate"] as const).map(
                                    (lifecycleCase: Demo.LifecycleCase) =>
                                        choice_button(
                                            lifecycleCase.toLowerCase(),
                                            model.lifecycleCase ===
                                                lifecycleCase,
                                            Demo.Message.SelectedRcMapLifecycleCase(
                                                { lifecycleCase }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("zero TTL", snapshot.zero, h, "amber"),
                            metric("finite TTL", snapshot.finite, h, "cyan"),
                            metric(
                                "infinite TTL",
                                snapshot.infinite,
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Keep / remove",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("touch", snapshot.touch, h, "cyan"),
                            metric(
                                "invalidate",
                                snapshot.invalidate,
                                h,
                                "green"
                            ),
                            metric(
                                "capacity interaction",
                                snapshot.capacity,
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

export const view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = Demo.stage_details[model.stage]

    const workspace =
        model.stage === "Build"
            ? build_view(model, to_parent_message, h)
            : model.stage === "Acquire"
              ? acquire_view(model, to_parent_message, h)
              : model.stage === "Retain"
                ? retain_view(model, to_parent_message, h)
                : lifecycle_view(model, to_parent_message, h)

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
                                        ["effect / RcMap"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Reference-counted keyed resources with scoped sharing and idle retention",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Acquire each keyed resource lazily, share in-flight and ready entries across scopes, keep idle resources alive by policy, and invalidate or inspect the map explicitly.",
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
                                        ["9 top-level exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["ref-counted sharing"]
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
            workspace,
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
