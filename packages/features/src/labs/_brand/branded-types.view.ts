import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as BrandedTypes from "./examples/branded-types.ts"

type ToParentMessage<ParentMessage> = (
    message: BrandedTypes.Message
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
                        "flex items-center justify-between border-b-(length:--surface-border-width) border-border px-5 py-3"
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

const badge = <ParentMessage>(
    label: string,
    is_success: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.span(
        [
            h.Class(
                is_success
                    ? "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs tracking-wider text-emerald-600"
                    : "rounded-full border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs tracking-wider text-destructive"
            ),
        ],
        [label]
    )

const action = <ParentMessage>(
    label: string,
    message: BrandedTypes.Message,
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
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-sm transition-colors hover:bg-muted disabled:cursor-default disabled:bg-muted disabled:text-foreground"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const stage_tabs = <ParentMessage>(
    model: BrandedTypes.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Branded types experiments"),
        ],
        BrandedTypes.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        BrandedTypes.SelectedBrandedTypesStage({ stage })
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

const value_chip = <ParentMessage>(
    type_name: string,
    value: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-4 py-3"
            ),
        ],
        [
            h.div(
                [h.Class("text-xs tracking-wider text-muted-foreground")],
                [type_name]
            ),
            h.div([h.Class("mt-1 font-mono text-lg font-semibold")], [value]),
        ]
    )

const structural_view = <ParentMessage>(
    model: BrandedTypes.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · Same shape, different meaning",
                [
                    h.div(
                        [h.Class("grid gap-3 p-5 sm:grid-cols-2")],
                        [
                            value_chip("type UserId = number", "42", h),
                            value_chip("type ProductId = number", "42", h),
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Both aliases are structurally just number, so TypeScript accepts a UserId where a ProductId is expected.",
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Type gate",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "flex flex-wrap items-center gap-3 font-mono text-sm"
                                    ),
                                ],
                                [
                                    h.span([], ["UserId(42)"]),
                                    h.span(
                                        [h.Class("text-muted-foreground")],
                                        ["→"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2"
                                            ),
                                        ],
                                        ["getProductById(ProductId)"]
                                    ),
                                ]
                            ),
                            action(
                                "Run unsafe call",
                                BrandedTypes.ClickedStructuralMixup(),
                                to_parent_message,
                                model.structural_was_sent,
                                h
                            ),
                            model.structural_was_sent
                                ? h.div(
                                      [
                                          h.Class(
                                              "flex items-center justify-between gap-3 rounded-[var(--radius-surface)] bg-amber-500/10 px-4 py-3"
                                          ),
                                      ],
                                      [
                                          h.span(
                                              [h.Class("text-sm")],
                                              [
                                                  "Accepted — the semantic mix-up is invisible to the type system.",
                                              ]
                                          ),
                                          badge("COMPILES", false, h),
                                      ]
                                  )
                                : h.empty,
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const nominal_view = <ParentMessage>(
    model: BrandedTypes.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const accepts = BrandedTypes.nominal_gate_accepts(model)
    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · Nominal identity",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Brand.nominal adds a compile-time identity without changing the runtime number.",
                                ]
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-2")],
                                [
                                    action(
                                        "Use UserId(42)",
                                        BrandedTypes.SelectedNominalKind({
                                            kind: "UserId",
                                        }),
                                        to_parent_message,
                                        model.nominal_kind === "UserId",
                                        h
                                    ),
                                    action(
                                        "Use ProductId(42)",
                                        BrandedTypes.SelectedNominalKind({
                                            kind: "ProductId",
                                        }),
                                        to_parent_message,
                                        model.nominal_kind === "ProductId",
                                        h
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "flex flex-wrap items-center gap-3 font-mono text-sm"
                                    ),
                                ],
                                [
                                    h.span([], [`${model.nominal_kind}(42)`]),
                                    h.span(
                                        [h.Class("text-muted-foreground")],
                                        ["→"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2"
                                            ),
                                        ],
                                        ["getProductById(ProductId)"]
                                    ),
                                ]
                            ),
                            action(
                                "Check with TypeScript",
                                BrandedTypes.ClickedNominalGate(),
                                to_parent_message,
                                model.nominal_was_sent,
                                h
                            ),
                            model.nominal_was_sent
                                ? h.div(
                                      [
                                          h.Class(
                                              accepts
                                                  ? "flex items-center justify-between gap-3 rounded-[var(--radius-surface)] bg-emerald-500/10 px-4 py-3"
                                                  : "flex items-center justify-between gap-3 rounded-[var(--radius-surface)] bg-destructive/10 px-4 py-3"
                                          ),
                                      ],
                                      [
                                          h.span(
                                              [h.Class("text-sm")],
                                              [
                                                  accepts
                                                      ? "Accepted: ProductId is the type the function expects."
                                                      : "Rejected: UserId is not assignable to ProductId.",
                                              ]
                                          ),
                                          badge(
                                              accepts
                                                  ? "ACCEPTED"
                                                  : "TYPE ERROR",
                                              accepts,
                                              h
                                          ),
                                      ]
                                  )
                                : h.empty,
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Runtime inspector",
                [
                    h.div(
                        [h.Class("grid gap-px bg-border sm:grid-cols-3")],
                        [
                            h.div(
                                [h.Class("bg-card p-4")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-xs tracking-wider text-muted-foreground"
                                            ),
                                        ],
                                        ["typeof"]
                                    ),
                                    h.div(
                                        [h.Class("mt-1 font-mono")],
                                        ["number"]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("bg-card p-4")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-xs tracking-wider text-muted-foreground"
                                            ),
                                        ],
                                        ["runtime value"]
                                    ),
                                    h.div([h.Class("mt-1 font-mono")], ["42"]),
                                ]
                            ),
                            h.div(
                                [h.Class("bg-card p-4")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-xs tracking-wider text-muted-foreground"
                                            ),
                                        ],
                                        ["brand property"]
                                    ),
                                    h.div(
                                        [h.Class("mt-1 font-mono")],
                                        ["none"]
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

const input_field = <ParentMessage>(
    label: string,
    value: string,
    on_input: (value: string) => BrandedTypes.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.label(
        [h.Class("block space-y-2")],
        [
            h.span(
                [h.Class("text-xs font-semibold tracking-wider uppercase")],
                [label]
            ),
            h.input([
                h.Class(
                    "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 font-mono outline-none"
                ),
                h.Value(value),
                h.OnInput((next) => to_parent_message(on_input(next))),
            ]),
        ]
    )

const quick_values = <ParentMessage>(
    values: ReadonlyArray<string>,
    on_value: (value: string) => BrandedTypes.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex flex-wrap gap-2")],
        values.map((value) =>
            action(value, on_value(value), to_parent_message, false, h)
        )
    )

const check_row = <ParentMessage>(
    label: string,
    detail: string,
    passes: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "flex flex-wrap items-center justify-between gap-3 border-t-(length:--surface-border-width) border-border px-5 py-3 first:border-t-0"
            ),
        ],
        [
            h.div(
                [],
                [
                    h.div([h.Class("font-mono text-sm")], [label]),
                    h.div(
                        [h.Class("mt-1 text-xs text-muted-foreground")],
                        [detail]
                    ),
                ]
            ),
            badge(passes ? "PASS" : "FAIL", passes, h),
        ]
    )

