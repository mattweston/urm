import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as FiberDemo from "./fiber.ts"

type ToParentMessage<ParentMessage> = (
    message: FiberDemo.Message
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
    message: FiberDemo.Message,
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
    model: FiberDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Fiber experiments"),
        ],
        FiberDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        FiberDemo.SelectedFiberStage({ stage })
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

const status_badge = <ParentMessage>(
    status: FiberDemo.FiberStatus,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const class_name =
        status === "Success"
            ? "border-success/40 text-success"
            : status === "Running"
              ? "border-chart-3/40 text-chart-3"
              : status === "Failure" || status === "Interrupted"
                ? "border-destructive/40 text-destructive"
                : "border-border text-muted-foreground"

    return h.span(
        [
            h.Class(
                `rounded-full border px-2 py-1 font-mono text-[10px] font-semibold tracking-wider uppercase ${class_name}`
            ),
        ],
        [status]
    )
}

const progress_bar = <ParentMessage>(
    progress: number,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("h-2 overflow-hidden rounded-full bg-muted")],
        [
            h.div(
                [
                    h.Class(
                        "h-full rounded-full bg-chart-3 transition-[width]"
                    ),
                    h.Attribute("style", `width: ${progress}%`),
                ],
                []
            ),
        ]
    )

const fiber_card = <ParentMessage>(
    id: string,
    label: string,
    status: FiberDemo.FiberStatus,
    progress: number,
    maybe_result: string | undefined,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-start justify-between gap-3")],
                [
                    h.div(
                        [],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "font-mono text-[10px] tracking-wider text-muted-foreground uppercase"
                                    ),
                                ],
                                [id]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-1 font-mono text-sm font-semibold"
                                    ),
                                ],
                                [label]
                            ),
                        ]
                    ),
                    status_badge(status, h),
                ]
            ),
            h.div([h.Class("mt-4")], [progress_bar(progress, h)]),
            h.div(
                [
                    h.Class(
                        "mt-2 flex items-center justify-between gap-3 font-mono text-[10px] text-muted-foreground"
                    ),
                ],
                [
                    h.span([], [`${progress}%`]),
                    h.span([], [maybe_result ?? "no result yet"]),
                ]
            ),
        ]
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

