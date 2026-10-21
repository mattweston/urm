import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as GeneratorYield from "./generator-yield.ts"

type ToParentMessage<ParentMessage> = (
    message: GeneratorYield.Message
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
    message: GeneratorYield.Message,
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
    model: GeneratorYield.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("yield experiments"),
        ],
        GeneratorYield.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        GeneratorYield.SelectedGeneratorYieldStage({ stage })
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

const log_view = <ParentMessage>(
    entries: ReadonlyArray<string>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    entries.length === 0
        ? h.div(
              [h.Class("px-5 py-8 text-center text-sm text-muted-foreground")],
              ["No execution yet."]
          )
        : h.div(
              [],
              entries.map((entry, index) =>
                  h.div(
                      [
                          h.Class(
                              "grid grid-cols-[2.5rem_1fr] gap-3 border-t-(length:--surface-border-width) border-border px-5 py-3 first:border-t-0"
                          ),
                      ],
                      [
                          h.span(
                              [
                                  h.Class(
                                      "font-mono text-xs text-muted-foreground"
                                  ),
                              ],
                              [String(index + 1).padStart(2, "0")]
                          ),
                          h.span([h.Class("font-mono text-xs")], [entry]),
                      ]
                  )
              )
          )

const unwrap_row = <ParentMessage>(
    number: string,
    expression: string,
    effect_type: string,
    value: string,
    is_done: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                is_done
                    ? "grid gap-2 border-t-(length:--surface-border-width) border-border px-5 py-4 first:border-t-0 sm:grid-cols-[2rem_1fr_4rem_0.8fr] sm:items-center"
                    : "grid gap-2 border-t-(length:--surface-border-width) border-border px-5 py-4 opacity-40 first:border-t-0 sm:grid-cols-[2rem_1fr_4rem_0.8fr] sm:items-center"
            ),
        ],
        [
            h.span(
                [h.Class("font-mono text-xs text-muted-foreground")],
                [number]
            ),
            h.div(
                [],
                [
                    h.div([h.Class("font-mono text-sm")], [expression]),
                    h.div(
                        [
                            h.Class(
                                "mt-1 font-mono text-[11px] text-muted-foreground"
                            ),
                        ],
                        [effect_type]
                    ),
                ]
            ),
            h.span(
                [
                    h.Class(
                        "font-mono text-xs font-bold text-chart-4 sm:text-center"
                    ),
                ],
                ["yield*"]
            ),
            h.div(
                [
                    h.Class(
                        is_done
                            ? "rounded-[var(--radius-surface)] border border-chart-4/40 bg-chart-4/5 px-3 py-2 font-mono text-xs text-chart-4"
                            : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 font-mono text-xs text-muted-foreground"
                    ),
                ],
                [value]
            ),
        ]
    )

const unwrap_view = <ParentMessage>(
    model: GeneratorYield.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · unwrap the success value",
                [
                    unwrap_row(
                        "01",
                        'users.find("42")',
                        "Effect<User, UserNotFound, UserRepo>",
                        model.unwrap_step >= 1
                            ? 'User { name: "Ada" }'
                            : "waiting",
                        model.unwrap_step >= 1,
                        h
                    ),
                    unwrap_row(
                        "02",
                        "posts.forUser(user.id)",
                        "Effect<Post[], PostsUnavailable, PostsRepo>",
                        model.unwrap_step >= 2 ? "Post[2]" : "waiting",
                        model.unwrap_step >= 2,
                        h
                    ),
                    unwrap_row(
                        "03",
                        "return { user, posts }",
                        "Profile",
                        model.unwrap_step >= 3 ? "Profile ready" : "waiting",
                        model.unwrap_step >= 3,
                        h
                    ),
                    h.div(
                        [
                            h.Class(
                                "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
                            ),
                        ],
                        [
                            action(
                                "Run next yield*",
                                GeneratorYield.ClickedAdvanceGeneratorYieldUnwrap(),
                                to_parent_message,
                                model.unwrap_step === 3,
                                h
                            ),
                            action(
                                "Reset",
                                GeneratorYield.ClickedResetGeneratorYieldUnwrap(),
                                to_parent_message,
                                model.unwrap_step === 0,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel("Execution", [log_view(model.unwrap_log, h)], h),
        ]
    )

const channel_card = <ParentMessage>(
    label: string,
    value: string,
    note: string,
    class_name: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                `rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-4 ${class_name}`
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
                    ),
                ],
                [label]
            ),
            h.div([h.Class("mt-4 font-mono text-sm font-semibold")], [value]),
            h.div(
                [h.Class("mt-2 text-xs leading-5 text-muted-foreground")],
                [note]
            ),
        ]
    )

