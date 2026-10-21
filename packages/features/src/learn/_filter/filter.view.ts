import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as FilterDemo from "./filter.ts"

type ToParentMessage<ParentMessage> = (
    message: FilterDemo.Message
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
    tone: "default" | "cyan" | "green" | "amber" | "red" = "default"
): Html => {
    const toneClass =
        tone === "cyan"
            ? "border-cyan-500/30 bg-cyan-500/5"
            : tone === "green"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : tone === "amber"
                ? "border-amber-500/30 bg-amber-500/5"
                : tone === "red"
                  ? "border-red-500/30 bg-red-500/5"
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
    message: FilterDemo.Message,
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
    model: FilterDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Filter examples"),
        ],
        FilterDemo.stages.map((stage: FilterDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        FilterDemo.Message.SelectedFilterStage({ stage })
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
    details: FilterDemo.StageDetails,
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

const build_label = (buildCase: FilterDemo.BuildCase): string =>
    buildCase === "Predicate"
        ? "predicate"
        : buildCase === "Transform"
          ? "transform"
          : buildCase === "Try"
            ? "try"
            : "Option"

const build_view = <ParentMessage>(
    model: FilterDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = FilterDemo.build_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
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
                                        "Predicate",
                                        "Transform",
                                        "Try",
                                        "Option",
                                    ] as const
                                ).map((buildCase: FilterDemo.BuildCase) =>
                                    choice_button(
                                        build_label(buildCase),
                                        model.buildCase === buildCase,
                                        FilterDemo.Message.SelectedFilterBuildCase(
                                            {
                                                buildCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("API", snapshot.constructor, h, "cyan"),
                            metric("input", snapshot.input, h),
                            metric(
                                "transforms pass value",
                                String(snapshot.transformed),
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Result channels",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "result",
                                snapshot.result,
                                h,
                                snapshot.result.startsWith("Success")
                                    ? "green"
                                    : "amber"
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "Pass payload",
                                        snapshot.passPayload,
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "Fail payload",
                                        snapshot.failPayload,
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
                                    "Pass and Fail are independent type parameters. A Filter can therefore be both a gate and a transformation while keeping rejected information available.",
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

const narrow_label = (narrowCase: FilterDemo.NarrowCase): string =>
    narrowCase === "Primitives"
        ? "primitives"
        : narrowCase === "Equality"
          ? "equality"
          : narrowCase === "Tagged"
            ? "tag + reason"
            : "has + instanceof"

const narrow_view = <ParentMessage>(
    model: FilterDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = FilterDemo.narrow_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Built-in family",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Primitives",
                                        "Equality",
                                        "Tagged",
                                        "Has",
                                    ] as const
                                ).map((narrowCase: FilterDemo.NarrowCase) =>
                                    choice_button(
                                        narrow_label(narrowCase),
                                        model.narrowCase === narrowCase,
                                        FilterDemo.Message.SelectedFilterNarrowCase(
                                            {
                                                narrowCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric(
                                "narrows to",
                                snapshot.narrowedTo,
                                h,
                                "cyan"
                            ),
                            metric("detail", snapshot.detail, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Two checks",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        snapshot.leftLabel,
                                        snapshot.leftResult,
                                        h,
                                        snapshot.leftResult === "Success"
                                            ? "green"
                                            : "amber"
                                    ),
                                    metric(
                                        snapshot.rightLabel,
                                        snapshot.rightResult,
                                        h,
                                        snapshot.rightResult === "Success"
                                            ? "green"
                                            : "amber"
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
                                    model.narrowCase === "Equality"
                                        ? "Strict equality is identity-oriented for objects; structural equality accepts a distinct object with equal contents."
                                        : model.narrowCase === "Tagged"
                                          ? "tagged returns the matching union member; reason drills into the matching tagged error and returns the nested reason value."
                                          : "The built-ins return Result, so narrowing composes with the same Filter algebra rather than switching to booleans.",
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

const compose_label = (composeCase: FilterDemo.ComposeCase): string =>
    composeCase === "Zip"
        ? "zip family"
        : composeCase === "Or"
          ? "or"
          : composeCase === "Compose"
            ? "compose"
            : "passthrough"

const compose_view = <ParentMessage>(
    model: FilterDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = FilterDemo.compose_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Combinator",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Zip",
                                        "Or",
                                        "Compose",
                                        "Passthrough",
                                    ] as const
                                ).map((composeCase: FilterDemo.ComposeCase) =>
                                    choice_button(
                                        compose_label(composeCase),
                                        model.composeCase === composeCase,
                                        FilterDemo.Message.SelectedFilterComposeCase(
                                            {
                                                composeCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("input", snapshot.input, h),
                            metric(
                                "output shape",
                                snapshot.outputShape,
                                h,
                                "cyan"
                            ),
                            metric("evaluation", snapshot.evaluation, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Combined result",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "result",
                                snapshot.result,
                                h,
                                snapshot.result.startsWith("Success")
                                    ? "green"
                                    : "amber"
                            ),
                            metric(
                                "related combinators",
                                snapshot.secondary,
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
                                    model.composeCase === "Passthrough"
                                        ? "The second stage rejects the trimmed intermediate value, but composePassthrough deliberately reports the untouched original source string."
                                        : model.composeCase === "Compose"
                                          ? "Normal compose keeps the second stage's own failure payload, so the failure describes the transformed intermediate value."
                                          : "Parallel combinators operate on the same input; sequential composition passes one successful output into the next filter.",
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

const adapt_view = <ParentMessage>(
    model: FilterDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = FilterDemo.adapt_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.8fr_1.2fr]")],
        [
            panel(
                "Adapter mode",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                [
                                    choice_button(
                                        "conversions",
                                        model.adaptCase === "Convert",
                                        FilterDemo.Message.SelectedFilterAdaptCase(
                                            {
                                                adaptCase: "Convert",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                    choice_button(
                                        "FilterEffect",
                                        model.adaptCase === "Effectful",
                                        FilterDemo.Message.SelectedFilterAdaptCase(
                                            {
                                                adaptCase: "Effectful",
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    ),
                                ]
                            ),
                            metric(
                                "toPredicate(2)",
                                snapshot.predicate,
                                h,
                                "green"
                            ),
                            metric("toOption(2)", snapshot.option, h, "cyan"),
                            metric("toResult(-1)", snapshot.result, h, "amber"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Effectful filter",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "FilterEffect result",
                                snapshot.effectResult,
                                h,
                                snapshot.effectResult.startsWith("Success")
                                    ? "green"
                                    : "amber"
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "Effect error E",
                                        snapshot.effectErrorChannel,
                                        h
                                    ),
                                    metric("services R", snapshot.services, h),
                                ]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "The outer Effect describes how the check is performed; the inner Result still distinguishes passed from filtered-out values.",
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
    details: FilterDemo.StageDetails,
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
    model: FilterDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = FilterDemo.stage_details[model.stage]

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
                                        ["effect / Filter"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Composable checks that keep rejected values",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Build Result-producing checks, narrow unknown and tagged data, compose filters in parallel or sequence, then adapt the same semantics to Predicate, Option, Result, or Effect.",
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
                                        ["30 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["Result-based"]
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
                : model.stage === "Narrow"
                  ? narrow_view(model, to_parent_message, h)
                  : model.stage === "Compose"
                    ? compose_view(model, to_parent_message, h)
                    : adapt_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
