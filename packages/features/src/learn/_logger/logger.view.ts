import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as LoggerDemo from "./logger.ts"

type ToParentMessage<ParentMessage> = (
    message: LoggerDemo.Message
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
    message: LoggerDemo.Message,
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
    model: LoggerDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Logger examples"),
        ],
        LoggerDemo.stages.map((stage: LoggerDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        LoggerDemo.Message.SelectedLoggerStage({ stage })
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
    details: LoggerDemo.StageDetails,
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

const build_view = <ParentMessage>(
    model: LoggerDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = LoggerDemo.build_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Logger shape",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Make", "Map", "Options"] as const).map(
                                    (buildCase: LoggerDemo.BuildCase) =>
                                        choice_button(
                                            buildCase.toLowerCase(),
                                            model.buildCase === buildCase,
                                            LoggerDemo.Message.SelectedLoggerBuildCase(
                                                {
                                                    buildCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("generic shape", snapshot.shape, h, "cyan"),
                            metric("Options fields", snapshot.fields, h),
                            metric(
                                "isLogger",
                                String(snapshot.guard),
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Composition",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("log function", snapshot.output, h, "green"),
                            metric(
                                "mapped logger",
                                snapshot.mappedOutput,
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
                                    "Logger output is compositional data. A formatter can return a string or record first, then a later combinator can route that value to console, a batch, a file, or another sink.",
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

const format_view = <ParentMessage>(
    model: LoggerDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = LoggerDemo.format_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Formatter family",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Text", "Structured", "Pretty"] as const).map(
                                    (formatCase: LoggerDemo.FormatCase) =>
                                        choice_button(
                                            formatCase.toLowerCase(),
                                            model.formatCase === formatCase,
                                            LoggerDemo.Message.SelectedLoggerFormatCase(
                                                {
                                                    formatCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("formatSimple", snapshot.simple, h, "cyan"),
                            metric("formatLogFmt", snapshot.logfmt, h),
                            metric("formatJson", snapshot.json, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Structured + pretty",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "formatStructured",
                                snapshot.structured,
                                h,
                                "green"
                            ),
                            metric("pretty shape", snapshot.pretty, h, "cyan"),
                            metric(
                                "console variants",
                                snapshot.consoleVariants,
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

const route_view = <ParentMessage>(
    model: LoggerDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = LoggerDemo.route_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Destination",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Console", "Batch", "FileTrace"] as const
                                ).map((routeCase: LoggerDemo.RouteCase) =>
                                    choice_button(
                                        routeCase === "FileTrace"
                                            ? "file + trace"
                                            : routeCase.toLowerCase(),
                                        model.routeCase === routeCase,
                                        LoggerDemo.Message.SelectedLoggerRouteCase(
                                            {
                                                routeCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("stdout", snapshot.stdout, h, "cyan"),
                            metric("stderr", snapshot.stderr, h, "amber"),
                            metric("leveled console", snapshot.leveled, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Scoped sinks",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("batched", snapshot.batch, h, "cyan"),
                            metric("toFile", snapshot.file, h, "green"),
                            metric("tracerLogger", snapshot.trace, h),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const install_view = <ParentMessage>(
    model: LoggerDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = LoggerDemo.install_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Layer behavior",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Replace", "Merge", "References"] as const
                                ).map((installCase: LoggerDemo.InstallCase) =>
                                    choice_button(
                                        installCase.toLowerCase(),
                                        model.installCase === installCase,
                                        LoggerDemo.Message.SelectedLoggerInstallCase(
                                            {
                                                installCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("default set", snapshot.defaultSet, h),
                            metric("replace", snapshot.replace, h, "amber"),
                            metric("merge", snapshot.merge, h, "green"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Runtime references",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "CurrentLoggers",
                                snapshot.current,
                                h,
                                "cyan"
                            ),
                            metric("LogToStderr", snapshot.stderr, h),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Logger.layer is the normal installation boundary. Supplying multiple loggers fans each runtime log event out to every active logger in the resulting set.",
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
    details: LoggerDemo.StageDetails,
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
    model: LoggerDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = LoggerDemo.stage_details[model.stage]

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
                                        ["effect / Logger"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Composable log-event formatting, routing, and installation",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Turn runtime log events into strings or structured values, route those outputs to consoles, batches, files, or tracing, then install the desired logger set with a Layer.",
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
                                        ["25 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["format → route → install"]
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
            model.stage === "Build"
                ? build_view(model, to_parent_message, h)
                : model.stage === "Format"
                  ? format_view(model, to_parent_message, h)
                  : model.stage === "Route"
                    ? route_view(model, to_parent_message, h)
                    : install_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
