import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as HashMapDemo from "./hash-map.ts"

type ToParentMessage<ParentMessage> = (
    message: HashMapDemo.Message
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
    message: HashMapDemo.Message,
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
    model: HashMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect HashMap examples"),
        ],
        HashMapDemo.stages.map((stage: HashMapDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        HashMapDemo.Message.SelectedHashMapStage({ stage })
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
    details: HashMapDemo.StageDetails,
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

const build_label = (buildCase: HashMapDemo.BuildCase): string =>
    buildCase === "StructuralKeys" ? "structural keys" : buildCase.toLowerCase()

const build_view = <ParentMessage>(
    model: HashMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = HashMapDemo.build_snapshot(model)

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
                                (
                                    [
                                        "Construct",
                                        "StructuralKeys",
                                        "Iterate",
                                    ] as const
                                ).map((buildCase: HashMapDemo.BuildCase) =>
                                    choice_button(
                                        build_label(buildCase),
                                        model.buildCase === buildCase,
                                        HashMapDemo.Message.SelectedHashMapBuildCase(
                                            {
                                                buildCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            h.div(
                                [h.Class("grid grid-cols-3 gap-3")],
                                [
                                    metric(
                                        "size",
                                        String(snapshot.size),
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "isEmpty",
                                        String(snapshot.empty),
                                        h
                                    ),
                                    metric(
                                        "isHashMap",
                                        String(snapshot.isHashMap),
                                        h,
                                        "green"
                                    ),
                                ]
                            ),
                            metric("entries", snapshot.entries, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Hash + iteration semantics",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric("keys", snapshot.keys, h),
                                    metric("values", snapshot.values, h),
                                ]
                            ),
                            metric(
                                "fresh equal object lookup",
                                snapshot.structuralLookup,
                                h,
                                model.buildCase === "StructuralKeys"
                                    ? "green"
                                    : "default"
                            ),
                            metric(
                                "structural hash match",
                                String(snapshot.structuralHashMatch),
                                h,
                                model.buildCase === "StructuralKeys"
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
                                    model.buildCase === "StructuralKeys"
                                        ? "A fresh object with the same fields can locate the stored key because Effect Hash and Equal use compatible structural semantics. Treat hashed objects as immutable after hashing."
                                        : "HashMap exposes iterators directly and convenience array conversions when eager entries or values are easier to process.",
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

const lookup_label = (lookupCase: HashMapDemo.LookupCase): string =>
    lookupCase === "Prehashed" ? "pre-hashed" : lookupCase.toLowerCase()

const lookup_view = <ParentMessage>(
    model: HashMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = HashMapDemo.lookup_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Lookup mode",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Safe", "Prehashed", "Search"] as const).map(
                                    (lookupCase: HashMapDemo.LookupCase) =>
                                        choice_button(
                                            lookup_label(lookupCase),
                                            model.lookupCase === lookupCase,
                                            HashMapDemo.Message.SelectedHashMapLookupCase(
                                                {
                                                    lookupCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "get existing",
                                snapshot.getExisting,
                                h,
                                "green"
                            ),
                            metric("get missing", snapshot.getMissing, h),
                            metric(
                                "getUnsafe known key",
                                String(snapshot.unsafeExisting),
                                h,
                                "cyan"
                            ),
                            metric(
                                "has(errors)",
                                String(snapshot.hasExisting),
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Hash + predicate lookup",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "Hash.string(downloads)",
                                        snapshot.hash,
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "getHash",
                                        snapshot.getHash,
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "hasHash",
                                        String(snapshot.hasHash),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "hasBy value > 200",
                                        String(snapshot.hasBy),
                                        h
                                    ),
                                ]
                            ),
                            metric("findFirst", snapshot.findFirst, h),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "some(value = 3)",
                                        String(snapshot.some),
                                        h
                                    ),
                                    metric(
                                        "every(value > 0)",
                                        String(snapshot.every),
                                        h,
                                        "green"
                                    ),
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

const transform_label = (transformCase: HashMapDemo.TransformCase): string =>
    transformCase.toLowerCase()

const transform_view = <ParentMessage>(
    model: HashMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = HashMapDemo.transform_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Transformation",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Update",
                                        "Filter",
                                        "Combine",
                                        "Fold",
                                    ] as const
                                ).map(
                                    (
                                        transformCase: HashMapDemo.TransformCase
                                    ) =>
                                        choice_button(
                                            transform_label(transformCase),
                                            model.transformCase ===
                                                transformCase,
                                            HashMapDemo.Message.SelectedHashMapTransformCase(
                                                {
                                                    transformCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("original", snapshot.original, h),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "original size",
                                        String(snapshot.originalSize),
                                        h
                                    ),
                                    metric(
                                        "result size",
                                        String(snapshot.resultSize),
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
                "Derived immutable map",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("result", snapshot.result, h, "green"),
                            metric("detail", snapshot.detail, h, "cyan"),
                            metric("aggregate / rule", snapshot.aggregate, h),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    model.transformCase === "Update"
                                        ? "The original map is untouched while the derived result applies set, modifyAt, setMany, and removeMany."
                                        : model.transformCase === "Filter"
                                          ? "filter preserves values, filterMap can change values while dropping failures, and compact removes None values."
                                          : model.transformCase === "Combine"
                                            ? "union lets the right map overwrite equal keys; flatMap expands each entry into another HashMap and flattens the result."
                                            : "map preserves keys while changing values; reduce and forEach consume entries without changing the map.",
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

const batch_label = (batchCase: HashMapDemo.BatchCase): string =>
    batchCase === "Mutate" ? "mutate helper" : "manual window"

const batch_view = <ParentMessage>(
    model: HashMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = HashMapDemo.batch_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Transient window",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Mutate", "Manual"] as const).map(
                                    (batchCase: HashMapDemo.BatchCase) =>
                                        choice_button(
                                            batch_label(batchCase),
                                            model.batchCase === batchCase,
                                            HashMapDemo.Message.SelectedHashMapBatchCase(
                                                {
                                                    batchCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("original", snapshot.original, h),
                            metric("result", snapshot.result, h, "green"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Identity + immutability",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "original size",
                                        String(snapshot.originalSize),
                                        h
                                    ),
                                    metric(
                                        "result size",
                                        String(snapshot.resultSize),
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "set returns same transient",
                                        String(snapshot.sameTransientAfterSet),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "endMutation returns same transient",
                                        String(snapshot.finalizedSameObject),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "original has a",
                                        String(snapshot.originalHasA),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "result has a",
                                        String(snapshot.resultHasA),
                                        h,
                                        "amber"
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
                                    "The transient can reuse internal HAMT nodes for a batch, while the original persistent HashMap remains unchanged and independently usable.",
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
    details: HashMapDemo.StageDetails,
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
    model: HashMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = HashMapDemo.stage_details[model.stage]

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
                                        ["effect / HashMap"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Persistent key/value storage with Effect hashing",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Build immutable HAMTs, inspect safe and pre-hashed lookup paths, derive maps with transformation helpers, then open short transient windows for efficient batched updates.",
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
                                        ["40 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["HAMT + structural keys"]
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
            model.stage === "Build"
                ? build_view(model, to_parent_message, h)
                : model.stage === "Lookup"
                  ? lookup_view(model, to_parent_message, h)
                  : model.stage === "Transform"
                    ? transform_view(model, to_parent_message, h)
                    : batch_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
