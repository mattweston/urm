import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as PathDemo from "./path.ts"

type ToParentMessage<ParentMessage> = (
    message: PathDemo.Message
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
    message: PathDemo.Message,
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
    model: PathDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Path examples"),
        ],
        PathDemo.stages.map((stage: PathDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        PathDemo.Message.SelectedPathStage({ stage })
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
    details: PathDemo.StageDetails,
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

const service_view = <ParentMessage>(
    model: PathDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = PathDemo.service_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Service boundary",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Tag", "Layer", "Surface"] as const).map(
                                    (serviceCase: PathDemo.ServiceCase) =>
                                        choice_button(
                                            serviceCase.toLowerCase(),
                                            model.serviceCase === serviceCase,
                                            PathDemo.Message.SelectedPathServiceCase(
                                                {
                                                    serviceCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "runtime marker",
                                snapshot.typeId,
                                h,
                                "cyan"
                            ),
                            metric(
                                "service key",
                                snapshot.serviceKey,
                                h,
                                "green"
                            ),
                            metric("separator", snapshot.separator, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Operation surface",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("layer", snapshot.layer, h, "cyan"),
                            metric(
                                "synchronous methods",
                                snapshot.syncOps,
                                h,
                                "green"
                            ),
                            metric(
                                "Effect-returning methods",
                                snapshot.effectOps,
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

const compose_view = <ParentMessage>(
    model: PathDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = PathDemo.compose_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Composition",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Join", "Normalize", "Relative"] as const
                                ).map((composeCase: PathDemo.ComposeCase) =>
                                    choice_button(
                                        composeCase.toLowerCase(),
                                        model.composeCase === composeCase,
                                        PathDemo.Message.SelectedPathComposeCase(
                                            {
                                                composeCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("join", snapshot.join, h, "green"),
                            metric("normalize", snapshot.normalize, h, "cyan"),
                            metric("relative", snapshot.relative, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Resolution",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("resolve", snapshot.resolve, h, "green"),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        'isAbsolute("/srv")',
                                        String(snapshot.absoluteYes),
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        'isAbsolute("srv")',
                                        String(snapshot.absoluteNo),
                                        h
                                    ),
                                ]
                            ),
                            metric("sep", snapshot.separator, h, "amber"),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const parse_view = <ParentMessage>(
    model: PathDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = PathDemo.parse_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Parsed path",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Pieces", "Format", "Names"] as const).map(
                                    (parseCase: PathDemo.ParseCase) =>
                                        choice_button(
                                            parseCase.toLowerCase(),
                                            model.parseCase === parseCase,
                                            PathDemo.Message.SelectedPathParseCase(
                                                {
                                                    parseCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric("root", snapshot.root, h),
                                    metric("dir", snapshot.dir, h, "cyan"),
                                    metric("base", snapshot.base, h, "green"),
                                    metric("ext", snapshot.ext, h),
                                ]
                            ),
                            metric("name", snapshot.name, h, "amber"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Rebuild + names",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("format", snapshot.formatted, h, "green"),
                            metric(
                                "basename(path, .json)",
                                snapshot.basenameWithoutSuffix,
                                h,
                                "cyan"
                            ),
                            metric("toNamespacedPath", snapshot.namespaced, h),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const urls_label = (value: PathDemo.UrlsCase): string =>
    value === "ToFileUrl"
        ? "to file URL"
        : value === "FromFileUrl"
          ? "from file URL"
          : "failure"

const urls_view = <ParentMessage>(
    model: PathDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = PathDemo.urls_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Round trip",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "ToFileUrl",
                                        "FromFileUrl",
                                        "Failure",
                                    ] as const
                                ).map((urlsCase: PathDemo.UrlsCase) =>
                                    choice_button(
                                        urls_label(urlsCase),
                                        model.urlsCase === urlsCase,
                                        PathDemo.Message.SelectedPathUrlsCase({
                                            urlsCase,
                                        }),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("path", snapshot.path, h),
                            metric("toFileUrl", snapshot.fileUrl, h, "cyan"),
                            metric(
                                "fromFileUrl",
                                snapshot.roundTrip,
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "BadArgument cases",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "invalid scheme",
                                snapshot.invalidScheme,
                                h,
                                "amber"
                            ),
                            metric(
                                "file URL host",
                                snapshot.invalidHost,
                                h,
                                "amber"
                            ),
                            metric(
                                "encoded slash",
                                snapshot.encodedSlash,
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

const notice_panel = <ParentMessage>(
    details: PathDemo.StageDetails,
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
    model: PathDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = PathDemo.stage_details[model.stage]

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
                                        ["effect / Path"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Platform-independent path manipulation through an Effect service",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Join, normalize, resolve, parse, format, and compare paths synchronously through a service, while keeping file-URL conversion failures typed in Effect.",
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
                                        ["5 teaching entries"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["POSIX default layer"]
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
            model.stage === "Service"
                ? service_view(model, to_parent_message, h)
                : model.stage === "Compose"
                  ? compose_view(model, to_parent_message, h)
                  : model.stage === "Parse"
                    ? parse_view(model, to_parent_message, h)
                    : urls_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
