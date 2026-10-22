import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as HashDemo from "./hash.ts"

type ToParentMessage<ParentMessage> = (
    message: HashDemo.Message
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
    message: HashDemo.Message,
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
    model: HashDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Hash examples"),
        ],
        HashDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        HashDemo.SelectedHashStage({ stage })
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

const result_card = <ParentMessage>(
    label: string,
    value: string,
    tone: "cyan" | "green" | "amber" | "red" | "violet",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const classes =
        tone === "green"
            ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600"
            : tone === "amber"
              ? "border-amber-500/40 bg-amber-500/5 text-amber-600"
              : tone === "red"
                ? "border-destructive/40 bg-destructive/5 text-destructive"
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

const fingerprint_action = <ParentMessage>(
    kind: HashDemo.FingerprintKind,
    model: HashDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        kind,
        HashDemo.SelectedFingerprintKind({
            fingerprint_kind: kind,
        }),
        to_parent_message,
        model.fingerprint_kind === kind,
        h
    )

const fingerprint_view = <ParentMessage>(
    model: HashDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const value = HashDemo.fingerprint_label(model.fingerprint_kind)
    const hash = HashDemo.fingerprint_hash(model.fingerprint_kind)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · small numeric fingerprints",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Number",
                                "String",
                                "Boolean",
                                "Array",
                                "Object",
                            ] as const
                        ).map((kind) =>
                            fingerprint_action(
                                kind,
                                model,
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
                            result_card("value", value, "cyan", h),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["Hash.hash →"]
                            ),
                            result_card("hash", String(hash), "violet", h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Not cryptographic",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Effect hashes are small numeric fingerprints used to bucket values efficiently in hash-based data structures. They are not cryptographic digests, stable serialization IDs, or proof that two values are equal.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const structure_action = <ParentMessage>(
    mode: HashDemo.StructureMode,
    model: HashDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        HashDemo.SelectedHashStructureMode({
            structure_mode: mode,
        }),
        to_parent_message,
        model.structure_mode === mode,
        h
    )

const structure_view = <ParentMessage>(
    model: HashDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = HashDemo.structure_result(model.structure_mode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · structural, selected, or reference identity",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "AllFields",
                                "SelectedFields",
                                "Reference",
                            ] as const
                        ).map((mode) =>
                            structure_action(mode, model, to_parent_message, h)
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr]"
                            ),
                        ],
                        [
                            result_card("left", result.left, "cyan", h),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                [
                                    model.structure_mode === "Reference"
                                        ? "identity hash"
                                        : "structural hash",
                                ]
                            ),
                            result_card(
                                "right",
                                result.right,
                                result.equal_hash ? "green" : "amber",
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        result.equal_hash
                                            ? "font-mono text-xl font-bold text-emerald-600"
                                            : "font-mono text-xl font-bold text-amber-600"
                                    ),
                                ],
                                [`same hash: ${String(result.equal_hash)}`]
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
        ]
    )
}

const custom_id_action = <ParentMessage>(
    id: HashDemo.CustomId,
    side: "left" | "right",
    model: HashDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        id,
        side === "left"
            ? HashDemo.SelectedCustomHashLeft({
                  custom_left: id,
              })
            : HashDemo.SelectedCustomHashRight({
                  custom_right: id,
              }),
        to_parent_message,
        side === "left" ? model.custom_left === id : model.custom_right === id,
        h
    )

const custom_view = <ParentMessage>(
    model: HashDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = HashDemo.custom_result(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · custom Hash + Equal",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 md:grid-cols-2")],
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
                                        ["left UserId"]
                                    ),
                                    h.div(
                                        [h.Class("flex flex-wrap gap-2")],
                                        (["u-1a", "u-1b", "u-2"] as const).map(
                                            (id) =>
                                                custom_id_action(
                                                    id,
                                                    "left",
                                                    model,
                                                    to_parent_message,
                                                    h
                                                )
                                        )
                                    ),
                                ]
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
                                        ["right UserId"]
                                    ),
                                    h.div(
                                        [h.Class("flex flex-wrap gap-2")],
                                        (["u-1a", "u-1b", "u-2"] as const).map(
                                            (id) =>
                                                custom_id_action(
                                                    id,
                                                    "right",
                                                    model,
                                                    to_parent_message,
                                                    h
                                                )
                                        )
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-2"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                                    ),
                                ],
                                [
                                    result_card(
                                        "Equal.equals",
                                        String(result.equal),
                                        result.equal ? "green" : "amber",
                                        h
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-3 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            `${HashDemo.custom_label(model.custom_left)} vs ${HashDemo.custom_label(model.custom_right)}`,
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                                    ),
                                ],
                                [
                                    result_card(
                                        "same Hash.hash",
                                        String(result.same_hash),
                                        result.same_hash ? "green" : "amber",
                                        h
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-3 grid grid-cols-2 gap-2 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            h.span(
                                                [],
                                                [`left ${result.left_hash}`]
                                            ),
                                            h.span(
                                                [],
                                                [`right ${result.right_hash}`]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Implementation",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `class UserId implements Equal.Equal {
  constructor(readonly value: string) {}

  [Equal.symbol](that: Equal.Equal) {
    return that instanceof UserId &&
      this.value === that.value
  }

  [Hash.symbol]() {
    return Hash.string(this.value)
  }
}`,
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const contract_action = <ParentMessage>(
    mode: HashDemo.ContractMode,
    model: HashDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        HashDemo.SelectedHashContractMode({
            contract_mode: mode,
        }),
        to_parent_message,
        model.contract_mode === mode,
        h
    )

const contract_view = <ParentMessage>(
    model: HashDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = HashDemo.contract_result(model.contract_mode)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · the hash contract",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Collision", "Equality", "Mutation"] as const).map(
                            (mode) =>
                                contract_action(
                                    mode,
                                    model,
                                    to_parent_message,
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
                            result_card("left", result.left, "cyan", h),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["vs"]
                            ),
                            result_card("right", result.right, "cyan", h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-px border-t-(length:--surface-border-width) border-border bg-border sm:grid-cols-2"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("bg-card p-4")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["hash relation"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-sm font-semibold text-violet-500"
                                            ),
                                        ],
                                        [result.hash_relation]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("bg-card p-4")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["equality / structure"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-sm font-semibold text-emerald-600"
                                            ),
                                        ],
                                        [result.equality_relation]
                                    ),
                                ]
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
                                [h.Class("font-mono text-xl font-bold")],
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
        ]
    )
}

export const view = <ParentMessage>(
    model: HashDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Fingerprint"
                ? fingerprint_view(model, to_parent_message, h)
                : model.stage === "Structure"
                  ? structure_view(model, to_parent_message, h)
                  : model.stage === "Custom"
                    ? custom_view(model, to_parent_message, h)
                    : contract_view(model, to_parent_message, h),
        ]
    )
