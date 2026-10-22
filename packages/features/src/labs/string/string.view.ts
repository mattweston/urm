import * as Ui from "@foldkit/ui"
import { Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as StringDemo from "./string.ts"

type ToParentMessage<ParentMessage> = (
    message: StringDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const panel = <ParentMessage>(
    label: string,
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
                        [label]
                    ),
                ]
            ),
            ...children,
        ]
    )

const action = <ParentMessage>(
    label: string,
    message: StringDemo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    is_disabled: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: is_disabled,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-xs font-semibold tracking-wide transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-40"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const stage_tabs = <ParentMessage>(
    model: StringDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect String examples"),
        ],
        StringDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        StringDemo.SelectedStringStage({
                            stage,
                        })
                    ),
                    isDisabled: stage === model.stage,
                    toView: (attributes) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    stage === model.stage
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

const controls = <ParentMessage>(
    children: ReadonlyArray<Html>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
            ),
        ],
        children
    )

const text_node = <ParentMessage>(
    label: string,
    value: string,
    active: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                active
                    ? "rounded-[var(--radius-surface)] border border-chart-2/40 bg-chart-2/5 p-4"
                    : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 opacity-30"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                    ),
                ],
                [label]
            ),
            h.div(
                [
                    h.Class(
                        active
                            ? "mt-2 whitespace-pre-wrap font-mono text-xs font-semibold text-chart-2"
                            : "mt-2 whitespace-pre-wrap font-mono text-xs font-semibold"
                    ),
                ],
                [JSON.stringify(value)]
            ),
        ]
    )

const normalize_view = <ParentMessage>(
    model: StringDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const values = StringDemo.normalize_values(model.normalize_input)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · pipe-friendly normalization",
                [
                    h.div(
                        [h.Class("p-5")],
                        [
                            h.label(
                                [h.Class("block space-y-2")],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Input"]
                                    ),
                                    h.input([
                                        h.Class(
                                            "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 font-mono outline-none"
                                        ),
                                        h.Value(model.normalize_input),
                                        h.OnInput((value) =>
                                            to_parent_message(
                                                StringDemo.UpdatedNormalizeInput(
                                                    { value }
                                                )
                                            )
                                        ),
                                    ]),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-5 grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]"
                                    ),
                                ],
                                [
                                    text_node(
                                        "input",
                                        values[0] ?? "",
                                        true,
                                        h
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "self-center text-center font-mono text-xs text-muted-foreground"
                                            ),
                                        ],
                                        ["→ trim →"]
                                    ),
                                    text_node(
                                        "trimmed",
                                        values[1] ?? "",
                                        model.normalize_step >= 1,
                                        h
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "self-center text-center font-mono text-xs text-muted-foreground"
                                            ),
                                        ],
                                        ["→ lower →"]
                                    ),
                                    text_node(
                                        "lowercase",
                                        values[2] ?? "",
                                        model.normalize_step >= 2,
                                        h
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "self-center text-center font-mono text-xs text-muted-foreground"
                                            ),
                                        ],
                                        ["→ capitalize →"]
                                    ),
                                    text_node(
                                        "output",
                                        values[3] ?? "",
                                        model.normalize_step >= 3,
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Run next",
                                StringDemo.ClickedAdvanceStringNormalize(),
                                to_parent_message,
                                model.normalize_step >= 3,
                                h
                            ),
                            action(
                                "Reset",
                                StringDemo.ClickedResetStringNormalize(),
                                to_parent_message,
                                model.normalize_step === 0,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Literal-aware helpers",
                [
                    h.div(
                        [
                            h.Class(
                                "grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("p-4")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs text-chart-1"
                                            ),
                                        ],
                                        ['String.Trim<"  hello  ">']
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-xs text-success"
                                            ),
                                        ],
                                        ['→ "hello"']
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("p-4")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs text-chart-1"
                                            ),
                                        ],
                                        ['String.toUpperCase("effect")']
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-xs text-success"
                                            ),
                                        ],
                                        ['→ "EFFECT"']
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

