import * as Ui from "@foldkit/ui"
import { Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as QueueDemo from "./queue.ts"

type ToParentMessage<ParentMessage> = (
    message: QueueDemo.Message
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
    message: QueueDemo.Message,
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
    model: QueueDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Queue examples"),
        ],
        QueueDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        QueueDemo.SelectedQueueStage({ stage })
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

const chip = <ParentMessage>(
    value: string,
    tone: "normal" | "new" | "taken" | "rejected",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const class_name =
        tone === "new"
            ? "border-sky-500/40 bg-sky-500/5 text-sky-500"
            : tone === "taken"
              ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600"
              : tone === "rejected"
                ? "border-destructive/40 bg-destructive/5 text-destructive"
                : "border-teal-500/40 bg-teal-500/5 text-teal-500"

    return h.div(
        [
            h.Class(
                `grid size-11 place-items-center rounded-[var(--radius-surface)] border font-mono text-xs font-semibold ${class_name}`
            ),
        ],
        [value]
    )
}

const queue_box = <ParentMessage>(
    items: ReadonlyArray<string>,
    state: string,
    capacity: number | undefined,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "overflow-hidden rounded-[var(--radius-surface)] border-2 border-teal-500/30 bg-teal-500/5"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "flex items-center justify-between gap-3 border-b border-teal-500/20 px-4 py-2"
                    ),
                ],
                [
                    h.span(
                        [
                            h.Class(
                                "font-mono text-[10px] font-semibold tracking-widest text-teal-500 uppercase"
                            ),
                        ],
                        ["Queue"]
                    ),
                    h.span([h.Class("font-mono text-[10px]")], [state]),
                ]
            ),
            h.div(
                [h.Class("flex min-h-20 flex-wrap items-center gap-2 p-4")],
                [
                    ...(items.length === 0
                        ? [
                              h.span(
                                  [
                                      h.Class(
                                          "w-full text-center font-mono text-xs text-muted-foreground"
                                      ),
                                  ],
                                  ["empty"]
                              ),
                          ]
                        : items.map((item) => chip(item, "normal", h))),
                    ...(capacity === undefined
                        ? []
                        : Array.from({
                              length: Math.max(0, capacity - items.length),
                          }).map(() =>
                              h.div(
                                  [
                                      h.Class(
                                          "size-11 rounded-[var(--radius-surface)] border border-dashed border-teal-500/20"
                                      ),
                                  ],
                                  []
                              )
                          )),
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

const buffer_view = <ParentMessage>(
    model: QueueDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · offer → buffer → take",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 p-5 md:grid-cols-[8rem_auto_1fr_auto_8rem] md:items-center"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "flex min-h-28 flex-col items-center justify-center gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3"
                                    ),
                                ],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Next offer"]
                                    ),
                                    chip(String(model.buffer_next), "new", h),
                                ]
                            ),
                            h.span(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            queue_box(
                                model.buffer_items.map(String),
                                `${model.buffer_items.length} buffered`,
                                undefined,
                                h
                            ),
                            h.span(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "flex min-h-28 flex-col items-center justify-center gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3"
                                    ),
                                ],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Last take"]
                                    ),
                                    Option.match(model.buffer_last_taken, {
                                        onNone: () =>
                                            h.span(
                                                [
                                                    h.Class(
                                                        "font-mono text-xs text-muted-foreground"
                                                    ),
                                                ],
                                                ["none"]
                                            ),
                                        onSome: (value) =>
                                            chip(String(value), "taken", h),
                                    }),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Queue.offer",
                                QueueDemo.ClickedOfferQueueValue(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Queue.take",
                                QueueDemo.ClickedTakeQueueValue(),
                                to_parent_message,
                                model.buffer_items.length === 0,
                                h
                            ),
                            action(
                                "Reset",
                                QueueDemo.ClickedResetQueueBuffer(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Basic semantics",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Queue.offer appends a value. Queue.take removes the oldest value. If the Queue is empty, take suspends the consumer Fiber until a producer supplies something.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const strategy_action = <ParentMessage>(
    strategy: QueueDemo.Strategy,
    model: QueueDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        strategy,
        QueueDemo.SelectedQueueStrategy({ strategy }),
        to_parent_message,
        model.strategy === strategy,
        h
    )

const capacity_view = <ParentMessage>(
    model: QueueDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · capacity 3",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            strategy_action(
                                "Bounded",
                                model,
                                to_parent_message,
                                h
                            ),
                            strategy_action(
                                "Dropping",
                                model,
                                to_parent_message,
                                h
                            ),
                            strategy_action(
                                "Sliding",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[9rem_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "flex min-h-36 flex-col items-center justify-center gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3"
                                    ),
                                ],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Next"]
                                    ),
                                    chip(String(model.capacity_next), "new", h),
                                    Option.match(model.capacity_pending, {
                                        onNone: () => h.empty,
                                        onSome: (value) =>
                                            h.div(
                                                [
                                                    h.Class(
                                                        "rounded-[var(--radius-surface)] border border-amber-500/40 bg-amber-500/5 px-2 py-1 text-center font-mono text-[10px] text-amber-600"
                                                    ),
                                                ],
                                                [`${value} suspended`]
                                            ),
                                    }),
                                ]
                            ),
                            h.span(
                                [h.Class("text-center text-muted-foreground")],
                                ["→"]
                            ),
                            queue_box(
                                model.capacity_items.map(String),
                                `${model.capacity_items.length} / 3`,
                                3,
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Offer next",
                                QueueDemo.ClickedOfferCapacityValue(),
                                to_parent_message,
                                model.capacity_pending._tag === "Some",
                                h
                            ),
                            action(
                                "Take one",
                                QueueDemo.ClickedTakeCapacityValue(),
                                to_parent_message,
                                model.capacity_items.length === 0,
                                h
                            ),
                            action(
                                "Reset",
                                QueueDemo.ClickedResetQueueCapacity(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                    model.capacity_rejected.length === 0
                        ? h.empty
                        : h.div(
                              [
                                  h.Class(
                                      "flex flex-wrap items-center gap-2 border-t-(length:--surface-border-width) border-border px-4 py-3"
                                  ),
                              ],
                              [
                                  h.span(
                                      [
                                          h.Class(
                                              "mr-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                          ),
                                      ],
                                      ["Removed / rejected"]
                                  ),
                                  ...model.capacity_rejected.map((value) =>
                                      chip(String(value), "rejected", h)
                                  ),
                              ]
                          ),
                ],
                h
            ),
            panel(
                "Strategy",
                [
                    h.div(
                        [h.Class("px-5 py-4")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "font-mono text-sm font-semibold text-teal-500"
                                    ),
                                ],
                                [model.strategy]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-2 text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    model.strategy === "Bounded"
                                        ? "Backpressure: Queue.offer suspends while the Queue is full. Taking a value frees capacity and resumes the producer."
                                        : model.strategy === "Dropping"
                                          ? "The new offer returns false when full. Existing buffered values stay untouched."
                                          : "The oldest buffered value is removed so the newest offer can enter immediately.",
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const completion_state = (model: QueueDemo.Model): string =>
    model.completion_mode === "ClosingEnd"
        ? "CLOSING · END"
        : model.completion_mode === "ClosingFail"
          ? "CLOSING · FAILURE"
          : model.completion_mode.toUpperCase()

const completion_view = <ParentMessage>(
    model: QueueDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · end, fail, shutdown",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 p-5 md:grid-cols-[1.1fr_0.9fr] md:items-center"
                            ),
                        ],
                        [
                            queue_box(
                                model.completion_items,
                                completion_state(model),
                                undefined,
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Observation"]
                                    ),
                                    h.p(
                                        [h.Class("mt-2 text-sm leading-6")],
                                        [model.completion_observation]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Queue.end",
                                QueueDemo.ClickedEndQueue(),
                                to_parent_message,
                                model.completion_mode !== "Open",
                                h
                            ),
                            action(
                                'Queue.fail("boom")',
                                QueueDemo.ClickedFailQueue(),
                                to_parent_message,
                                model.completion_mode !== "Open",
                                h
                            ),
                            action(
                                "Queue.shutdown",
                                QueueDemo.ClickedShutdownQueue(),
                                to_parent_message,
                                model.completion_mode === "Shutdown",
                                h
                            ),
                            action(
                                "Queue.take",
                                QueueDemo.ClickedTakeCompletionValue(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Reset",
                                QueueDemo.ClickedResetQueueCompletion(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Three completion choices",
                [
                    h.div(
                        [
                            h.Class(
                                "grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0"
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
                                        ["END"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-xs leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Graceful success. New offers stop, buffered values can still drain.",
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
                                                "font-mono text-xs font-semibold text-destructive"
                                            ),
                                        ],
                                        ["FAIL"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-xs leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Graceful typed failure. The Queue terminates with your error after draining.",
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
                                                "font-mono text-xs font-semibold text-amber-600"
                                            ),
                                        ],
                                        ["SHUTDOWN"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-xs leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Cancel now. Buffered values are cleared and pending operations are interrupted.",
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

const fiber_status = <ParentMessage>(
    status: QueueDemo.FiberStatus,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const class_name =
        status === "Suspended"
            ? "border-amber-500/40 text-amber-600"
            : status === "Running"
              ? "border-sky-500/40 text-sky-500"
              : status === "Success"
                ? "border-emerald-500/40 text-emerald-600"
                : "border-border text-muted-foreground"

    return h.span(
        [
            h.Class(
                `rounded-full border px-2 py-1 font-mono text-[9px] font-semibold tracking-wider uppercase ${class_name}`
            ),
        ],
        [status]
    )
}

const log_view = <ParentMessage>(
    entries: ReadonlyArray<string>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    entries.length === 0
        ? h.div(
              [h.Class("px-5 py-8 text-center text-sm text-muted-foreground")],
              ["Start the Fibers."]
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

const fibers_view = <ParentMessage>(
    model: QueueDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · backpressure is Fiber suspension",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 p-5 lg:grid-cols-[1fr_1.1fr_1fr] lg:items-center"
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
                                    h.div(
                                        [
                                            h.Class(
                                                "flex items-center justify-between gap-3"
                                            ),
                                        ],
                                        [
                                            h.span(
                                                [
                                                    h.Class(
                                                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                                    ),
                                                ],
                                                ["Producer Fiber"]
                                            ),
                                            fiber_status(
                                                model.producer_status,
                                                h
                                            ),
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-4 font-mono text-xs leading-6"
                                            ),
                                        ],
                                        ["offer 1", h.br([]), "offer 2"]
                                    ),
                                    Option.match(model.fiber_pending_offer, {
                                        onNone: () => h.empty,
                                        onSome: (value) =>
                                            h.div(
                                                [
                                                    h.Class(
                                                        "mt-3 rounded-[var(--radius-surface)] border border-amber-500/40 bg-amber-500/5 px-3 py-2 font-mono text-[10px] text-amber-600"
                                                    ),
                                                ],
                                                [
                                                    `${value} waiting for capacity`,
                                                ]
                                            ),
                                    }),
                                ]
                            ),
                            queue_box(
                                model.fiber_items.map(String),
                                `${model.fiber_items.length} / 1`,
                                1,
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "flex items-center justify-between gap-3"
                                            ),
                                        ],
                                        [
                                            h.span(
                                                [
                                                    h.Class(
                                                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                                    ),
                                                ],
                                                ["Consumer Fiber"]
                                            ),
                                            fiber_status(
                                                model.consumer_status,
                                                h
                                            ),
                                        ]
                                    ),
                                    h.p(
                                        [h.Class("mt-4 font-mono text-xs")],
                                        ["Queue.take"]
                                    ),
                                    h.div(
                                        [h.Class("mt-3 flex gap-2")],
                                        model.fiber_consumed.map((value) =>
                                            chip(String(value), "taken", h)
                                        )
                                    ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Start Fibers",
                                QueueDemo.ClickedStartQueueFibers(),
                                to_parent_message,
                                model.producer_status !== "Idle",
                                h
                            ),
                            action(
                                "Consumer takes",
                                QueueDemo.ClickedConsumerTakeQueueValue(),
                                to_parent_message,
                                model.consumer_status !== "Running" ||
                                    model.fiber_items.length === 0,
                                h
                            ),
                            action(
                                "Reset",
                                QueueDemo.ClickedResetQueueFibers(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel("Execution log", [log_view(model.fiber_log, h)], h),
        ]
    )

export const view = <ParentMessage>(
    model: QueueDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Buffer"
                ? buffer_view(model, to_parent_message, h)
                : model.stage === "Capacity"
                  ? capacity_view(model, to_parent_message, h)
                  : model.stage === "Completion"
                    ? completion_view(model, to_parent_message, h)
                    : fibers_view(model, to_parent_message, h),
        ]
    )