const log_view = <ParentMessage>(
    entries: ReadonlyArray<string>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    entries.length === 0
        ? h.div(
              [h.Class("px-5 py-8 text-center text-sm text-muted-foreground")],
              ["No events yet."]
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

const fork_view = <ParentMessage>(
    model: FiberDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · Effect → running Fiber",
                [
                    h.div(
                        [h.Class("p-5")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-dashed border-chart-3/40 bg-chart-3/5 p-5 text-center"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-widest text-chart-3 uppercase"
                                            ),
                                        ],
                                        ["Lazy description"]
                                    ),
                                    h.div(
                                        [h.Class("mt-3 font-mono text-sm")],
                                        ["Effect<number, never, never>"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 text-xs text-muted-foreground"
                                            ),
                                        ],
                                        ["Nothing is running yet."]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "py-4 text-center font-mono text-xs font-semibold text-chart-3"
                                    ),
                                ],
                                ["Effect.forkChild ↓"]
                            ),
                            fiber_card(
                                "fiber #1",
                                "calculate 42",
                                model.fork_status,
                                model.fork_progress,
                                model.fork_status === "Success"
                                    ? "42"
                                    : undefined,
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Fork fiber",
                                FiberDemo.ClickedStartFork(),
                                to_parent_message,
                                model.fork_status !== "Idle",
                                h
                            ),
                            action(
                                "Advance",
                                FiberDemo.ClickedAdvanceFork(),
                                to_parent_message,
                                model.fork_status !== "Running",
                                h
                            ),
                            action(
                                "Reset",
                                FiberDemo.ClickedResetFork(),
                                to_parent_message,
                                model.fork_status === "Idle",
                                h
                            ),
                        ],
                        h
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
                                    "An Effect is an immutable description of work. A Fiber is one live execution of that description.",
                                ]
                            ),
                            h.p(
                                [],
                                [
                                    "The Fiber handle is what lets you join, await, inspect, or interrupt that running child.",
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const concurrency_view = <ParentMessage>(
    model: FiberDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const is_complete = FiberDemo.concurrent_is_complete(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · fork both before joining either",
                [
                    h.div(
                        [h.Class("grid gap-3 p-5 md:grid-cols-2")],
                        [
                            fiber_card(
                                "fiber #A",
                                "load users",
                                model.left_status,
                                model.left_progress,
                                model.left_status === "Success"
                                    ? "users"
                                    : undefined,
                                h
                            ),
                            fiber_card(
                                "fiber #B",
                                "load posts",
                                model.right_status,
                                model.right_progress,
                                model.right_status === "Success"
                                    ? "posts"
                                    : undefined,
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Start both",
                                FiberDemo.ClickedStartConcurrent(),
                                to_parent_message,
                                model.left_status !== "Idle" ||
                                    model.right_status !== "Idle",
                                h
                            ),
                            action(
                                "Advance",
                                FiberDemo.ClickedAdvanceConcurrent(),
                                to_parent_message,
                                model.left_status !== "Running" &&
                                    model.right_status !== "Running",
                                h
                            ),
                            action(
                                "Join results",
                                FiberDemo.ClickedJoinConcurrent(),
                                to_parent_message,
                                !is_complete || model.concurrent_has_joined,
                                h
                            ),
                            action(
                                "Reset",
                                FiberDemo.ClickedResetConcurrent(),
                                to_parent_message,
                                model.left_status === "Idle" &&
                                    model.right_status === "Idle",
                                h
                            ),
                        ],
                        h
                    ),
                    model.concurrent_has_joined
                        ? h.div(
                              [
                                  h.Class(
                                      "flex items-center justify-between gap-3 border-t-(length:--surface-border-width) border-border bg-success/5 px-5 py-4"
                                  ),
                              ],
                              [
                                  h.span(
                                      [
                                          h.Class(
                                              "text-xs tracking-wider text-muted-foreground uppercase"
                                          ),
                                      ],
                                      ["joined value"]
                                  ),
                                  h.span(
                                      [
                                          h.Class(
                                              "font-mono text-xs text-success"
                                          ),
                                      ],
                                      ['["users", "posts"]']
                                  ),
                              ]
                          )
                        : h.empty,
                ],
                h
            ),
            panel(
                "Why it is concurrent",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Both child Fibers start before either join begins. Joining later waits for work that is already running, rather than starting the second task after the first completes.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const observe_choice = <ParentMessage>(
    label: string,
    message: FiberDemo.Message,
    is_selected: boolean,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => action(label, message, to_parent_message, is_selected, h)

const observe_view = <ParentMessage>(
    model: FiberDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = FiberDemo.observation(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · join vs await",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            observe_choice(
                                "Child succeeds",
                                FiberDemo.SelectedFiberOutcome({
                                    outcome: "Success",
                                }),
                                model.observe_outcome === "Success",
                                to_parent_message,
                                h
                            ),
                            observe_choice(
                                "Child fails",
                                FiberDemo.SelectedFiberOutcome({
                                    outcome: "Failure",
                                }),
                                model.observe_outcome === "Failure",
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
                            observe_choice(
                                "Fiber.join",
                                FiberDemo.SelectedFiberObserveMode({
                                    mode: "Join",
                                }),
                                model.observe_mode === "Join",
                                to_parent_message,
                                h
                            ),
                            observe_choice(
                                "Fiber.await",
                                FiberDemo.SelectedFiberObserveMode({
                                    mode: "Await",
                                }),
                                model.observe_mode === "Await",
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        model.observe_outcome === "Failure"
                                            ? "rounded-full border border-destructive/50 bg-destructive/5 px-4 py-5 text-center font-mono text-xs"
                                            : "rounded-full border border-success/50 bg-success/5 px-4 py-5 text-center font-mono text-xs"
                                    ),
                                ],
                                ["fiber"]
                            ),
                            h.span(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-4 py-3 text-center font-mono text-xs text-chart-3"
                                    ),
                                ],
                                [model.observe_mode.toLowerCase()]
                            ),
                            h.span(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        model.observe_has_run &&
                                            result.is_failure
                                            ? "rounded-[var(--radius-surface)] border border-destructive/40 px-4 py-3 font-mono text-xs text-destructive"
                                            : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-4 py-3 font-mono text-xs text-success"
                                    ),
                                ],
                                [
                                    model.observe_has_run
                                        ? result.headline
                                        : "click Observe",
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Observe",
                                FiberDemo.ClickedObserveFiber(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Reset",
                                FiberDemo.ClickedResetFiberObservation(),
                                to_parent_message,
                                !model.observe_has_run,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Result type",
                [
                    model.observe_has_run
                        ? h.div(
                              [h.Class("space-y-3 p-5")],
                              [
                                  h.div(
                                      [
                                          h.Class(
                                              "font-mono text-xs text-chart-3"
                                          ),
                                      ],
                                      [result.type]
                                  ),
                                  h.div(
                                      [
                                          h.Class(
                                              result.is_failure
                                                  ? "font-semibold text-destructive"
                                                  : "font-semibold text-success"
                                          ),
                                      ],
                                      [result.headline]
                                  ),
                                  h.p(
                                      [
                                          h.Class(
                                              "text-sm leading-6 text-muted-foreground"
                                          ),
                                      ],
                                      [result.detail]
                                  ),
                              ]
                          )
                        : h.div(
                              [
                                  h.Class(
                                      "px-5 py-8 text-center text-sm text-muted-foreground"
                                  ),
                              ],
                              ["Choose a mode and observe the Fiber."]
                          ),
                ],
                h
            ),
        ]
    )
}