const inspect_choice = <ParentMessage>(
    mode: StringDemo.InspectMode,
    model: StringDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        StringDemo.SelectedStringInspectMode({
            mode,
        }),
        to_parent_message,
        model.inspect_mode === mode,
        h
    )

const inspect_view = <ParentMessage>(
    model: StringDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = StringDemo.inspect_result(model)
    const output =
        result._tag === "Boolean"
            ? String(result.value)
            : Option.match(result.value, {
                  onNone: () => "Option.none()",
                  onSome: (value) => `Option.some(${JSON.stringify(value)})`,
              })

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · predicates + safe positions",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            inspect_choice(
                                "Includes",
                                model,
                                to_parent_message,
                                h
                            ),
                            inspect_choice(
                                "StartsWith",
                                model,
                                to_parent_message,
                                h
                            ),
                            inspect_choice(
                                "EndsWith",
                                model,
                                to_parent_message,
                                h
                            ),
                            inspect_choice("At", model, to_parent_message, h),
                            inspect_choice(
                                "IndexOf",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-2"
                            ),
                        ],
                        [
                            h.label(
                                [h.Class("block space-y-2")],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Text"]
                                    ),
                                    h.input([
                                        h.Class(
                                            "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 font-mono outline-none"
                                        ),
                                        h.Value(model.inspect_text),
                                        h.OnInput((value) =>
                                            to_parent_message(
                                                StringDemo.UpdatedStringInspectText(
                                                    { value }
                                                )
                                            )
                                        ),
                                    ]),
                                ]
                            ),
                            model.inspect_mode === "At"
                                ? h.div(
                                      [],
                                      [
                                          h.div(
                                              [
                                                  h.Class(
                                                      "mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                                  ),
                                              ],
                                              ["Index"]
                                          ),
                                          h.div(
                                              [h.Class("flex flex-wrap gap-2")],
                                              [-1, 0, 6, 99].map((index) =>
                                                  action(
                                                      String(index),
                                                      StringDemo.SelectedStringInspectIndex(
                                                          {
                                                              index,
                                                          }
                                                      ),
                                                      to_parent_message,
                                                      model.inspect_index ===
                                                          index,
                                                      h
                                                  )
                                              )
                                          ),
                                      ]
                                  )
                                : h.label(
                                      [h.Class("block space-y-2")],
                                      [
                                          h.span(
                                              [
                                                  h.Class(
                                                      "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                                  ),
                                              ],
                                              ["Search"]
                                          ),
                                          h.input([
                                              h.Class(
                                                  "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 font-mono outline-none"
                                              ),
                                              h.Value(model.inspect_query),
                                              h.OnInput((value) =>
                                                  to_parent_message(
                                                      StringDemo.UpdatedStringInspectQuery(
                                                          {
                                                              value,
                                                          }
                                                      )
                                                  )
                                              ),
                                          ]),
                                      ]
                                  ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                result._tag === "Option" &&
                                    Option.isNone(result.value)
                                    ? "border-t-(length:--surface-border-width) border-border bg-warning/5 px-5 py-4"
                                    : "border-t-(length:--surface-border-width) border-border bg-success/5 px-5 py-4"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "font-mono text-xs text-muted-foreground"
                                    ),
                                ],
                                [result.expression]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        result._tag === "Option" &&
                                            Option.isNone(result.value)
                                            ? "mt-2 font-mono text-sm font-semibold text-warning"
                                            : "mt-2 font-mono text-sm font-semibold text-success"
                                    ),
                                ],
                                [output]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Why Option matters",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Helpers such as String.at, charAt, charCodeAt, codePointAt, and indexOf represent missing positions with Option instead of undefined, an empty-string sentinel, or -1.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const segment_choice = <ParentMessage>(
    mode: StringDemo.SegmentMode,
    model: StringDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        StringDemo.SelectedStringSegmentMode({
            mode,
        }),
        to_parent_message,
        model.segment_mode === mode,
        h
    )

