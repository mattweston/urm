import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as TaggedErrors from "./examples/tagged-errors.ts"

type ToParentMessage<ParentMessage> = (
    message: TaggedErrors.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const panel = <ParentMessage>(
    label: string,
    status: string,
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
                    h.span(
                        [
                            h.Class(
                                "text-xs tracking-wider text-muted-foreground"
                            ),
                        ],
                        [status]
                    ),
                ]
            ),
            ...children,
        ]
    )

const action = <ParentMessage>(
    label: string,
    message: TaggedErrors.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    active: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: false,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            active
                                ? "rounded-[var(--radius-surface)] bg-foreground px-3 py-2 text-xs font-semibold text-background"
                                : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const badge = <ParentMessage>(
    label: string,
    success: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.span(
        [
            h.Class(
                success
                    ? "rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold tracking-wider text-emerald-600"
                    : "rounded-full bg-destructive/10 px-2 py-1 text-xs font-semibold tracking-wider text-destructive"
            ),
        ],
        [label]
    )

const stage_tabs = <ParentMessage>(
    model: TaggedErrors.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Tagged error experiments"),
        ],
        TaggedErrors.stages.map((stage) =>
            action(
                stage === "CatchOne"
                    ? "Catch one"
                    : stage === "CatchMany"
                      ? "Catch many"
                      : stage,
                TaggedErrors.SelectedTaggedErrorsStage({ stage }),
                to_parent_message,
                model.stage === stage,
                h
            )
        )
    )

const scenario_buttons = <ParentMessage>(
    model: TaggedErrors.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex flex-wrap gap-2")],
        TaggedErrors.scenarios.map((scenario) =>
            action(
                scenario,
                TaggedErrors.SelectedTaggedErrorsScenario({ scenario }),
                to_parent_message,
                model.scenario === scenario,
                h
            )
        )
    )

const error_card = <ParentMessage>(
    tag: TaggedErrors.ErrorTag,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "min-w-0 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "flex items-center gap-2 font-mono text-sm font-semibold"
                    ),
                ],
                [
                    h.span([h.Class("size-2 rounded-full bg-destructive")]),
                    h.span([], [tag]),
                ]
            ),
            h.div(
                [h.Class("mt-4 space-y-2")],
                TaggedErrors.error_fields(tag).map(([name, value]) =>
                    h.div(
                        [
                            h.Class(
                                "flex items-center justify-between gap-3 text-xs"
                            ),
                        ],
                        [
                            h.span([h.Class("text-muted-foreground")], [name]),
                            h.span([h.Class("font-mono")], [value]),
                        ]
                    )
                )
            ),
            h.div(
                [
                    h.Class(
                        "mt-4 border-t-(length:--surface-border-width) border-dashed border-border pt-3 font-mono text-xs text-muted-foreground"
                    ),
                ],
                [`_tag: "${tag}"`]
            ),
        ]
    )

const channel = <ParentMessage>(
    tags: ReadonlyArray<TaggedErrors.ErrorTag>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "flex flex-wrap items-center justify-between gap-3 bg-foreground px-5 py-3 text-background"
            ),
        ],
        [
            h.span(
                [
                    h.Class(
                        "text-xs tracking-widest uppercase text-background/60"
                    ),
                ],
                ["Error channel"]
            ),
            h.span(
                [h.Class("font-mono text-xs")],
                [TaggedErrors.channel_label(tags)]
            ),
        ]
    )

const outcome = <ParentMessage>(
    value: TaggedErrors.Outcome,
    h: HtmlBuilder<ParentMessage>
): Html => {
    if (value._tag === "Success") {
        return h.div(
            [h.Class("flex flex-wrap items-center gap-3")],
            [
                badge("SUCCESS", true, h),
                h.span([h.Class("font-semibold")], [value.user.name]),
                h.span(
                    [h.Class("text-xs text-muted-foreground")],
                    [`user:${value.user.id}`]
                ),
            ]
        )
    }
    if (value._tag === "Recovered") {
        return h.div(
            [h.Class("flex flex-wrap items-center gap-3")],
            [
                badge("RECOVERED", true, h),
                h.span([h.Class("font-semibold")], [value.value]),
                h.span(
                    [h.Class("text-xs text-muted-foreground")],
                    [`caught ${value.from}`]
                ),
            ]
        )
    }
    return h.div(
        [h.Class("flex flex-wrap items-center gap-3")],
        [
            badge("FAILURE", false, h),
            h.span([h.Class("font-semibold")], [value.error._tag]),
        ]
    )
}