const refined_view = <ParentMessage>(
    model: BrandedTypes.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const value = BrandedTypes.number_from_input(model.refined_input)
    const passes = BrandedTypes.is_int(value)
    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · Refined brand",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "A validating brand checks the value as it is constructed. In this Effect 4 repo the API is Brand.make; this is the v4 counterpart to the v3 guide's Brand.refined example.",
                                ]
                            ),
                            input_field(
                                "Candidate for Int",
                                model.refined_input,
                                (next) =>
                                    BrandedTypes.UpdatedRefinedInput({
                                        value: next,
                                    }),
                                to_parent_message,
                                h
                            ),
                            quick_values(
                                ["3.14", "3", "-2", "0", "Infinity"],
                                (next) =>
                                    BrandedTypes.UpdatedRefinedInput({
                                        value: next,
                                    }),
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    check_row(
                        "Int.is(value)",
                        passes
                            ? `${String(value)} is an integer`
                            : BrandedTypes.int_error(value),
                        passes,
                        h
                    ),
                ],
                h
            ),
        ]
    )
}

const combined_view = <ParentMessage>(
    model: BrandedTypes.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const value = BrandedTypes.number_from_input(model.combined_input)
    const is_int = BrandedTypes.is_int(value)
    const is_positive = BrandedTypes.is_positive(value)
    const accepts = BrandedTypes.positive_int_accepts(value)
    const errors = BrandedTypes.combined_errors(value)
    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · Brand.all",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Brand.all combines the checks and the type identities: PositiveInt must be both Int and Positive.",
                                ]
                            ),
                            input_field(
                                "Candidate for PositiveInt",
                                model.combined_input,
                                (next) =>
                                    BrandedTypes.UpdatedCombinedInput({
                                        value: next,
                                    }),
                                to_parent_message,
                                h
                            ),
                            quick_values(
                                ["-3.2", "3.2", "-3", "4"],
                                (next) =>
                                    BrandedTypes.UpdatedCombinedInput({
                                        value: next,
                                    }),
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    check_row(
                        "Int",
                        is_int
                            ? "Number.isInteger(value)"
                            : BrandedTypes.int_error(value),
                        is_int,
                        h
                    ),
                    check_row(
                        "Positive",
                        is_positive
                            ? "value > 0"
                            : BrandedTypes.positive_error(value),
                        is_positive,
                        h
                    ),
                    h.div(
                        [
                            h.Class(
                                accepts
                                    ? "flex flex-wrap items-center justify-between gap-3 border-t-(length:--surface-border-width) border-border bg-emerald-500/10 px-5 py-4"
                                    : "flex flex-wrap items-center justify-between gap-3 border-t-(length:--surface-border-width) border-border bg-destructive/10 px-5 py-4"
                            ),
                        ],
                        [
                            h.div(
                                [],
                                [
                                    h.div(
                                        [h.Class("font-semibold")],
                                        [
                                            accepts
                                                ? `PositiveInt(${String(value)})`
                                                : "Construction rejected",
                                        ]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-1 text-xs text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            accepts
                                                ? "Both checks passed."
                                                : errors.join(" · "),
                                        ]
                                    ),
                                ]
                            ),
                            badge(
                                accepts
                                    ? "BRANDED"
                                    : `${errors.length} ERROR${errors.length === 1 ? "" : "S"}`,
                                accepts,
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

export const view = <ParentMessage>(
    model: BrandedTypes.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Structural"
                ? structural_view(model, to_parent_message, h)
                : model.stage === "Nominal"
                  ? nominal_view(model, to_parent_message, h)
                  : model.stage === "Refined"
                    ? refined_view(model, to_parent_message, h)
                    : combined_view(model, to_parent_message, h),
        ]
    )
