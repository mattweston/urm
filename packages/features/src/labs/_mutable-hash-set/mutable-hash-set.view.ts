import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as MutableHashSetDemo from "./mutable-hash-set.ts"

type ToParentMessage<ParentMessage> = (
    message: MutableHashSetDemo.Message
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
    message: MutableHashSetDemo.Message,
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
    model: MutableHashSetDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect MutableHashSet examples"),
        ],
        MutableHashSetDemo.stages.map((stage: MutableHashSetDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        MutableHashSetDemo.Message.SelectedMutableHashSetStage({
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
    details: MutableHashSetDemo.StageDetails,
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
    model: MutableHashSetDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = MutableHashSetDemo.create_snapshot(model)

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
                                        createCase: MutableHashSetDemo.CreateCase
                                    ) =>
                                        choice_button(
                                            createCase.toLowerCase(),
                                            model.createCase === createCase,
                                            MutableHashSetDemo.Message.SelectedMutableHashSetCreateCase(
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
                                "isMutableHashSet",
                                String(snapshot.guard),
                                h,
                                "green"
                            ),
                            metric("backing", snapshot.backing, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Uniqueness during construction",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "make values",
                                snapshot.madeValues,
                                h,
                                "green"
                            ),
                            metric("make size", String(snapshot.madeSize), h),
                            metric(
                                'fromIterable("hello")',
                                snapshot.iterableValues,
                                h,
                                "cyan"
                            ),
                            metric(
                                "iterable size",
                                String(snapshot.iterableSize),
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

const membership_view = <ParentMessage>(
    model: MutableHashSetDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = MutableHashSetDemo.membership_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Membership",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Has", "Iterate", "Size"] as const).map(
                                    (
                                        membershipCase: MutableHashSetDemo.MembershipCase
                                    ) =>
                                        choice_button(
                                            membershipCase.toLowerCase(),
                                            model.membershipCase ===
                                                membershipCase,
                                            MutableHashSetDemo.Message.SelectedMutableHashSetMembershipCase(
                                                {
                                                    membershipCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "has apple",
                                String(snapshot.apple),
                                h,
                                "green"
                            ),
                            metric(
                                "has grape",
                                String(snapshot.grape),
                                h,
                                "amber"
                            ),
                            metric("size", String(snapshot.size), h, "cyan"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "JavaScript iteration",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("Array.from", snapshot.iterable, h, "cyan"),
                            metric("spread", snapshot.spread, h),
                            metric(
                                "three duplicates",
                                `size = ${snapshot.duplicateSize}`,
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
                                    "The set itself is Iterable<V>, so standard JavaScript spread, Array.from, and for...of work directly.",
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

const mutate_view = <ParentMessage>(
    model: MutableHashSetDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = MutableHashSetDemo.mutate_snapshot(model)

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
                                (["Add", "Remove", "Clear"] as const).map(
                                    (
                                        mutateCase: MutableHashSetDemo.MutateCase
                                    ) =>
                                        choice_button(
                                            mutateCase.toLowerCase(),
                                            model.mutateCase === mutateCase,
                                            MutableHashSetDemo.Message.SelectedMutableHashSetMutateCase(
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
                            metric("after add 4", snapshot.afterAdd, h, "cyan"),
                            metric(
                                "add returns same set",
                                String(snapshot.addSameReference),
                                h,
                                "green"
                            ),
                            metric(
                                "duplicate keeps size",
                                String(snapshot.duplicateSizeStable),
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Remove + clear",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "after remove 1",
                                snapshot.afterRemove,
                                h,
                                "cyan"
                            ),
                            metric(
                                "missing remove keeps size",
                                String(snapshot.missingRemoveStable),
                                h
                            ),
                            metric(
                                "clear returns same set",
                                String(snapshot.clearSameReference),
                                h,
                                "green"
                            ),
                            metric(
                                "final size",
                                String(snapshot.finalSize),
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

const equality_label = (value: MutableHashSetDemo.EqualityCase): string =>
    value === "EqualHash" ? "Equal + Hash" : value.toLowerCase()

const equality_view = <ParentMessage>(
    model: MutableHashSetDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = MutableHashSetDemo.equality_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Uniqueness rule",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Primitive",
                                        "EqualHash",
                                        "Duplicates",
                                    ] as const
                                ).map(
                                    (
                                        equalityCase: MutableHashSetDemo.EqualityCase
                                    ) =>
                                        choice_button(
                                            equality_label(equalityCase),
                                            model.equalityCase === equalityCase,
                                            MutableHashSetDemo.Message.SelectedMutableHashSetEqualityCase(
                                                {
                                                    equalityCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("primitive values", snapshot.primitive, h),
                            metric(
                                "different references",
                                String(snapshot.distinctObjects),
                                h,
                                "cyan"
                            ),
                            metric(
                                "Equal.equals",
                                String(snapshot.equal),
                                h,
                                "green"
                            ),
                            metric(
                                "same hash",
                                String(snapshot.sameHash),
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Set result",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "size after duplicate",
                                String(snapshot.sizeAfterDuplicate),
                                h,
                                "green"
                            ),
                            metric(
                                "lookup equal object",
                                String(snapshot.equalLookup),
                                h,
                                "cyan"
                            ),
                            metric(
                                "lookup different object",
                                String(snapshot.differentLookup),
                                h,
                                "amber"
                            ),
                            metric("key stability", snapshot.warning, h),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const notice_panel = <ParentMessage>(
    details: MutableHashSetDemo.StageDetails,
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
    model: MutableHashSetDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = MutableHashSetDemo.stage_details[model.stage]

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
                                        ["effect / MutableHashSet"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Mutable uniqueness backed by Effect hashing and equality",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Build a unique-value collection, test membership, mutate the same set in place, and see how logical Equal / Hash values collapse into one stored element.",
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
                                        ["10 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["MutableHashMap-backed"]
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
                : model.stage === "Membership"
                  ? membership_view(model, to_parent_message, h)
                  : model.stage === "Mutate"
                    ? mutate_view(model, to_parent_message, h)
                    : equality_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
