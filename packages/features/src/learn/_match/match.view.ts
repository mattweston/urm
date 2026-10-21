import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as MatchDemo from "./match.ts"

type ToParentMessage<ParentMessage> = (
    message: MatchDemo.Message
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
    message: MatchDemo.Message,
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
    model: MatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Match examples"),
        ],
        MatchDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        MatchDemo.SelectedMatchStage({ stage })
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
    output: string,
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
                [output]
            ),
        ]
    )
}

const entry_mode_action = <ParentMessage>(
    mode: MatchDemo.EntryMode,
    model: MatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode === "Value" ? "Match.value" : "Match.type",
        MatchDemo.SelectedMatchEntryMode({ entry_mode: mode }),
        to_parent_message,
        model.entry_mode === mode,
        h
    )

const primitive_action = <ParentMessage>(
    kind: MatchDemo.PrimitiveKind,
    model: MatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        kind,
        MatchDemo.SelectedMatchPrimitiveKind({ primitive_kind: kind }),
        to_parent_message,
        model.primitive_kind === kind,
        h
    )

const entry_view = <ParentMessage>(
    model: MatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const input = MatchDemo.primitive_value(model.primitive_kind)
    const output = MatchDemo.entry_output(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · one value or a reusable matcher",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            entry_mode_action(
                                "Value",
                                model,
                                to_parent_message,
                                h
                            ),
                            entry_mode_action(
                                "Type",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
                            ),
                        ],
                        [
                            primitive_action(
                                "String",
                                model,
                                to_parent_message,
                                h
                            ),
                            primitive_action(
                                "Number",
                                model,
                                to_parent_message,
                                h
                            ),
                            primitive_action(
                                "Boolean",
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
                            result_card(
                                "input",
                                JSON.stringify(input),
                                "cyan",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                [
                                    model.entry_mode === "Value"
                                        ? "match now →"
                                        : "compiled matcher →",
                                ]
                            ),
                            result_card("output", output, "green", h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Entry point",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            model.entry_mode === "Value"
                                ? "Match.value(input) carries one concrete value through the cases and produces the result immediately when you finalize the matcher."
                                : "Match.type<T>() builds a reusable matcher. After exhaustive/orElse/option/result finalization you get a function that can be called repeatedly with T.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const role_action = <ParentMessage>(
    role: MatchDemo.Role,
    model: MatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        role,
        MatchDemo.SelectedMatchPatternRole({ pattern_role: role }),
        to_parent_message,
        model.pattern_role === role,
        h
    )

const pattern_row = <ParentMessage>(
    pattern: string,
    result: string,
    matched: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                matched
                    ? "grid gap-3 rounded-[var(--radius-surface)] border border-emerald-500/40 bg-emerald-500/5 p-3 md:grid-cols-[1fr_auto_1fr] md:items-center"
                    : "grid gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3 opacity-45 md:grid-cols-[1fr_auto_1fr] md:items-center"
            ),
        ],
        [
            h.code([h.Class("font-mono text-xs")], [pattern]),
            h.span([h.Class("text-center text-muted-foreground")], ["→"]),
            h.span(
                [
                    h.Class(
                        matched
                            ? "font-mono text-xs font-semibold text-emerald-600"
                            : "font-mono text-xs"
                    ),
                ],
                [result]
            ),
        ]
    )

