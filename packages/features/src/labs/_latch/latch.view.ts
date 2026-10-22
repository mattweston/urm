import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as LatchDemo from "./latch.ts"

type ToParentMessage<ParentMessage> = (
    message: LatchDemo.Message
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
    message: LatchDemo.Message,
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
    model: LatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Latch examples"),
        ],
        LatchDemo.stages.map((stage: LatchDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        LatchDemo.Message.SelectedLatchStage({ stage })
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
    details: LatchDemo.StageDetails,
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

const create_label = (createCase: LatchDemo.CreateCase): string =>
    createCase === "InitiallyOpen" ? "initially open" : createCase.toLowerCase()

const create_view = <ParentMessage>(
    model: LatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = LatchDemo.create_snapshot(model)

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
                                (
                                    [
                                        "Effectful",
                                        "Unsafe",
                                        "InitiallyOpen",
                                    ] as const
                                ).map((createCase: LatchDemo.CreateCase) =>
                                    choice_button(
                                        create_label(createCase),
                                        model.createCase === createCase,
                                        LatchDemo.Message.SelectedLatchCreateCase(
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
                                "requested open",
                                String(snapshot.requestedOpen),
                                h,
                                "cyan"
                            ),
                            metric("Latch.make", snapshot.makeDescription, h),
                            metric(
                                "Latch.makeUnsafe",
                                snapshot.unsafeDescription,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Initial state",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "effectful isOpen",
                                String(snapshot.effectfulInitiallyOpen),
                                h,
                                snapshot.effectfulInitiallyOpen
                                    ? "green"
                                    : "amber"
                            ),
                            metric(
                                "unsafe isOpen",
                                String(snapshot.unsafeInitiallyOpen),
                                h,
                                snapshot.unsafeInitiallyOpen ? "green" : "amber"
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Both constructors create the same Latch model. The distinction is allocation context: make returns Effect<Latch>; makeUnsafe performs allocation synchronously.",
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

const gate_label = (gateCase: LatchDemo.GateCase): string =>
    gateCase === "AlreadyOpen" ? "already open" : gateCase.toLowerCase()

const gate_view = <ParentMessage>(
    model: LatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = LatchDemo.gate_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Gate mode",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Await",
                                        "WhenOpen",
                                        "AlreadyOpen",
                                    ] as const
                                ).map((gateCase: LatchDemo.GateCase) =>
                                    choice_button(
                                        gate_label(gateCase),
                                        model.gateCase === gateCase,
                                        LatchDemo.Message.SelectedLatchGateCase(
                                            {
                                                gateCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric(
                                "initial state",
                                snapshot.initialState,
                                h,
                                snapshot.initialState === "open"
                                    ? "green"
                                    : "amber"
                            ),
                            metric("await", snapshot.awaitType, h),
                            metric(
                                "whenOpen",
                                snapshot.whenOpenType,
                                h,
                                "cyan"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Signal result",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "open changed state",
                                String(snapshot.openChanged),
                                h,
                                snapshot.openChanged ? "green" : "amber"
                            ),
                            metric(
                                "final state",
                                snapshot.finalState,
                                h,
                                "green"
                            ),
                            metric(
                                "gated effect result",
                                snapshot.exampleResult,
                                h,
                                "cyan"
                            ),
                            metric(
                                "open on already-open latch",
                                String(snapshot.alreadyOpenChanged),
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

const release_view = <ParentMessage>(
    model: LatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = LatchDemo.release_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.72fr_1.28fr]")],
        [
            panel(
                "Signal",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Open", "Release", "Compare"] as const).map(
                                    (releaseCase: LatchDemo.ReleaseCase) =>
                                        choice_button(
                                            releaseCase.toLowerCase(),
                                            model.releaseCase === releaseCase,
                                            LatchDemo.Message.SelectedLatchReleaseCase(
                                                {
                                                    releaseCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "open returns",
                                String(snapshot.openReturn),
                                h,
                                "green"
                            ),
                            metric(
                                "state after open",
                                String(snapshot.openStateAfter),
                                h,
                                "green"
                            ),
                            metric(
                                "second open returns",
                                String(snapshot.secondOpenReturn),
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Release is different",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "release returns",
                                String(snapshot.releaseReturn),
                                h,
                                "cyan"
                            ),
                            metric(
                                "state after release",
                                String(snapshot.releaseStateAfter),
                                h,
                                "amber"
                            ),
                            metric(
                                "semantic difference",
                                snapshot.difference,
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
                                    "release is a pulse for fibers currently waiting on a closed latch. Because the latch remains closed, a waiter that arrives later will suspend again.",
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

const reuse_label = (reuseCase: LatchDemo.ReuseCase): string =>
    reuseCase.toLowerCase()

const reuse_view = <ParentMessage>(
    model: LatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = LatchDemo.reuse_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.75fr_1.25fr]")],
        [
            panel(
                "Transition sequence",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Close", "Unsafe", "Transitions"] as const
                                ).map((reuseCase: LatchDemo.ReuseCase) =>
                                    choice_button(
                                        reuse_label(reuseCase),
                                        model.reuseCase === reuseCase,
                                        LatchDemo.Message.SelectedLatchReuseCase(
                                            {
                                                reuseCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("initial", snapshot.initial, h, "green"),
                            metric(
                                "close #1 / #2",
                                `${snapshot.close1} / ${snapshot.close2}`,
                                h,
                                "cyan"
                            ),
                            metric(
                                "after close",
                                snapshot.stateAfterClose,
                                h,
                                "amber"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Reopen",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "open #1 / #2",
                                `${snapshot.open1} / ${snapshot.open2}`,
                                h,
                                "cyan"
                            ),
                            metric("final state", snapshot.final, h, "green"),
                            metric(
                                "effectful close changed state",
                                String(snapshot.effectfulClose),
                                h
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "The true/false return communicates whether the transition actually changed the gate. Repeated close or repeated open is idempotent at the state level.",
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
    details: LatchDemo.StageDetails,
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
    model: LatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = LatchDemo.stage_details[model.stage]

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
                                        ["effect / Latch"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Reusable open / closed coordination for fibers",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Gate fibers behind a signal, distinguish a persistent open state from a one-generation release pulse, then close and reuse the latch for another coordination phase.",
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
                                        ["11 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["reusable gate"]
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
                : model.stage === "Gate"
                  ? gate_view(model, to_parent_message, h)
                  : model.stage === "Release"
                    ? release_view(model, to_parent_message, h)
                    : reuse_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
