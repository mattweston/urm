import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./unify.ts"

type ToParentMessage<ParentMessage> = (message: Demo.Message) => ParentMessage

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
    message: Demo.Message,
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

const result_card = <ParentMessage>(
    label: string,
    value: string,
    tone: "cyan" | "green" | "amber" | "violet",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const classes =
        tone === "green"
            ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600"
            : tone === "amber"
              ? "border-amber-500/40 bg-amber-500/5 text-amber-600"
              : tone === "violet"
                ? "border-violet-500/40 bg-violet-500/5 text-violet-500"
                : "border-cyan-500/40 bg-cyan-500/5 text-cyan-500"

    return h.div(
        [h.Class(`rounded-[var(--radius-surface)] border p-4 ${classes}`)],
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
                [h.Class("mt-2 break-words font-mono text-sm font-semibold")],
                [value]
            ),
        ]
    )
}

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
            h.AriaLabel("Effect Unify examples"),
        ],
        Demo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        Demo.Message.SelectedUnifyStage({
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

const built_ins_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · normalize protocol-enabled Effect data types",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Option", "Result", "Effect"] as const).map(
                            (builtInMode) =>
                                action(
                                    builtInMode,
                                    Demo.Message.SelectedUnifyBuiltInMode({
                                        builtInMode,
                                    }),
                                    to_parent_message,
                                    model.builtInMode === builtInMode,
                                    h
                                )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
                            ),
                        ],
                        (["String", "Number"] as const).map((valueKind) =>
                            action(
                                valueKind,
                                Demo.Message.SelectedUnifyValueKind({
                                    valueKind,
                                }),
                                to_parent_message,
                                model.valueKind === valueKind,
                                h
                            )
                        )
                    ),
                    ...(model.builtInMode === "Result"
                        ? [
                              h.div(
                                  [
                                      h.Class(
                                          "border-t-(length:--surface-border-width) border-border p-4"
                                      ),
                                  ],
                                  [
                                      action(
                                          model.resultShouldFail
                                              ? "Failure"
                                              : "Success",
                                          Demo.Message.ToggledUnifyResultFailure(),
                                          to_parent_message,
                                          false,
                                          h
                                      ),
                                  ]
                              ),
                          ]
                        : []),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 lg:grid-cols-3"
                            ),
                        ],
                        [
                            result_card(
                                "before Unify",
                                Demo.built_in_raw_type(model.builtInMode),
                                "amber",
                                h
                            ),
                            result_card(
                                "after Unify",
                                Demo.built_in_unified_type(model.builtInMode),
                                "green",
                                h
                            ),
                            result_card(
                                "runtime value",
                                Demo.built_in_runtime_value(model),
                                "cyan",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "The value does not change",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Unification changes the inferred public type. It does not map, clone, execute, or otherwise transform the runtime value. Effect's own type tests use this to collapse unions such as Option<string> | Option<number> into Option<string | number>.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const protocol_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · the three-symbol protocol",
                [
                    h.div(
                        [h.Class("grid gap-3 p-5 md:grid-cols-3")],
                        Demo.protocol_symbols.map((symbol) =>
                            result_card(
                                symbol.name,
                                symbol.purpose,
                                "violet",
                                h
                            )
                        )
                    ),
                ],
                h
            ),
            panel(
                "Custom protocol type",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["String", "Number"] as const).map((valueKind) =>
                            action(
                                valueKind,
                                Demo.Message.SelectedUnifyValueKind({
                                    valueKind,
                                }),
                                to_parent_message,
                                model.valueKind === valueKind,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr]"
                            ),
                        ],
                        [
                            result_card(
                                "selected member",
                                Demo.protocol_input_type(model.valueKind),
                                "cyan",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["Unify<union> →"]
                            ),
                            result_card(
                                "public union",
                                `string | number · witness ${Demo.protocol_witness(model.valueKind)}`,
                                "green",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const ignore_view = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · ignoreSymbol filters protocol entries",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 md:grid-cols-2")],
                        [
                            result_card(
                                "Debug is ignored",
                                Demo.ignored_protocol_type(),
                                "green",
                                h
                            ),
                            result_card(
                                "No ignoreSymbol",
                                Demo.included_protocol_type(),
                                "amber",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Protocol bookkeeping, not a runtime filter",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "ignoreSymbol names entries inside the unifySymbol protocol map that should not contribute to the widened type. Nothing is removed from a JavaScript object at runtime.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const helper_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · Unify.unify is a typed identity function",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Value", "Function", "Curried"] as const).map(
                            (helperMode) =>
                                action(
                                    helperMode,
                                    Demo.Message.SelectedUnifyHelperMode({
                                        helperMode,
                                    }),
                                    to_parent_message,
                                    model.helperMode === helperMode,
                                    h
                                )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
                            ),
                        ],
                        (["String", "Number"] as const).map((valueKind) =>
                            action(
                                valueKind,
                                Demo.Message.SelectedUnifyValueKind({
                                    valueKind,
                                }),
                                to_parent_message,
                                model.valueKind === valueKind,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 lg:grid-cols-3"
                            ),
                        ],
                        [
                            result_card(
                                "expression",
                                Demo.helper_expression(model.helperMode),
                                "violet",
                                h
                            ),
                            result_card(
                                "runtime",
                                Demo.helper_runtime_value(
                                    model.helperMode,
                                    model.valueKind
                                ),
                                "cyan",
                                h
                            ),
                            result_card(
                                "inferred type",
                                Demo.helper_type_result(model.helperMode),
                                "green",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Curried functions are supported explicitly",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "The helper has overloads that preserve argument lists through nested functions and apply Unify to the final return type. The vendored source includes overloads through five curried function layers.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

export const view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "BuiltIns"
                ? built_ins_view(model, to_parent_message, h)
                : model.stage === "Protocol"
                  ? protocol_view(model, to_parent_message, h)
                  : model.stage === "Ignore"
                    ? ignore_view(h)
                    : helper_view(model, to_parent_message, h),
        ]
    )
