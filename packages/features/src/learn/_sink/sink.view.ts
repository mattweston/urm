import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./sink.ts"

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
            h.AriaLabel("Effect Sink examples"),
        ],
        Demo.stages.map((stage: Demo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        Demo.Message.SelectedSinkStage({ stage })
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
                "Sink contract",
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

const construct_choices = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    Demo.construct_cases.map((constructCase: Demo.ConstructCase) =>
        choice_button(
            constructCase,
            model.constructCase === constructCase,
            Demo.Message.SelectedSinkConstructCase({ constructCase }),
            to_parent_message,
            h
        )
    )

const reduce_choices = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    Demo.reduce_cases.map((reduceCase: Demo.ReduceCase) =>
        choice_button(
            reduceCase,
            model.reduceCase === reduceCase,
            Demo.Message.SelectedSinkReduceCase({ reduceCase }),
            to_parent_message,
            h
        )
    )

const leftovers_choices = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    Demo.leftovers_cases.map((leftoversCase: Demo.LeftoversCase) =>
        choice_button(
            leftoversCase,
            model.leftoversCase === leftoversCase,
            Demo.Message.SelectedSinkLeftoversCase({ leftoversCase }),
            to_parent_message,
            h
        )
    )

const compose_choices = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    Demo.compose_cases.map((composeCase: Demo.ComposeCase) =>
        choice_button(
            composeCase,
            model.composeCase === composeCase,
            Demo.Message.SelectedSinkComposeCase({ composeCase }),
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
        case "Construct":
            return scenario_workspace(
                "Choose a stream consumer",
                construct_choices(model, to_parent_message, h),
                Demo.construct_snapshot(model),
                h
            )

        case "Reduce":
            return scenario_workspace(
                "Reduce stream input",
                reduce_choices(model, to_parent_message, h),
                Demo.reduce_snapshot(model),
                h
            )

        case "Leftovers":
            return scenario_workspace(
                "Reason about leftovers",
                leftovers_choices(model, to_parent_message, h),
                Demo.leftovers_snapshot(model),
                h
            )

        case "Compose":
            return scenario_workspace(
                "Compose sink behavior",
                compose_choices(model, to_parent_message, h),
                Demo.compose_snapshot(model),
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
                                        ["Effect v4 · Sink"]
                                    ),
                                    h.h1(
                                        [
                                            h.Class(
                                                "mt-2 text-3xl font-semibold tracking-tight"
                                            ),
                                        ],
                                        ["Consume streams into one result"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Construct consumers, reduce streamed values, preserve early-stop leftovers, and compose result/error/service behavior without losing the consumption boundary.",
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
                                        ["80 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["workspace rc.112"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["result · input · leftovers"]
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
