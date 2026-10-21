import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as SubscriptionsDemo from "./examples/subscriptions.ts"

type ToParentMessage<ParentMessage> = (
    message: SubscriptionsDemo.Message
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
    message: SubscriptionsDemo.Message,
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
    model: SubscriptionsDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Foldkit Subscriptions examples"),
        ],
        SubscriptionsDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        SubscriptionsDemo.Message.SelectedSubscriptionsStage({
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

const log_view = <ParentMessage>(
    entries: ReadonlyArray<string>,
    empty: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    entries.length === 0
        ? h.div(
              [h.Class("px-5 py-8 text-center text-sm text-muted-foreground")],
              [empty]
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

const lifetime_view = <ParentMessage>(
    model: SubscriptionsDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const state = SubscriptionsDemo.lifetimeState(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · lifetime follows a dependency record derived from Model",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 lg:grid-cols-[1fr_auto_1fr]")],
                        [
                            result_card(
                                "Model",
                                `isAutoCounting = ${model.isAutoCounting}\nunrelatedVersion = ${model.unrelatedVersion}`,
                                "cyan",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["modelToDependencies →"]
                            ),
                            result_card(
                                "dependencies",
                                state.dependencies,
                                "violet",
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 border-t-(length:--surface-border-width) border-border p-5 sm:grid-cols-3"
                            ),
                        ],
                        [
                            result_card(
                                "scope",
                                state.scope,
                                model.isAutoCounting ? "green" : "amber",
                                h
                            ),
                            result_card(
                                "generation",
                                state.generation,
                                "violet",
                                h
                            ),
                            result_card(
                                "count",
                                String(model.count),
                                "cyan",
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                model.isAutoCounting
                                    ? "Stop auto count"
                                    : "Start auto count",
                                SubscriptionsDemo.Message.ClickedToggleAutoCounting(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Change unrelated Model field",
                                SubscriptionsDemo.Message.ClickedUnrelatedModelChange(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Simulate Ticked",
                                SubscriptionsDemo.Message.Ticked(),
                                to_parent_message,
                                !model.isAutoCounting,
                                h
                            ),
                            action(
                                "Reset",
                                SubscriptionsDemo.Message.ClickedResetLifetime(),
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
                "Scope log",
                [log_view(model.lifetimeLog, "No dependency changes yet.", h)],
                h
            ),
            panel(
                "Equivalent dependencies keep work alive",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "After every Model update, Foldkit recomputes the entry's dependency record. Structurally equivalent dependencies keep the current Stream and scope alive. A changed dependency closes the old scope, runs acquireRelease finalizers, and opens a fresh Stream scope.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const key_action = <ParentMessage>(
    key: SubscriptionsDemo.EventKey,
    model: SubscriptionsDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        key,
        SubscriptionsDemo.Message.SelectedSubscriptionEventKey({ key }),
        to_parent_message,
        model.eventKey === key,
        h
    )

const events_view = <ParentMessage>(
    model: SubscriptionsDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const preview = SubscriptionsDemo.eventPreview(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · global DOM events become Stream Messages",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            result_card(
                                "window keydown",
                                preview.key,
                                "cyan",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["filterMapPreventDefault →"]
                            ),
                            result_card(
                                "mapper result",
                                preview.output,
                                preview.output.includes("some")
                                    ? "green"
                                    : "amber",
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-px border-t-(length:--surface-border-width) border-border bg-border sm:grid-cols-2"
                            ),
                        ],
                        [
                            stat(
                                "listener",
                                model.isListening ? "active" : "inactive",
                                h
                            ),
                            stat("preventDefault", preview.preventDefault, h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
                            ),
                        ],
                        (["Escape", "Enter", "ArrowDown"] as const).map((key) =>
                            key_action(key, model, to_parent_message, h)
                        )
                    ),
                    controls(
                        [
                            action(
                                model.isListening
                                    ? "Disable listener"
                                    : "Enable listener",
                                SubscriptionsDemo.Message.ClickedToggleListening(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Simulate keydown",
                                SubscriptionsDemo.Message.ClickedSimulateWindowKey(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Reset",
                                SubscriptionsDemo.Message.ClickedResetEvents(),
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
                "Event log",
                [log_view(model.eventLog, "No events yet.", h)],
                h
            ),
            panel(
                "Listener lifetime is scoped",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Subscription.fromEvent registers the listener when the Stream scope opens and removes it when the scope closes. The prevent-default filter helper runs its mapper synchronously in the native dispatch: Some(message) cancels the browser default and queues the Message; None leaves native behavior intact.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const stat = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("bg-card p-4 text-center")],
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
                [h.Class("mt-2 font-mono text-lg font-bold text-cyan-500")],
                [value]
            ),
        ]
    )

const client_y_action = <ParentMessage>(
    clientY: number,
    model: SubscriptionsDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        String(clientY),
        SubscriptionsDemo.Message.SelectedClientY({ clientY }),
        to_parent_message,
        model.clientY === clientY,
        h
    )

const keep_alive_view = <ParentMessage>(
    model: SubscriptionsDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const state = SubscriptionsDemo.keepAliveState(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · keep a Stream alive while reading changing dependencies",
                [
                    h.div(
                        [h.Class("grid gap-3 p-5 sm:grid-cols-3")],
                        [
                            result_card(
                                "all dependencies",
                                state.dependencies,
                                "cyan",
                                h
                            ),
                            result_card(
                                "restart comparison",
                                state.compared,
                                "violet",
                                h
                            ),
                            result_card("live read", state.live, "green", h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-px border-t-(length:--surface-border-width) border-border bg-border sm:grid-cols-3"
                            ),
                        ],
                        [
                            stat(
                                "drag scope",
                                model.isDragging ? "active" : "inactive",
                                h
                            ),
                            stat(
                                "scope generation",
                                String(model.dragGeneration),
                                h
                            ),
                            stat("live reads", String(model.liveReadCount), h),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
                            ),
                        ],
                        [40, 120, 400, 760].map((clientY) =>
                            client_y_action(
                                clientY,
                                model,
                                to_parent_message,
                                h
                            )
                        )
                    ),
                    controls(
                        [
                            action(
                                model.isDragging
                                    ? "Stop dragging"
                                    : "Start dragging",
                                SubscriptionsDemo.Message.ClickedToggleDragging(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Read latest dependencies",
                                SubscriptionsDemo.Message.ClickedReadLatestDependencies(),
                                to_parent_message,
                                !model.isDragging,
                                h
                            ),
                            action(
                                "Reset",
                                SubscriptionsDemo.Message.ClickedResetKeepAlive(),
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
                "keepAliveEquivalence + readDependencies",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `entry(
  {
    isDragging: Schema.Boolean,
    clientY: Schema.Number
  },
  {
    modelToDependencies: model => ({
      isDragging: model.isDragging,
      clientY: model.clientY
    }),

    keepAliveEquivalence:
      Equivalence.Struct({
        isDragging:
          Equivalence.Boolean
      }),

    dependenciesToStream:
      ({ isDragging }, readDependencies) =>
        ...
  }
)`,
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Changing clientY does not restart the Stream because the custom equivalence compares only isDragging. The long-lived callback can still call readDependencies() to see the newest clientY. Reach for this only when a running callback truly needs live values that should not own its lifetime.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const lift_view = <ParentMessage>(
    model: SubscriptionsDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const state = SubscriptionsDemo.liftState(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · lift a child's Subscription record into the parent",
                [
                    h.div(
                        [h.Class("grid gap-3 p-5 sm:grid-cols-3")],
                        [
                            result_card(
                                "parent gate",
                                state.gate,
                                model.routeActive ? "green" : "amber",
                                h
                            ),
                            result_card(
                                "child dependencies",
                                state.childDependencies,
                                "cyan",
                                h
                            ),
                            result_card(
                                "lifted entry",
                                state.active,
                                model.routeActive && model.child.isOnline
                                    ? "green"
                                    : "amber",
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-px border-t-(length:--surface-border-width) border-border bg-border sm:grid-cols-2"
                            ),
                        ],
                        [
                            stat(
                                "child scope generation",
                                String(model.childGeneration),
                                h
                            ),
                            stat(
                                "child ticks",
                                String(model.childTickCount),
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                model.routeActive
                                    ? "Close parent route gate"
                                    : "Open parent route gate",
                                SubscriptionsDemo.Message.ClickedToggleRoute(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                model.child.isOnline
                                    ? "Child offline"
                                    : "Child online",
                                SubscriptionsDemo.Message.ClickedToggleChildOnline(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Simulate child tick",
                                SubscriptionsDemo.Message.ClickedSimulateChildTick(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Reset",
                                SubscriptionsDemo.Message.ClickedResetLift(),
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
                "Lift log",
                [log_view(model.liftLog, "No lift changes.", h)],
                h
            ),
            panel(
                "Parent owns the gate, child owns its dependencies",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `const lifted =
  Subscription.lift(
    childSubscriptions
  )<Model, Message>({
    toChildModel:
      model => model.child,

    toParentMessage:
      message =>
        Message.GotChildMessage({
          message
        }),

    when:
      model => model.routeActive
  })`,
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "A closed `when` gate is a real teardown, not a pause. While closed, the child's modelToDependencies is not reevaluated, so child changes behind the gate cause no restarts. Reopening creates a fresh scope from the child's latest Model.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: SubscriptionsDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Lifetime"
                ? lifetime_view(model, to_parent_message, h)
                : model.stage === "Events"
                  ? events_view(model, to_parent_message, h)
                  : model.stage === "KeepAlive"
                    ? keep_alive_view(model, to_parent_message, h)
                    : lift_view(model, to_parent_message, h),
        ]
    )