const run_row = <ParentMessage>(
    model: TaggedErrors.Model,
    caught_tags: ReadonlyArray<TaggedErrors.ErrorTag>,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "flex flex-wrap items-center gap-3 border-t-(length:--surface-border-width) border-border p-5"
            ),
        ],
        [
            model.has_run
                ? outcome(
                      TaggedErrors.recovered_outcome(
                          model.scenario,
                          caught_tags
                      ),
                      h
                  )
                : h.span(
                      [h.Class("text-sm text-muted-foreground")],
                      ["Run the selected request."]
                  ),
            h.div(
                [h.Class("ml-auto")],
                [
                    action(
                        "Run request",
                        TaggedErrors.ClickedRunTaggedErrors(),
                        to_parent_message,
                        false,
                        h
                    ),
                ]
            ),
        ]
    )

const define_view = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    panel(
        "1 · Data.TaggedError",
        "DISCRIMINATED UNION",
        [
            h.div(
                [h.Class("grid gap-3 p-5 md:grid-cols-3")],
                TaggedErrors.error_tags.map((tag) => error_card(tag, h))
            ),
            h.p(
                [
                    h.Class(
                        "border-t-(length:--surface-border-width) border-border px-5 py-4 text-sm leading-6 text-muted-foreground"
                    ),
                ],
                [
                    "The literal _tag is runtime data and TypeScript's discriminator. Each case keeps only the payload it needs; tag strings must be unique.",
                ]
            ),
        ],
        h
    )

