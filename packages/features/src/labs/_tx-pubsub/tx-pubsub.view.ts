import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./tx-pub-sub.ts"

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

type Tone = "default" | "cyan" | "green" | "amber" | "violet"

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
    tone: Tone = "default"
): Html => {
    const toneClass =
        tone === "cyan"
            ? "border-cyan-500/30 bg-cyan-500/5"
            : tone === "green"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : tone === "amber"
                ? "border-amber-500/30 bg-amber-500/5"
                : tone === "violet"
                  ? "border-violet-500/30 bg-violet-500/5"
                  : "border-border bg-background"

    return h.div(
        [h.Class(`rounded-[var(--radius-surface)] border p-3 ${toneClass}`)],
        [
            h.div(
                [
                    h.Class(
                        "font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
                    ),
                ],
                [label]
            ),
            h.div(
                [h.Class("mt-1 font-mono text-xs font-semibold leading-5")],
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
            h.AriaLabel("Effect TxPubSub examples"),
        ],
        Demo.stages.map((stage: Demo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        Demo.Message.SelectedTxPubSubStage({ stage })
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

const flow_node = <ParentMessage>(
    label: string,
    value: string,
    tone: Tone,
    h: HtmlBuilder<ParentMessage>
): Html => h.div([h.Class("min-w-0 flex-1")], [metric(label, value, h, tone)])

const scenario_workspace = <ParentMessage>(
    title: string,
    choices: ReadonlyArray<Html>,
    snapshot: Demo.Snapshot,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("grid gap-5 xl:grid-cols-[1.15fr_0.85fr]")],
        [
            panel(
                title,
                [
                    h.div(
                        [h.Class("space-y-5 p-5")],
                        [
                            h.div([h.Class("flex flex-wrap gap-2")], choices),
                            h.div(
                                [
                                    h.Class(
                                        "grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center"
                                    ),
                                ],
                                [
                                    flow_node(
                                        "input",
                                        snapshot.input,
                                        "violet",
                                        h
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "hidden font-mono text-muted-foreground lg:block"
                                            ),
                                        ],
                                        ["→"]
                                    ),
                                    flow_node(
                                        "operation",
                                        snapshot.operation,
                                        "cyan",
                                        h
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "hidden font-mono text-muted-foreground lg:block"
                                            ),
                                        ],
                                        ["→"]
                                    ),
                                    flow_node(
                                        "result",
                                        snapshot.result,
                                        "green",
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "TxPubSub contract",
                [
                    h.div(
                        [h.Class("grid gap-3 p-5")],
                        [
                            metric("invariant", snapshot.invariant, h, "amber"),
                            metric(
                                "implementation",
                                snapshot.implementation,
                                h,
                                "default"
                            ),
                            metric("guidance", snapshot.guidance, h, "cyan"),
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const create_choices = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    Demo.create_cases.map((createCase: Demo.CreateCase) =>
        choice_button(
            createCase,
            model.createCase === createCase,
            Demo.Message.SelectedTxPubSubCreateCase({ createCase }),
            to_parent_message,
            h
        )
    )

const publish_choices = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    Demo.publish_cases.map((publishCase: Demo.PublishCase) =>
        choice_button(
            publishCase,
            model.publishCase === publishCase,
            Demo.Message.SelectedTxPubSubPublishCase({ publishCase }),
            to_parent_message,
            h
        )
    )

const subscribe_choices = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    Demo.subscribe_cases.map((subscribeCase: Demo.SubscribeCase) =>
        choice_button(
            subscribeCase,
            model.subscribeCase === subscribeCase,
            Demo.Message.SelectedTxPubSubSubscribeCase({ subscribeCase }),
            to_parent_message,
            h
        )
    )

const shutdown_choices = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    Demo.shutdown_cases.map((shutdownCase: Demo.ShutdownCase) =>
        choice_button(
            shutdownCase,
            model.shutdownCase === shutdownCase,
            Demo.Message.SelectedTxPubSubShutdownCase({ shutdownCase }),
            to_parent_message,
            h
        )
    )

const workspace = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    switch (model.stage) {
        case "Create":
            return scenario_workspace(
                "Choose a transactional pub/sub strategy",
                create_choices(model, to_parent_message, h),
                Demo.create_snapshot(model),
                h
            )
        case "Publish":
            return scenario_workspace(
                "Publish to current subscribers",
                publish_choices(model, to_parent_message, h),
                Demo.publish_snapshot(model),
                h
            )
        case "Subscribe":
            return scenario_workspace(
                "Subscribe with scoped or transactional lifetime",
                subscribe_choices(model, to_parent_message, h),
                Demo.subscribe_snapshot(model),
                h
            )
        case "Shutdown":
            return scenario_workspace(
                "Shut down and inspect hub state",
                shutdown_choices(model, to_parent_message, h),
                Demo.shutdown_snapshot(model),
                h
            )
    }
}

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
                                "flex flex-col gap-5 p-6 lg:flex-row lg:items-end lg:justify-between"
                            ),
                        ],
                        [
                            h.div(
                                [],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-[10px] font-semibold tracking-[0.22em] text-cyan-600 uppercase"
                                            ),
                                        ],
                                        ["Effect v4 · TxPubSub"]
                                    ),
                                    h.h1(
                                        [
                                            h.Class(
                                                "mt-2 text-3xl font-semibold tracking-tight"
                                            ),
                                        ],
                                        [
                                            "Broadcast transactional messages to scoped subscribers",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Broadcast through per-subscriber TxQueues, choose backpressure or loss strategy, and compose subscription lifetime with transactions.",
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
                                        ["18 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["live rc.115"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["TxQueue · Scope · TxRef"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            stage_tabs(model, to_parent_message, h),
            intro_panel(details, h),
            workspace(model, to_parent_message, h),
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