const segment_view = <ParentMessage>(
    model: StringDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const pieces = StringDemo.segment_result(model.segment_mode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · slice and split",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            segment_choice(
                                "Split",
                                model,
                                to_parent_message,
                                h
                            ),
                            segment_choice(
                                "Slice",
                                model,
                                to_parent_message,
                                h
                            ),
                            segment_choice(
                                "TakeLeft",
                                model,
                                to_parent_message,
                                h
                            ),
                            segment_choice(
                                "TakeRight",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 font-mono text-center text-sm"
                                    ),
                                ],
                                [StringDemo.segment_input]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "my-4 text-center font-mono text-xs text-chart-1"
                                    ),
                                ],
                                [
                                    model.segment_mode === "Split"
                                        ? 'String.split("-")'
                                        : model.segment_mode === "Slice"
                                          ? "String.slice(7, 13)"
                                          : model.segment_mode === "TakeLeft"
                                            ? "String.takeLeft(6)"
                                            : "String.takeRight(7)",
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "flex flex-wrap justify-center gap-2"
                                    ),
                                ],
                                pieces.map((piece) =>
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border border-chart-2/40 bg-chart-2/5 px-3 py-2 font-mono text-xs text-chart-2"
                                            ),
                                        ],
                                        [piece]
                                    )
                                )
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Pipe shape",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 font-mono text-xs leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            'pipe("effect-string-helpers", String.',
                            model.segment_mode === "Split"
                                ? 'split("-"))'
                                : model.segment_mode === "Slice"
                                  ? "slice(7, 13))"
                                  : model.segment_mode === "TakeLeft"
                                    ? "takeLeft(6))"
                                    : "takeRight(7))",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const naming_choice = <ParentMessage>(
    mode: StringDemo.NamingMode,
    model: StringDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        StringDemo.SelectedStringNamingMode({
            mode,
        }),
        to_parent_message,
        model.naming_mode === mode,
        h
    )

const naming_view = <ParentMessage>(
    model: StringDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = StringDemo.naming_result(
        model.naming_mode,
        model.naming_input
    )

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · normalize identifiers",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            naming_choice("Camel", model, to_parent_message, h),
                            naming_choice(
                                "Pascal",
                                model,
                                to_parent_message,
                                h
                            ),
                            naming_choice("Snake", model, to_parent_message, h),
                            naming_choice("Kebab", model, to_parent_message, h),
                            naming_choice(
                                "Constant",
                                model,
                                to_parent_message,
                                h
                            ),
                            naming_choice(
                                "Config",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            h.label(
                                [h.Class("block space-y-2")],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Input"]
                                    ),
                                    h.input([
                                        h.Class(
                                            "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 font-mono outline-none"
                                        ),
                                        h.Value(model.naming_input),
                                        h.OnInput((value) =>
                                            to_parent_message(
                                                StringDemo.UpdatedStringNamingInput(
                                                    { value }
                                                )
                                            )
                                        ),
                                    ]),
                                ]
                            ),
                            h.span(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-chart-1"
                                    ),
                                ],
                                [`→ ${model.naming_mode} →`]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-success/40 bg-success/5 p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Output"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 break-all font-mono text-sm font-semibold text-success"
                                            ),
                                        ],
                                        [result]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Multiline helper",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            h.pre(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 font-mono text-xs leading-6"
                                    ),
                                ],
                                ["  |hello\n  |from\n  |Effect"]
                            ),
                            h.span(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-chart-1"
                                    ),
                                ],
                                ["String.stripMargin →"]
                            ),
                            h.pre(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-success/40 bg-success/5 p-4 font-mono text-xs leading-6 text-success"
                                    ),
                                ],
                                [StringDemo.stripped_margin]
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
    model: StringDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Normalize"
                ? normalize_view(model, to_parent_message, h)
                : model.stage === "Inspect"
                  ? inspect_view(model, to_parent_message, h)
                  : model.stage === "Segment"
                    ? segment_view(model, to_parent_message, h)
                    : naming_view(model, to_parent_message, h),
        ]
    )
