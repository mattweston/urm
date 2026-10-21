import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./non-empty-iterable.ts"

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
                                : "rounded-[var(--radius-surface)] border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
            h.AriaLabel("Effect NonEmptyIterable examples"),
        ],
        Demo.stages.map((stage: Demo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        Demo.Message.SelectedNonEmptyIterableStage({
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

const guarantee_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = Demo.guarantee_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Type guarantee",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Brand", "Iterable", "Types"] as const).map(
                                    (guaranteeCase: Demo.GuaranteeCase) =>
                                        choice_button(
                                            guaranteeCase.toLowerCase(),
                                            model.guaranteeCase ===
                                                guaranteeCase,
                                            Demo.Message.SelectedNonEmptyIterableGuaranteeCase(
                                                {
                                                    guaranteeCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("model", snapshot.type, h, "cyan"),
                            metric("brand", snapshot.brand, h, "green"),
                            metric(
                                "runtime wrapper",
                                snapshot.runtimeWrapper,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Iterable compatibility",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("iteration", snapshot.iterable, h, "green"),
                            metric("sample Chunk", snapshot.sample, h, "cyan"),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "The type adds evidence of non-emptiness while retaining the normal Iterable protocol, so generic iteration code does not need a separate adapter.",
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

const split_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = Demo.split_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Unprepend",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Head", "Tail", "Tuple"] as const).map(
                                    (splitCase: Demo.SplitCase) =>
                                        choice_button(
                                            splitCase.toLowerCase(),
                                            model.splitCase === splitCase,
                                            Demo.Message.SelectedNonEmptyIterableSplitCase(
                                                {
                                                    splitCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("source", snapshot.source, h),
                            metric("first", snapshot.first, h, "green"),
                            metric("remaining", snapshot.rest, h, "cyan"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Return shape",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("type", snapshot.returnType, h, "cyan"),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "The head is safe because the input contract says at least one iterator result exists. The tail stays as the live Iterator instead of being copied into an array.",
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

const iterator_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = Demo.iterator_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Cursor",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Remaining", "Consume", "OnePass"] as const
                                ).map((iteratorCase: Demo.IteratorCase) =>
                                    choice_button(
                                        iteratorCase === "OnePass"
                                            ? "one pass"
                                            : iteratorCase.toLowerCase(),
                                        model.iteratorCase === iteratorCase,
                                        Demo.Message.SelectedNonEmptyIterableIteratorCase(
                                            {
                                                iteratorCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("first", String(snapshot.first), h, "green"),
                            metric("next()", snapshot.nextOne, h, "cyan"),
                            metric("next() again", snapshot.nextTwo, h, "cyan"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Remaining iterator",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "remaining after two next() calls",
                                snapshot.remaining,
                                h,
                                "amber"
                            ),
                            metric("model", snapshot.model, h),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const integrate_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = Demo.integrate_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Producers + consumers",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Chunk", "Random", "Generic"] as const).map(
                                    (integrateCase: Demo.IntegrateCase) =>
                                        choice_button(
                                            integrateCase.toLowerCase(),
                                            model.integrateCase ===
                                                integrateCase,
                                            Demo.Message.SelectedNonEmptyIterableIntegrateCase(
                                                {
                                                    integrateCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("Chunk", snapshot.chunkType, h, "green"),
                            metric("Random.choice", snapshot.random, h, "cyan"),
                            metric(
                                "general Iterable",
                                snapshot.generalIterable,
                                h,
                                "amber"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Ordinary Iterable code",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "sum 10 + 20 + 30 + 40",
                                String(snapshot.sum),
                                h,
                                "green"
                            ),
                            metric(
                                "compatibility",
                                snapshot.compatibility,
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

const notice_panel = <ParentMessage>(
    details: Demo.StageDetails,
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
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = Demo.stage_details[model.stage]

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
                                        ["effect / NonEmptyIterable"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "A compile-time non-empty guarantee on the standard Iterable protocol",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Carry evidence that iteration has a first element, split head from the live tail iterator safely, and let downstream APIs remove impossible empty-input cases from their types.",
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
                                        ["3 teaching entries"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["type-level guarantee"]
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
            model.stage === "Guarantee"
                ? guarantee_view(model, to_parent_message, h)
                : model.stage === "Split"
                  ? split_view(model, to_parent_message, h)
                  : model.stage === "Iterator"
                    ? iterator_view(model, to_parent_message, h)
                    : integrate_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