const interrupt_view = <ParentMessage>(
    model: FiberDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · interrupt and clean up",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            fiber_card(
                                "fiber #worker",
                                "background worker",
                                model.interrupt_status,
                                model.interrupt_progress,
                                model.interrupt_status === "Success"
                                    ? "finished naturally"
                                    : undefined,
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        model.finalizer_ran
                                            ? "flex items-center justify-between gap-3 rounded-[var(--radius-surface)] border border-success/40 bg-success/5 px-4 py-3"
                                            : "flex items-center justify-between gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-4 py-3"
                                    ),
                                ],
                                [
                                    h.div(
                                        [],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                                    ),
                                                ],
                                                ["Finalizer"]
                                            ),
                                            h.div(
                                                [h.Class("mt-1 text-sm")],
                                                ["release worker resources"]
                                            ),
                                        ]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                model.finalizer_ran
                                                    ? "font-mono text-xs text-success"
                                                    : "font-mono text-xs text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            model.finalizer_ran
                                                ? "✓ ran"
                                                : "waiting",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Start worker",
                                FiberDemo.ClickedStartInterruptibleFiber(),
                                to_parent_message,
                                model.interrupt_status !== "Idle",
                                h
                            ),
                            action(
                                "Heartbeat",
                                FiberDemo.ClickedAdvanceInterruptibleFiber(),
                                to_parent_message,
                                model.interrupt_status !== "Running",
                                h
                            ),
                            action(
                                "Interrupt",
                                FiberDemo.ClickedInterruptFiber(),
                                to_parent_message,
                                model.interrupt_status !== "Running",
                                h
                            ),
                            action(
                                "Reset",
                                FiberDemo.ClickedResetInterruptibleFiber(),
                                to_parent_message,
                                model.interrupt_status === "Idle",
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Termination log",
                [
                    log_view(model.interrupt_log, h),
                    model.finalizer_ran
                        ? h.p(
                              [
                                  h.Class(
                                      "border-t-(length:--surface-border-width) border-border bg-success/5 px-5 py-4 text-sm leading-6 text-success"
                                  ),
                              ],
                              [
                                  "Fiber.interrupt completes only after the child has fully terminated and its finalizers have finished.",
                              ]
                          )
                        : h.empty,
                ],
                h
            ),
        ]
    )

export const view = <ParentMessage>(
    model: FiberDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Fork"
                ? fork_view(model, to_parent_message, h)
                : model.stage === "Concurrency"
                  ? concurrency_view(model, to_parent_message, h)
                  : model.stage === "Observe"
                    ? observe_view(model, to_parent_message, h)
                    : interrupt_view(model, to_parent_message, h),
        ]
    )
