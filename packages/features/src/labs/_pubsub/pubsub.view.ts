import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./pubsub.ts"

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
        ],
        Demo.stages.map((stage: Demo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        Demo.Message.SelectedPubSubStage({ stage })
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

const create_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = Demo.create_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-2")],
        [
            panel(
                "Capacity strategies",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Bounded", "Strategies", "Replay"] as const
                                ).map((createCase: Demo.CreateCase) =>
                                    choice_button(
                                        createCase.toLowerCase(),
                                        model.createCase === createCase,
                                        Demo.Message.SelectedPubSubCreateCase({
                                            createCase,
                                        }),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("bounded", snapshot.bounded, h, "cyan"),
                            metric("dropping", snapshot.dropping, h, "amber"),
                            metric("sliding", snapshot.sliding, h, "green"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Replay + low-level model",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("unbounded", snapshot.unbounded, h),
                            metric("replay", snapshot.replay, h, "cyan"),
                            metric(
                                "custom make",
                                snapshot.lowLevel,
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

const broadcast_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = Demo.broadcast_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-2")],
        [
            panel(
                "Publishing",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Publish", "PublishAll", "FanOut"] as const
                                ).map((broadcastCase: Demo.BroadcastCase) =>
                                    choice_button(
                                        broadcastCase.toLowerCase(),
                                        model.broadcastCase === broadcastCase,
                                        Demo.Message.SelectedPubSubBroadcastCase(
                                            { broadcastCase }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("publish", snapshot.publish, h, "cyan"),
                            metric(
                                "publishUnsafe",
                                snapshot.unsafe,
                                h,
                                "amber"
                            ),
                            metric("publishAll", snapshot.all, h, "green"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Fan-out",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("subscriber A", snapshot.first, h, "green"),
                            metric("subscriber B", snapshot.second, h, "green"),
                            metric(
                                "Queue contrast",
                                snapshot.queueContrast,
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

const consume_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = Demo.consume_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-2")],
        [
            panel(
                "Subscription reads",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Take", "Batch", "Remaining"] as const).map(
                                    (consumeCase: Demo.ConsumeCase) =>
                                        choice_button(
                                            consumeCase.toLowerCase(),
                                            model.consumeCase === consumeCase,
                                            Demo.Message.SelectedPubSubConsumeCase(
                                                { consumeCase }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("subscribe", snapshot.subscribe, h, "cyan"),
                            metric("take", snapshot.take, h, "green"),
                            metric("takeAll", snapshot.takeAll, h, "green"),
                            metric("takeUpTo", snapshot.takeUpTo, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Batch + availability",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "takeBetween",
                                snapshot.takeBetween,
                                h,
                                "amber"
                            ),
                            metric("remaining", snapshot.remaining, h, "cyan"),
                            metric(
                                "remainingUnsafe",
                                snapshot.remainingUnsafe,
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
                "Inspection",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Size", "Shutdown", "Unsafe"] as const).map(
                                    (lifecycleCase: Demo.LifecycleCase) =>
                                        choice_button(
                                            lifecycleCase.toLowerCase(),
                                            model.lifecycleCase ===
                                                lifecycleCase,
                                            Demo.Message.SelectedPubSubLifecycleCase(
                                                { lifecycleCase }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("capacity", snapshot.capacity, h, "green"),
                            metric("size", snapshot.size, h, "cyan"),
                            metric("sizeUnsafe", snapshot.sizeUnsafe, h),
                            metric("predicates", snapshot.predicates, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Shutdown",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("shutdown", snapshot.shutdown, h, "amber"),
                            metric(
                                "isShutdownUnsafe",
                                snapshot.unsafeShutdown,
                                h
                            ),
                            metric("awaitShutdown", snapshot.await, h, "cyan"),
                            metric(
                                "publish after shutdown",
                                snapshot.after,
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

export const view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = Demo.stage_details[model.stage]

    const workspace =
        model.stage === "Create"
            ? create_view(model, to_parent_message, h)
            : model.stage === "Broadcast"
              ? broadcast_view(model, to_parent_message, h)
              : model.stage === "Consume"
                ? consume_view(model, to_parent_message, h)
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
                                        ["effect / PubSub"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Broadcast messaging with explicit capacity, replay, and subscriber lifecycle",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Create bounded or loss-tolerant hubs, fan messages out to every current subscriber, consume through scoped subscriptions, and inspect or shut the hub down explicitly.",
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
                                        ["31 top-level exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["broadcast fan-out"]
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