const channels_view = <ParentMessage>(
    model: GeneratorYield.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const state = GeneratorYield.channel_state(model.channel_step)
    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · A, E and R compose",
                [
                    h.div(
                        [h.Class("grid gap-3 p-5 md:grid-cols-3")],
                        [
                            channel_card(
                                "A · success",
                                state.success,
                                "yield* gives this value to the generator",
                                "bg-success/5",
                                h
                            ),
                            channel_card(
                                "E · error",
                                state.error,
                                "possible failures remain in the whole program",
                                "bg-destructive/5",
                                h
                            ),
                            channel_card(
                                "R · requirements",
                                state.requirements,
                                "required services accumulate too",
                                "bg-chart-1/5",
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-2 border-t-(length:--surface-border-width) border-border p-4 md:grid-cols-3"
                            ),
                        ],
                        [
                            action(
                                "1 · yield* findUser",
                                GeneratorYield.ClickedAdvanceGeneratorYieldChannels(),
                                to_parent_message,
                                model.channel_step >= 1,
                                h
                            ),
                            action(
                                "2 · yield* loadPosts",
                                GeneratorYield.ClickedAdvanceGeneratorYieldChannels(),
                                to_parent_message,
                                model.channel_step !== 1,
                                h
                            ),
                            action(
                                "3 · return Profile",
                                GeneratorYield.ClickedAdvanceGeneratorYieldChannels(),
                                to_parent_message,
                                model.channel_step !== 2,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border p-4"
                            ),
                        ],
                        [
                            action(
                                "Reset",
                                GeneratorYield.ClickedResetGeneratorYieldChannels(),
                                to_parent_message,
                                model.channel_step === 0,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Mental model",
                [
                    h.div(
                        [
                            h.Class(
                                "space-y-3 px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            h.p(
                                [],
                                [
                                    "Inside Effect.gen, yield* exposes the success value as a normal local variable.",
                                ]
                            ),
                            h.p(
                                [],
                                [
                                    "The error and requirement channels are still tracked by the type of the generated Effect.",
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

const failure_button = <ParentMessage>(
    label: string,
    failure_point: GeneratorYield.FailurePoint,
    model: GeneratorYield.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        label,
        GeneratorYield.SelectedGeneratorYieldFailurePoint({ failure_point }),
        to_parent_message,
        model.failure_point === failure_point,
        h
    )

const fail_fast_view = <ParentMessage>(
    model: GeneratorYield.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · failure stops the generator",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            failure_button(
                                "No failure",
                                "None",
                                model,
                                to_parent_message,
                                h
                            ),
                            failure_button(
                                "findUser fails",
                                "User",
                                model,
                                to_parent_message,
                                h
                            ),
                            failure_button(
                                "loadPosts fails",
                                "Posts",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-2 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        model.failure_point === "User"
                                            ? "rounded-[var(--radius-surface)] border border-destructive bg-destructive/5 p-4 text-center font-mono text-xs"
                                            : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-4 text-center font-mono text-xs"
                                    ),
                                ],
                                ["findUser"]
                            ),
                            h.span(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        model.failure_point === "Posts"
                                            ? "rounded-[var(--radius-surface)] border border-destructive bg-destructive/5 p-4 text-center font-mono text-xs"
                                            : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-4 text-center font-mono text-xs"
                                    ),
                                ],
                                ["loadPosts"]
                            ),
                            h.span(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-4 text-center font-mono text-xs"
                                    ),
                                ],
                                ["formatProfile"]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "flex gap-2 border-t-(length:--surface-border-width) border-border p-4"
                            ),
                        ],
                        [
                            action(
                                "Run program",
                                GeneratorYield.ClickedRunGeneratorYieldFailFast(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Reset log",
                                GeneratorYield.ClickedResetGeneratorYieldFailFast(),
                                to_parent_message,
                                !model.fail_fast_has_run,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel("Observed execution", [log_view(model.fail_fast_log, h)], h),
        ]
    )

const narrowing_view = <ParentMessage>(
    model: GeneratorYield.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const has_return = model.narrowing_mode === "ReturnYield"
    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · make the failing branch visibly exit",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            action(
                                "yield* Effect.fail",
                                GeneratorYield.SelectedGeneratorYieldNarrowingMode(
                                    {
                                        mode: "YieldOnly",
                                    }
                                ),
                                to_parent_message,
                                model.narrowing_mode === "YieldOnly",
                                h
                            ),
                            action(
                                "return yield* Effect.fail",
                                GeneratorYield.SelectedGeneratorYieldNarrowingMode(
                                    {
                                        mode: "ReturnYield",
                                    }
                                ),
                                to_parent_message,
                                model.narrowing_mode === "ReturnYield",
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border bg-background p-5 font-mono text-xs leading-7"
                            ),
                        ],
                        [
                            h.div([], ["if (user === undefined) {"]),
                            h.div(
                                [h.Class("pl-5 text-chart-4")],
                                [
                                    has_return
                                        ? "return yield* Effect.fail(new UserNotFound(...))"
                                        : "yield* Effect.fail(new UserNotFound(...))",
                                ]
                            ),
                            h.div([], ["}"]),
                            h.div(
                                [
                                    h.Class(
                                        has_return
                                            ? "mt-3 rounded-[var(--radius-surface)] bg-success/10 px-3 py-2 text-success"
                                            : "mt-3 rounded-[var(--radius-surface)] bg-warning/10 px-3 py-2 text-warning"
                                    ),
                                ],
                                [
                                    has_return
                                        ? "after branch → user: User"
                                        : "after branch → user: User | undefined",
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border p-4"
                            ),
                        ],
                        [
                            action(
                                model.user_is_present
                                    ? "Input: User present"
                                    : "Input: undefined",
                                GeneratorYield.ClickedToggleGeneratorYieldUserPresence(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Runtime vs TypeScript",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Both forms fail the Effect at runtime. The explicit return makes the branch exit obvious to TypeScript control-flow analysis, so code below can use the narrowed User.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: GeneratorYield.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Unwrap"
                ? unwrap_view(model, to_parent_message, h)
                : model.stage === "Channels"
                  ? channels_view(model, to_parent_message, h)
                  : model.stage === "FailFast"
                    ? fail_fast_view(model, to_parent_message, h)
                    : narrowing_view(model, to_parent_message, h),
        ]
    )
