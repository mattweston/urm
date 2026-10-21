import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as InspectableDemo from "./inspectable.ts"

type ToParentMessage<ParentMessage> = (
    message: InspectableDemo.Message
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
    message: InspectableDemo.Message,
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
    model: InspectableDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Inspectable examples"),
        ],
        InspectableDemo.stages.map((stage: InspectableDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        InspectableDemo.Message.SelectedInspectableStage({
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
    details: InspectableDemo.StageDetails,
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

const convert_label = (convertCase: InspectableDemo.ConvertCase): string =>
    convertCase === "ToJson"
        ? "toJson"
        : convertCase === "UnknownString"
          ? "toStringUnknown"
          : "failure"

const convert_view = <ParentMessage>(
    model: InspectableDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = InspectableDemo.convert_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Conversion",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "ToJson",
                                        "UnknownString",
                                        "Failure",
                                    ] as const
                                ).map(
                                    (
                                        convertCase: InspectableDemo.ConvertCase
                                    ) =>
                                        choice_button(
                                            convert_label(convertCase),
                                            model.convertCase === convertCase,
                                            InspectableDemo.Message.SelectedInspectableConvertCase(
                                                {
                                                    convertCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("source", snapshot.source, h, "cyan"),
                            metric(
                                "structured",
                                snapshot.structured,
                                h,
                                "green"
                            ),
                            metric("diagnostic string", snapshot.text, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Safety behavior",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "plain object returned unchanged",
                                String(snapshot.plainSameReference),
                                h,
                                "green"
                            ),
                            metric(
                                "array recursively converted",
                                snapshot.arrayStructured,
                                h,
                                "cyan"
                            ),
                            metric(
                                "throwing toJSON",
                                snapshot.failureFallback,
                                h,
                                "amber"
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "toJson is a safe inspection helper rather than a strict JSON codec. It can preserve ordinary objects as-is while protecting callers from broken custom toJSON implementations.",
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

const class_view = <ParentMessage>(
    model: InspectableDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = InspectableDemo.class_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.75fr_1.25fr]")],
        [
            panel(
                "Class projection",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["String", "Json", "Node"] as const).map(
                                    (classCase: InspectableDemo.ClassCase) =>
                                        choice_button(
                                            classCase,
                                            model.classCase === classCase,
                                            InspectableDemo.Message.SelectedInspectableClassCase(
                                                {
                                                    classCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("toJSON()", snapshot.toJson, h, "cyan"),
                            metric(
                                "JSON.stringify(user)",
                                snapshot.jsonStringify,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Inherited inspection",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("toString()", snapshot.toString, h, "green"),
                            metric(
                                "[NodeInspectSymbol]()",
                                snapshot.nodeInspect,
                                h,
                                "cyan"
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "toString inherited",
                                        String(snapshot.inheritedString),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "Node method inherited",
                                        String(snapshot.inheritedNode),
                                        h,
                                        "green"
                                    ),
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

const custom_view = <ParentMessage>(
    model: InspectableDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = InspectableDemo.custom_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Manual contract",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Interface", "Symbol"] as const).map(
                                    (customCase: InspectableDemo.CustomCase) =>
                                        choice_button(
                                            customCase,
                                            model.customCase === customCase,
                                            InspectableDemo.Message.SelectedInspectableCustomCase(
                                                {
                                                    customCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "Inspectable shape",
                                snapshot.interfaceShape,
                                h,
                                "cyan"
                            ),
                            metric("symbol", snapshot.symbolKey, h),
                            metric(
                                "Symbol.for match",
                                String(snapshot.globalSymbolMatch),
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Three representations",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "toString",
                                snapshot.stringOutput,
                                h,
                                "green"
                            ),
                            metric("toJSON", snapshot.jsonOutput, h, "cyan"),
                            metric("Node inspect", snapshot.nodeOutput, h),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Implementing the interface directly lets each output path diverge if useful; this demo keeps toJSON and Node inspection aligned and formats toJSON for toString.",
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

const prototype_view = <ParentMessage>(
    model: InspectableDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = InspectableDemo.prototype_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Prototype mode",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Override", "Bare"] as const).map(
                                    (
                                        prototypeCase: InspectableDemo.PrototypeCase
                                    ) =>
                                        choice_button(
                                            prototypeCase,
                                            model.prototypeCase ===
                                                prototypeCase,
                                            InspectableDemo.Message.SelectedInspectablePrototypeCase(
                                                {
                                                    prototypeCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric(
                                "inherits BaseProto",
                                String(snapshot.inheritsBaseProto),
                                h,
                                "green"
                            ),
                            metric("lesson", snapshot.lesson, h, "cyan"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Inherited methods",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "toString",
                                snapshot.stringOutput,
                                h,
                                "green"
                            ),
                            metric("toJSON", snapshot.jsonOutput, h, "cyan"),
                            metric("Node inspect", snapshot.nodeOutput, h),
                            metric(
                                "bare BaseProto object",
                                snapshot.bareString,
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
    details: InspectableDemo.StageDetails,
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
    model: InspectableDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = InspectableDemo.stage_details[model.stage]

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
                                        ["effect / Inspectable"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "Stable string, JSON, and Node inspection output",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Convert unknown values safely, derive inspection behavior from a single toJSON method, implement the full contract manually, or share behavior through BaseProto.",
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
                                        ["7 entries"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["Node inspect hook"]
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
            model.stage === "Convert"
                ? convert_view(model, to_parent_message, h)
                : model.stage === "Class"
                  ? class_view(model, to_parent_message, h)
                  : model.stage === "Custom"
                    ? custom_view(model, to_parent_message, h)
                    : prototype_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
