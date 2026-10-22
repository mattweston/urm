import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./redacted.ts"

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
            h.AriaLabel("Effect Redacted examples"),
        ],
        Demo.stages.map((stage: Demo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        Demo.Message.SelectedRedactedStage({ stage })
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
                                                "text-center text-sm font-semibold text-muted-foreground"
                                            ),
                                        ],
                                        ["→"]
                                    ),
                                    flow_node(
                                        "operation",
                                        snapshot.check,
                                        "cyan",
                                        h
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "text-center text-sm font-semibold text-muted-foreground"
                                            ),
                                        ],
                                        ["→"]
                                    ),
                                    flow_node(
                                        "visible result",
                                        snapshot.output,
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
                "Storage + boundary",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("stored value", snapshot.context, h, "cyan"),
                            metric(
                                "wrapper behavior",
                                snapshot.traversal,
                                h,
                                "amber"
                            ),
                            metric("guidance", snapshot.guidance, h, "green"),
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const wrap_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    scenario_workspace(
        "Wrapper shape",
        Demo.wrap_cases.map((wrapCase: Demo.WrapCase) =>
            choice_button(
                wrapCase.toLowerCase(),
                model.wrapCase === wrapCase,
                Demo.Message.SelectedRedactedWrapCase({ wrapCase }),
                to_parent_message,
                h
            )
        ),
        Demo.wrap_snapshot(model),
        h
    )

const reveal_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    scenario_workspace(
        "Reveal boundary",
        Demo.reveal_cases.map((revealCase: Demo.RevealCase) =>
            choice_button(
                revealCase.toLowerCase(),
                model.revealCase === revealCase,
                Demo.Message.SelectedRedactedRevealCase({ revealCase }),
                to_parent_message,
                h
            )
        ),
        Demo.reveal_snapshot(model),
        h
    )

const compare_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    scenario_workspace(
        "Comparison rule",
        Demo.compare_cases.map((compareCase: Demo.CompareCase) =>
            choice_button(
                compareCase.toLowerCase(),
                model.compareCase === compareCase,
                Demo.Message.SelectedRedactedCompareCase({ compareCase }),
                to_parent_message,
                h
            )
        ),
        Demo.compare_snapshot(model),
        h
    )

const wipe_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    scenario_workspace(
        "Wipe semantics",
        Demo.wipe_cases.map((wipeCase: Demo.WipeCase) =>
            choice_button(
                wipeCase.toLowerCase(),
                model.wipeCase === wipeCase,
                Demo.Message.SelectedRedactedWipeCase({ wipeCase }),
                to_parent_message,
                h
            )
        ),
        Demo.wipe_snapshot(model),
        h
    )

export const view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = Demo.stage_details[model.stage]

    const workspace =
        model.stage === "Wrap"
            ? wrap_view(model, to_parent_message, h)
            : model.stage === "Reveal"
              ? reveal_view(model, to_parent_message, h)
              : model.stage === "Compare"
                ? compare_view(model, to_parent_message, h)
                : wipe_view(model, to_parent_message, h)

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
                                        ["effect / Redacted"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Sensitive values with safe default presentation",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Wrap a secret so ordinary output stays redacted, reveal it only at explicit boundaries, compare wrappers without repeated unwrapping, and understand exactly what wiping does—and does not—erase.",
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
                                        ["7 API entries"]
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
                                        ["labels are visible"]
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
