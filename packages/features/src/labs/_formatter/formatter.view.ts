import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as FormatterDemo from "./formatter.ts"

type ToParentMessage<ParentMessage> = (
    message: FormatterDemo.Message
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
    message: FormatterDemo.Message,
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
    model: FormatterDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Formatter examples"),
        ],
        FormatterDemo.stages.map((stage: FormatterDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        FormatterDemo.Message.SelectedFormatterStage({ stage })
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
    details: FormatterDemo.StageDetails,
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

const value_label = (valueCase: FormatterDemo.ValueCase): string =>
    valueCase === "Primitives"
        ? "primitives"
        : valueCase === "Collections"
          ? "collections"
          : "objects"

const values_view = <ParentMessage>(
    model: FormatterDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = FormatterDemo.values_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.74fr_1.26fr]")],
        [
            panel(
                "Value family",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Primitives",
                                        "Collections",
                                        "Objects",
                                    ] as const
                                ).map((valueCase: FormatterDemo.ValueCase) =>
                                    choice_button(
                                        value_label(valueCase),
                                        model.valueCase === valueCase,
                                        FormatterDemo.Message.SelectedFormatterValueCase(
                                            {
                                                valueCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric(
                                "Formatter interface",
                                "(value: Value) => Format",
                                h,
                                "cyan"
                            ),
                            metric(
                                "custom Formatter<string>",
                                snapshot.customFormatter,
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Formatted output",
                [
                    h.div(
                        [h.Class("space-y-3 p-5")],
                        snapshot.rows.map(
                            (
                                row: FormatterDemo.ValuesSnapshot["rows"][number]
                            ) => metric(row.label, row.output, h)
                        )
                    ),
                ],
                h
            ),
        ]
    )
}

const special_label = (specialCase: FormatterDemo.SpecialCase): string =>
    specialCase === "Circular"
        ? "circular"
        : specialCase === "Error"
          ? "Error + cause"
          : "class"

const special_view = <ParentMessage>(
    model: FormatterDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = FormatterDemo.special_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.72fr_1.28fr]")],
        [
            panel(
                "Inspection case",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Circular", "Error", "Class"] as const).map(
                                    (specialCase: FormatterDemo.SpecialCase) =>
                                        choice_button(
                                            special_label(specialCase),
                                            model.specialCase === specialCase,
                                            FormatterDemo.Message.SelectedFormatterSpecialCase(
                                                {
                                                    specialCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("input", snapshot.inputLabel, h, "cyan"),
                            metric("safety", snapshot.safety, h, "green"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Diagnostic rendering",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "Formatter.format",
                                snapshot.output,
                                h,
                                "cyan"
                            ),
                            metric("secondary", snapshot.secondary, h),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "The formatter is designed to produce a usable diagnostic string even when a value is cyclic or has unusual runtime behavior.",
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

const option_label = (optionCase: FormatterDemo.OptionCase): string =>
    optionCase === "Compact"
        ? "compact"
        : optionCase === "Pretty"
          ? "pretty"
          : "ignoreToString"

const options_view = <ParentMessage>(
    model: FormatterDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = FormatterDemo.options_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.75fr_1.25fr]")],
        [
            panel(
                "Options",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Compact",
                                        "Pretty",
                                        "IgnoreToString",
                                    ] as const
                                ).map((optionCase: FormatterDemo.OptionCase) =>
                                    choice_button(
                                        option_label(optionCase),
                                        model.optionCase === optionCase,
                                        FormatterDemo.Message.SelectedFormatterOptionCase(
                                            {
                                                optionCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("spacing", snapshot.spacing, h, "cyan"),
                            metric(
                                "custom toString",
                                snapshot.customToString,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Selected rendering",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("selected", snapshot.selected, h, "cyan"),
                            metric("compact baseline", snapshot.compact, h),
                            metric(
                                "structural class rendering",
                                snapshot.structured,
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

const json_label = (jsonCase: FormatterDemo.JsonCase): string =>
    jsonCase === "UnsupportedRoot" ? "unsupported root" : jsonCase

const json_view = <ParentMessage>(
    model: FormatterDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = FormatterDemo.json_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.74fr_1.26fr]")],
        [
            panel(
                "JSON case",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Object",
                                        "Circular",
                                        "BigInt",
                                        "UnsupportedRoot",
                                    ] as const
                                ).map((jsonCase: FormatterDemo.JsonCase) =>
                                    choice_button(
                                        json_label(jsonCase),
                                        model.jsonCase === jsonCase,
                                        FormatterDemo.Message.SelectedFormatterJsonCase(
                                            {
                                                jsonCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric(
                                "parseable JSON",
                                String(snapshot.parseable),
                                h,
                                "green"
                            ),
                            metric(
                                "difference",
                                snapshot.difference,
                                h,
                                "cyan"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "formatJson vs format",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("formatJson", snapshot.output, h, "green"),
                            metric("format", snapshot.diagnosticFormat, h),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Use formatJson when downstream code requires JSON.parse-compatible output. Use format when diagnostic fidelity for richer JavaScript values matters more than JSON syntax.",
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
    details: FormatterDemo.StageDetails,
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
    model: FormatterDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = FormatterDemo.stage_details[model.stage]

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
                                        ["effect / Formatter"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        ["Readable diagnostics and safe JSON"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "See how format handles rich JavaScript values defensively, how presentation options change output, and where formatJson intentionally differs to stay parseable.",
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
                                        ["3 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["circular-safe"]
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
            model.stage === "Values"
                ? values_view(model, to_parent_message, h)
                : model.stage === "Special"
                  ? special_view(model, to_parent_message, h)
                  : model.stage === "Options"
                    ? options_view(model, to_parent_message, h)
                    : json_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}
