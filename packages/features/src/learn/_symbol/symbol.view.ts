import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as SymbolDemo from "./examples/symbol.ts"

type ToParentMessage<ParentMessage> = (
    message: SymbolDemo.Message
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
    message: SymbolDemo.Message,
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
    model: SymbolDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Symbol examples"),
        ],
        SymbolDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        SymbolDemo.SelectedSymbolStage({
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

const kind_action = <ParentMessage>(
    kind: SymbolDemo.BoundaryKind,
    message: SymbolDemo.Message,
    selected: boolean,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        SymbolDemo.value_label(kind),
        message,
        to_parent_message,
        selected,
        h
    )

const type_badge = <ParentMessage>(
    passes: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                passes
                    ? "rounded-full border border-emerald-500/40 bg-emerald-500/5 px-3 py-1 font-mono text-xs text-emerald-600"
                    : "rounded-full border border-destructive/40 bg-destructive/5 px-3 py-1 font-mono text-xs text-destructive"
            ),
        ],
        [passes ? "true · symbol" : "false · not symbol"]
    )

const guard_view = <ParentMessage>(
    model: SymbolDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const passes = SymbolDemo.guard_result(model.boundary_kind)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · unknown → symbol guard",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "GlobalSymbol",
                                "LocalSymbol",
                                "String",
                                "Number",
                                "Null",
                            ] as const
                        ).map((kind) =>
                            kind_action(
                                kind,
                                SymbolDemo.SelectedSymbolBoundaryKind({
                                    boundary_kind: kind,
                                }),
                                model.boundary_kind === kind,
                                to_parent_message,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-5"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["unknown"]
                                    ),
                                    h.div(
                                        [h.Class("mt-3 font-mono text-sm")],
                                        [
                                            SymbolDemo.value_label(
                                                model.boundary_kind
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["Symbol.isSymbol →"]
                            ),
                            h.div(
                                [h.Class("self-center")],
                                [type_badge(passes, h)]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "The entire Effect Symbol API",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Effect's Symbol module intentionally contains one runtime refinement: isSymbol(u): u is symbol. Its job is to narrow unknown values at boundaries before you use native JavaScript symbol operations.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const refine_view = <ParentMessage>(
    model: SymbolDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const passes = SymbolDemo.guard_result(model.refine_kind)
    const description = SymbolDemo.refined_description(model.refine_kind)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · the guard narrows TypeScript",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "GlobalSymbol",
                                "LocalSymbol",
                                "String",
                                "Number",
                            ] as const
                        ).map((kind) =>
                            kind_action(
                                kind,
                                SymbolDemo.SelectedSymbolRefineKind({
                                    refine_kind: kind,
                                }),
                                model.refine_kind === kind,
                                to_parent_message,
                                h
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr]"
                            ),
                        ],
                        [
                            h.pre(
                                [
                                    h.Class(
                                        "overflow-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 font-mono text-xs leading-6"
                                    ),
                                ],
                                [
                                    `value: unknown

if (Symbol.isSymbol(value)) {
  // value: symbol
  value.description
  globalThis.Symbol.keyFor(value)
}`,
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["→"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        passes
                                            ? "rounded-[var(--radius-surface)] border border-emerald-500/40 bg-emerald-500/5 p-5"
                                            : "rounded-[var(--radius-surface)] border border-destructive/40 bg-destructive/5 p-5"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["branch result"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                passes
                                                    ? "mt-3 font-mono text-sm text-emerald-600"
                                                    : "mt-3 font-mono text-sm text-destructive"
                                            ),
                                        ],
                                        [description]
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

const filter_view = <ParentMessage>(
    model: SymbolDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const source = SymbolDemo.filter_source(model)
    const filtered = SymbolDemo.filtered_symbols(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · refinement composes with collections",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            action(
                                model.filter_include_global
                                    ? "global symbol: on"
                                    : "global symbol: off",
                                SymbolDemo.ToggledGlobalSymbolInFilter(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                model.filter_include_local
                                    ? "local symbol: on"
                                    : "local symbol: off",
                                SymbolDemo.ToggledLocalSymbolInFilter(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-start"
                            ),
                        ],
                        [
                            h.div(
                                [],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Array<unknown>"]
                                    ),
                                    h.div(
                                        [h.Class("space-y-2")],
                                        source.map((value) =>
                                            h.div(
                                                [
                                                    h.Class(
                                                        SymbolDemo.guard_result(
                                                            value === null
                                                                ? "Null"
                                                                : typeof value ===
                                                                    "string"
                                                                  ? "String"
                                                                  : typeof value ===
                                                                      "number"
                                                                    ? "Number"
                                                                    : globalThis.Symbol.keyFor(
                                                                            value as symbol
                                                                        ) !==
                                                                        undefined
                                                                      ? "GlobalSymbol"
                                                                      : "LocalSymbol"
                                                        )
                                                            ? "rounded-[var(--radius-surface)] border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 font-mono text-xs"
                                                            : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    SymbolDemo.unknown_label(
                                                        value
                                                    ),
                                                ]
                                            )
                                        )
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["Array.filter(Symbol.isSymbol) →"]
                            ),
                            h.div(
                                [],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Array<symbol>"]
                                    ),
                                    h.div(
                                        [h.Class("space-y-2")],
                                        filtered.length === 0
                                            ? [
                                                  h.div(
                                                      [
                                                          h.Class(
                                                              "rounded-[var(--radius-surface)] border border-dashed border-border p-4 text-center font-mono text-xs text-muted-foreground"
                                                          ),
                                                      ],
                                                      ["[]"]
                                                  ),
                                              ]
                                            : filtered.map((value) =>
                                                  h.div(
                                                      [
                                                          h.Class(
                                                              "rounded-[var(--radius-surface)] border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 font-mono text-xs text-emerald-600"
                                                          ),
                                                      ],
                                                      [
                                                          SymbolDemo.unknown_label(
                                                              value
                                                          ),
                                                      ]
                                                  )
                                              )
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Why this is useful",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Because isSymbol is a TypeScript refinement, Effect Array.filter preserves the narrowed element type: Iterable<unknown> becomes Array<symbol>, not Array<unknown>.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const identity_choice = <ParentMessage>(
    mode: SymbolDemo.IdentityMode,
    model: SymbolDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        SymbolDemo.SelectedSymbolIdentityMode({
            identity_mode: mode,
        }),
        to_parent_message,
        model.identity_mode === mode,
        h
    )

const identity_view = <ParentMessage>(
    model: SymbolDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = SymbolDemo.identity_result(model.identity_mode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · why symbol identity matters",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            identity_choice(
                                "Local",
                                model,
                                to_parent_message,
                                h
                            ),
                            identity_choice(
                                "Global",
                                model,
                                to_parent_message,
                                h
                            ),
                            identity_choice(
                                "Keys",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr]"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 font-mono text-xs"
                                    ),
                                ],
                                [result.left]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xl font-bold text-violet-500"
                                    ),
                                ],
                                [model.identity_mode === "Keys" ? "vs" : "==="]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 font-mono text-xs"
                                    ),
                                ],
                                [result.right]
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
                                        model.identity_mode === "Local"
                                            ? "font-mono text-3xl font-bold text-destructive"
                                            : "font-mono text-3xl font-bold text-emerald-600"
                                    ),
                                ],
                                [result.headline]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-3 text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [result.detail]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Effect vs JavaScript responsibility",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Symbol(), Symbol.for(), Symbol.keyFor(), Reflect.ownKeys(), and symbol-keyed properties are native JavaScript APIs. Effect's contribution here is the isSymbol refinement that safely gets an unknown value into the symbol world.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: SymbolDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Guard"
                ? guard_view(model, to_parent_message, h)
                : model.stage === "Refine"
                  ? refine_view(model, to_parent_message, h)
                  : model.stage === "Filter"
                    ? filter_view(model, to_parent_message, h)
                    : identity_view(model, to_parent_message, h),
        ]
    )