const channel_view = <ParentMessage>(
    model: TaggedErrors.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · Typed error channel",
                "Effect<User, E>",
                [
                    h.div(
                        [h.Class("space-y-5 p-5")],
                        [
                            scenario_buttons(model, to_parent_message, h),
                            h.div(
                                [
                                    h.Class(
                                        "grid items-center gap-2 text-center sm:grid-cols-[1fr_auto_1fr_auto_1fr]"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-3"
                                            ),
                                        ],
                                        [
                                            h.span(
                                                [
                                                    h.Class(
                                                        "text-sm font-semibold"
                                                    ),
                                                ],
                                                ["scenario"]
                                            ),
                                        ]
                                    ),
                                    h.span(
                                        [h.Class("text-muted-foreground")],
                                        ["→"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-3"
                                            ),
                                        ],
                                        [
                                            h.span(
                                                [
                                                    h.Class(
                                                        "text-sm font-semibold"
                                                    ),
                                                ],
                                                ["Effect.gen"]
                                            ),
                                        ]
                                    ),
                                    h.span(
                                        [h.Class("text-muted-foreground")],
                                        ["→"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-3"
                                            ),
                                        ],
                                        [
                                            h.span(
                                                [h.Class("font-mono text-xs")],
                                                [model.scenario]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    run_row(model, [], to_parent_message, h),
                    channel(TaggedErrors.error_tags, h),
                ],
                h
            ),
            panel(
                "Yieldable failure",
                "Effect.gen",
                [
                    h.div(
                        [
                            h.Class(
                                "flex flex-wrap items-center justify-center gap-3 p-5"
                            ),
                        ],
                        [
                            h.span(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] bg-muted px-3 py-2 font-mono text-xs"
                                    ),
                                ],
                                [
                                    `yield* new ${model.scenario === "Success" ? "UserNotFound" : model.scenario}({ … })`,
                                ]
                            ),
                            h.span([h.Class("text-muted-foreground")], ["≡"]),
                            h.span(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] bg-muted px-3 py-2 font-mono text-xs"
                                    ),
                                ],
                                ["Effect.fail(error)"]
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const catch_one_view = <ParentMessage>(
    model: TaggedErrors.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const remaining = TaggedErrors.remaining_errors([model.caught_tag])
    return panel(
        "3 · Effect.catchTag",
        "SELECTIVE RECOVERY",
        [
            h.div(
                [h.Class("space-y-5 p-5")],
                [
                    h.div(
                        [],
                        [
                            h.span(
                                [
                                    h.Class(
                                        "mb-2 block text-xs font-semibold tracking-widest uppercase text-muted-foreground"
                                    ),
                                ],
                                ["Handler"]
                            ),
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                TaggedErrors.error_tags.map((tag) =>
                                    action(
                                        tag,
                                        TaggedErrors.SelectedCaughtTag({ tag }),
                                        to_parent_message,
                                        model.caught_tag === tag,
                                        h
                                    )
                                )
                            ),
                        ]
                    ),
                    scenario_buttons(model, to_parent_message, h),
                    h.div(
                        [
                            h.Class(
                                "grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr]"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-3"
                                    ),
                                ],
                                [
                                    h.span(
                                        [h.Class("font-mono text-xs")],
                                        [
                                            TaggedErrors.channel_label(
                                                TaggedErrors.error_tags
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.span(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] bg-foreground p-3 text-center text-background"
                                    ),
                                ],
                                [
                                    h.span(
                                        [h.Class("font-mono text-xs")],
                                        [`catchTag(${model.caught_tag})`]
                                    ),
                                ]
                            ),
                            h.span(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-3"
                                    ),
                                ],
                                [
                                    h.span(
                                        [h.Class("font-mono text-xs")],
                                        [TaggedErrors.channel_label(remaining)]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            run_row(model, [model.caught_tag], to_parent_message, h),
            channel(remaining, h),
        ],
        h
    )
}

const catch_many_view = <ParentMessage>(
    model: TaggedErrors.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const remaining = TaggedErrors.remaining_errors(model.caught_tags)
    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · Effect.catchTags",
                "HANDLER TABLE",
                [
                    h.div(
                        [h.Class("space-y-5 p-5")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border"
                                    ),
                                ],
                                TaggedErrors.error_tags.map((tag) =>
                                    Ui.Button.view(
                                        {
                                            onClick: to_parent_message(
                                                TaggedErrors.ToggledCaughtTag({
                                                    tag,
                                                })
                                            ),
                                            isDisabled: false,
                                            toView: (attributes) =>
                                                h.button(
                                                    [
                                                        ...attributes.button,
                                                        h.Class(
                                                            "grid w-full grid-cols-[1fr_auto] items-center gap-3 border-t-(length:--surface-border-width) border-border px-4 py-3 text-left first:border-t-0 hover:bg-muted"
                                                        ),
                                                    ],
                                                    [
                                                        h.span(
                                                            [
                                                                h.Class(
                                                                    "font-mono text-xs"
                                                                ),
                                                            ],
                                                            [tag]
                                                        ),
                                                        h.span(
                                                            [
                                                                h.Class(
                                                                    "text-xs text-muted-foreground"
                                                                ),
                                                            ],
                                                            [
                                                                model.caught_tags.includes(
                                                                    tag
                                                                )
                                                                    ? "✓ handled"
                                                                    : "+ flows through",
                                                            ]
                                                        ),
                                                    ]
                                                ),
                                        },
                                        h
                                    )
                                )
                            ),
                            scenario_buttons(model, to_parent_message, h),
                        ]
                    ),
                    run_row(model, model.caught_tags, to_parent_message, h),
                    channel(remaining, h),
                ],
                h
            ),
            panel(
                "Exhaustive recovery",
                remaining.length === 0 ? "COMPLETE" : "INCOMPLETE",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            remaining.length === 0
                                ? "Every expected tagged failure has a handler, so the resulting error channel is never."
                                : `Still unhandled: ${TaggedErrors.channel_label(remaining)}`,
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: TaggedErrors.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Define"
                ? define_view(h)
                : model.stage === "Channel"
                  ? channel_view(model, to_parent_message, h)
                  : model.stage === "CatchOne"
                    ? catch_one_view(model, to_parent_message, h)
                    : catch_many_view(model, to_parent_message, h),
        ]
    )
