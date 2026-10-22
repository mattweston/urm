import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as MutableHashMapDemo from "./mutable-hash-map.ts"

type ToParentMessage<ParentMessage> = (
    message: MutableHashMapDemo.Message
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
    message: MutableHashMapDemo.Message,
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
    model: MutableHashMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect MutableHashMap examples"),
        ],
        MutableHashMapDemo.stages.map((stage: MutableHashMapDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        MutableHashMapDemo.Message.SelectedMutableHashMapStage({
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
    details: MutableHashMapDemo.StageDetails,
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
    model: MutableHashMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = MutableHashMapDemo.create_snapshot(model)

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
                                (["Empty", "Make", "Iterable"] as const).map(
                                    (
                                        createCase: MutableHashMapDemo.CreateCase
                                    ) =>
                                        choice_button(
                                            createCase.toLowerCase(),
                                            model.createCase === createCase,
                                            MutableHashMapDemo.Message.SelectedMutableHashMapCreateCase(
                                                {
                                                    createCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "empty size",
                                String(snapshot.emptySize),
                                h,
                                "cyan"
                            ),
                            metric(
                                "isMutableHashMap",
                                String(snapshot.guard),
                                h,
                                "green"
                            ),
                            metric("identity", snapshot.identity, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Created entries",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("make", snapshot.made, h, "green"),
                            metric(
                                "fromIterable",
                                snapshot.iterable,
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
                                    "All constructors produce a mutable map that is itself iterable over [key, value] entries.",
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

const lookup_view = <ParentMessage>(
    model: MutableHashMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = MutableHashMapDemo.lookup_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Read mode",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Get", "Iterate", "Size"] as const).map(
                                    (
                                        lookupCase: MutableHashMapDemo.LookupCase
                                    ) =>
                                        choice_button(
                                            lookupCase.toLowerCase(),
                                            model.lookupCase === lookupCase,
                                            MutableHashMapDemo.Message.SelectedMutableHashMapLookupCase(
                                                {
                                                    lookupCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("get beta", snapshot.hit, h, "green"),
                            metric("get missing", snapshot.miss, h, "amber"),
                            metric(
                                "has alpha",
                                String(snapshot.has),
                                h,
                                "cyan"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Iterable views",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("keys", snapshot.keys, h),
                            metric("values", snapshot.values, h),
                            metric("entries", snapshot.entries, h, "cyan"),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "size",
                                        String(snapshot.size),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "isEmpty",
                                        String(snapshot.empty),
                                        h
                                    ),
                                ]
                            ),
                            metric(
                                "forEach(value, key)",
                                snapshot.forEachOrder,
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

const mutate_label = (value: MutableHashMapDemo.MutateCase): string =>
    value === "ModifyAt"
        ? "modifyAt"
        : value === "RemoveClear"
          ? "remove + clear"
          : value.toLowerCase()

const mutate_view = <ParentMessage>(
    model: MutableHashMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = MutableHashMapDemo.mutate_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Mutation",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Set",
                                        "Modify",
                                        "ModifyAt",
                                        "RemoveClear",
                                    ] as const
                                ).map(
                                    (
                                        mutateCase: MutableHashMapDemo.MutateCase
                                    ) =>
                                        choice_button(
                                            mutate_label(mutateCase),
                                            model.mutateCase === mutateCase,
                                            MutableHashMapDemo.Message.SelectedMutableHashMapMutateCase(
                                                {
                                                    mutateCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("before", snapshot.before, h),
                            metric("after", snapshot.after, h, "cyan"),
                            metric(
                                "same reference",
                                String(snapshot.sameReference),
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Optional-value behavior",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "modify missing",
                                snapshot.missingModify,
                                h,
                                "amber"
                            ),
                            metric(
                                "modifyAt insert",
                                snapshot.modifyAtInsert,
                                h,
                                "green"
                            ),
                            metric(
                                "modifyAt remove",
                                snapshot.modifyAtRemove,
                                h
                            ),
                            metric(
                                "clear keeps instance + empties",
                                String(snapshot.clearSameReference),
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

const equality_view = <ParentMessage>(
    model: MutableHashMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = MutableHashMapDemo.equality_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Key semantics",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Primitive",
                                        "Structural",
                                        "Reference",
                                    ] as const
                                ).map(
                                    (
                                        equalityCase: MutableHashMapDemo.EqualityCase
                                    ) =>
                                        choice_button(
                                            equalityCase.toLowerCase(),
                                            model.equalityCase === equalityCase,
                                            MutableHashMapDemo.Message.SelectedMutableHashMapEqualityCase(
                                                {
                                                    equalityCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("primitive keys", snapshot.primitive, h),
                            metric(
                                "equal UserId lookup",
                                snapshot.structuralHit,
                                h,
                                "green"
                            ),
                            metric(
                                "different UserId lookup",
                                snapshot.different,
                                h,
                                "amber"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Equal / Hash contract",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "Equal.equals",
                                String(snapshot.equal),
                                h,
                                "green"
                            ),
                            metric(
                                "same hash",
                                String(snapshot.hashEqual),
                                h,
                                "cyan"
                            ),
                            metric(
                                "key stability",
                                snapshot.warning,
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
                                    'A distinct UserId("42") finds the value stored under another UserId("42") because the key implements compatible Equal and Hash behavior.',
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
    details: MutableHashMapDemo.StageDetails,
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
    model: MutableHashMapDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = MutableHashMapDemo.stage_details[model.stage]

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
                                        ["effect / MutableHashMap"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "In-place key/value updates with Effect-aware equality",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Create and iterate a mutable map, read through Option, update the same instance in place, and use custom Equal / Hash keys for value-based lookup.",
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
                                        ["in-place mutation"]
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
                : model.stage === "Lookup"
                  ? lookup_view(model, to_parent_message, h)
                  : model.stage === "Mutate"
                    ? mutate_view(model, to_parent_message, h)
                    : equality_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