const patterns_view = <ParentMessage>(
    model: MatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const user = MatchDemo.pattern_user(model)
    const output = MatchDemo.pattern_output(model)

    const admin = user.role === "admin"
    const editorActive = user.role === "editor" && user.active
    const editorInactive = user.role === "editor" && !user.active
    const viewer = user.role === "viewer"

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · ordered structural patterns",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            role_action("admin", model, to_parent_message, h),
                            role_action("editor", model, to_parent_message, h),
                            role_action("viewer", model, to_parent_message, h),
                            action(
                                model.pattern_active
                                    ? "active: true"
                                    : "active: false",
                                MatchDemo.ToggledMatchPatternActive(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 lg:grid-cols-[0.75fr_1.25fr]"
                            ),
                        ],
                        [
                            h.div(
                                [],
                                [
                                    result_card(
                                        "input User",
                                        JSON.stringify(user, null, 2),
                                        "cyan",
                                        h
                                    ),
                                    h.div(
                                        [h.Class("mt-3")],
                                        [
                                            result_card(
                                                "matched output",
                                                output,
                                                "green",
                                                h
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("space-y-2")],
                                [
                                    pattern_row(
                                        '{ role: "admin" }',
                                        "full access",
                                        admin,
                                        h
                                    ),
                                    pattern_row(
                                        '{ role: "editor", active: true }',
                                        "edit access",
                                        editorActive,
                                        h
                                    ),
                                    pattern_row(
                                        '{ role: "editor", active: false }',
                                        "editor suspended",
                                        editorInactive,
                                        h
                                    ),
                                    pattern_row(
                                        '{ role: "viewer" }',
                                        "read only",
                                        viewer,
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Cases are ordered",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Match.when supports literals, object shapes, refinements such as Match.string / number / boolean, predicates, and more. The first matching case wins, so put more specific structural cases before broader ones.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const state_action = <ParentMessage>(
    kind: MatchDemo.StateKind,
    model: MatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        kind,
        MatchDemo.SelectedMatchStateKind({ state_kind: kind }),
        to_parent_message,
        model.state_kind === kind,
        h
    )

const tags_view = <ParentMessage>(
    model: MatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const state = MatchDemo.request_state(model.state_kind)
    const output = MatchDemo.state_output(model.state_kind)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · discriminated unions by _tag",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Idle", "Loading", "Success", "Error"] as const).map(
                            (kind) =>
                                state_action(kind, model, to_parent_message, h)
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            result_card(
                                "RequestState",
                                JSON.stringify(state, null, 2),
                                "cyan",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["tagsExhaustive →"]
                            ),
                            result_card("output", output, "green", h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "One handler per tag",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `Match.tagsExhaustive({
  Idle: () => "Nothing requested",
  Loading: () => "Loading…",
  Success: ({ data }) => \`Loaded: \${data}\`,
  Error: ({ message }) => \`Error: \${message}\`
})`,
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const completion_mode_action = <ParentMessage>(
    mode: MatchDemo.CompletionMode,
    model: MatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        MatchDemo.SelectedMatchCompletionMode({
            completion_mode: mode,
        }),
        to_parent_message,
        model.completion_mode === mode,
        h
    )

const completion_role_action = <ParentMessage>(
    role: MatchDemo.Role,
    model: MatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        role,
        MatchDemo.SelectedMatchCompletionRole({
            completion_role: role,
        }),
        to_parent_message,
        model.completion_role === role,
        h
    )

const complete_view = <ParentMessage>(
    model: MatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = MatchDemo.completion_output(model)

    const tone =
        result.tone === "success"
            ? "green"
            : result.tone === "none"
              ? "amber"
              : result.tone === "failure"
                ? "red"
                : "violet"

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · choose how unmatched cases finish",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Exhaustive",
                                "Option",
                                "Result",
                                "Fallback",
                            ] as const
                        ).map((mode) =>
                            completion_mode_action(
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
                                "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
                            ),
                        ],
                        (["admin", "editor", "viewer"] as const).map((role) =>
                            completion_role_action(
                                role,
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
                            result_card(
                                "input Role",
                                model.completion_role,
                                "cyan",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                [
                                    `Match.${model.completion_mode === "Fallback" ? "orElse" : model.completion_mode.toLowerCase()} →`,
                                ]
                            ),
                            result_card("output", result.output, tone, h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [result.detail]
                    ),
                ],
                h
            ),
            panel(
                "Coverage trade-off",
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
                                                "font-mono text-xs font-semibold text-emerald-600"
                                            ),
                                        ],
                                        ["Match.exhaustive"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-xs leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Compile-time guarantee that no input case remains unmatched.",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("p-4")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold text-violet-500"
                                            ),
                                        ],
                                        ["option / result / orElse"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-xs leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Deliberately allow incomplete matching and choose how the remaining input is represented.",
                                        ]
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

export const view = <ParentMessage>(
    model: MatchDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Entry"
                ? entry_view(model, to_parent_message, h)
                : model.stage === "Patterns"
                  ? patterns_view(model, to_parent_message, h)
                  : model.stage === "Tags"
                    ? tags_view(model, to_parent_message, h)
                    : complete_view(model, to_parent_message, h),
        ]
    )
