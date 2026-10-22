import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as MessagesDemo from "./messages.ts"

type ToParentMessage<ParentMessage> = (
    message: MessagesDemo.Message
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
    message: MessagesDemo.Message,
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
    model: MessagesDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Foldkit Messages examples"),
        ],
        MessagesDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        MessagesDemo.Message.SelectedMessagesStage({ stage })
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

const message_card = <ParentMessage>(
    label: string,
    message: unknown,
    tone: "cyan" | "violet" | "green" | "amber",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const classes =
        tone === "violet"
            ? "border-violet-500/40 bg-violet-500/5"
            : tone === "green"
              ? "border-emerald-500/40 bg-emerald-500/5"
              : tone === "amber"
                ? "border-amber-500/40 bg-amber-500/5"
                : "border-cyan-500/40 bg-cyan-500/5"

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
            h.pre(
                [
                    h.Class(
                        "mt-3 overflow-auto whitespace-pre-wrap font-mono text-xs leading-5"
                    ),
                ],
                [JSON.stringify(message, null, 2)]
            ),
        ]
    )
}

const fact_view = <ParentMessage>(
    model: MessagesDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const interpretation = MessagesDemo.interpretIncrement(
        model.counterPolicy,
        model.count
    )

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · facts, not instructions",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 p-5 lg:grid-cols-[0.8fr_auto_1.2fr] lg:items-center"
                            ),
                        ],
                        [
                            message_card(
                                "Message fact",
                                MessagesDemo.AppEvent.ClickedIncrement(),
                                "cyan",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["update decides →"]
                            ),
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
                                        ["Current interpretation"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-3 font-mono text-xl font-bold text-emerald-600"
                                            ),
                                        ],
                                        [
                                            `count ${model.count} → ${interpretation.nextCount}`,
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 text-xs leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [interpretation.explanation]
                                    ),
                                ]
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
                            action(
                                "Local policy",
                                MessagesDemo.Message.SelectedCounterPolicy({
                                    policy: "Local",
                                }),
                                to_parent_message,
                                model.counterPolicy === "Local",
                                h
                            ),
                            action(
                                "Server-owned policy",
                                MessagesDemo.Message.SelectedCounterPolicy({
                                    policy: "ServerOwned",
                                }),
                                to_parent_message,
                                model.counterPolicy === "ServerOwned",
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Click increment",
                                MessagesDemo.Message.ClickedDemoIncrement(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Reset count",
                                MessagesDemo.Message.ClickedResetDemoCount(),
                                to_parent_message,
                                model.count === 3,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Name the cause",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "ClickedIncrement records what happened. It does not promise that update will add one. That keeps the event stable even if the application's response later changes from a local state transition to a Command or some other policy.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const event_action = <ParentMessage>(
    kind: MessagesDemo.EventKind,
    model: MessagesDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        kind,
        MessagesDemo.Message.SelectedEventKind({
            eventKind: kind,
        }),
        to_parent_message,
        model.eventKind === kind,
        h
    )

const union_view = <ParentMessage>(
    model: MessagesDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const event = MessagesDemo.selectedEvent(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · declare the vocabulary together",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (
                            [
                                "Clicked",
                                "Updated",
                                "Succeeded",
                                "Failed",
                            ] as const
                        ).map((kind) =>
                            event_action(kind, model, to_parent_message, h)
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 lg:grid-cols-[1fr_1fr]"
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
                                    `const AppEvent =
  defineMessageUnion({
    ClickedIncrement: {},

    UpdatedSearch: {
      value: Schema.String
    },

    SucceededLoadNotes: {
      count: Schema.Number
    },

    FailedLoadNotes: {
      error: Schema.String
    }
  })`,
                                ]
                            ),
                            message_card(
                                "constructed value",
                                event,
                                "violet",
                                h
                            ),
                        ]
                    ),
                    model.eventKind === "Updated"
                        ? controls(
                              [
                                  input_control(
                                      "Search value",
                                      model.searchValue,
                                      (value) =>
                                          to_parent_message(
                                              MessagesDemo.Message.UpdatedDemoSearch(
                                                  {
                                                      value,
                                                  }
                                              )
                                          ),
                                      h
                                  ),
                              ],
                              h
                          )
                        : model.eventKind === "Succeeded"
                          ? controls(
                                [1, 3, 5].map((count) =>
                                    action(
                                        `${count} notes`,
                                        MessagesDemo.Message.SelectedDemoLoadCount(
                                            {
                                                count,
                                            }
                                        ),
                                        to_parent_message,
                                        model.loadCount === count,
                                        h
                                    )
                                ),
                                h
                            )
                          : model.eventKind === "Failed"
                            ? controls(
                                  [
                                      input_control(
                                          "Error",
                                          model.loadError,
                                          (error) =>
                                              to_parent_message(
                                                  MessagesDemo.Message.UpdatedDemoLoadError(
                                                      {
                                                          error,
                                                      }
                                                  )
                                              ),
                                          h
                                      ),
                                  ],
                                  h
                              )
                            : h.empty,
                ],
                h
            ),
            panel(
                "Naming makes causes scannable",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4"
                            ),
                        ],
                        [
                            name_rule("Clicked*", "user clicks", h),
                            name_rule("Updated*", "input changes", h),
                            name_rule(
                                "Succeeded* / Failed*",
                                "Command result distinction",
                                h
                            ),
                            name_rule(
                                "Completed*",
                                "result where success/failure split is unnecessary",
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

const input_control = <ParentMessage>(
    label: string,
    value: string,
    onInput: (value: string) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.label(
        [h.Class("grid min-w-[260px] gap-2")],
        [
            h.span(
                [
                    h.Class(
                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                    ),
                ],
                [label]
            ),
            h.input([
                h.Class(
                    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 font-mono text-xs outline-none"
                ),
                h.Value(value),
                h.OnInput(onInput),
            ]),
        ]
    )

const name_rule = <ParentMessage>(
    prefix: string,
    meaning: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("bg-card p-4")],
        [
            h.div(
                [h.Class("font-mono text-xs font-semibold text-cyan-500")],
                [prefix]
            ),
            h.p(
                [h.Class("mt-2 text-xs leading-5 text-muted-foreground")],
                [meaning]
            ),
        ]
    )

const match_view = <ParentMessage>(
    model: MessagesDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const event = MessagesDemo.selectedEvent(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · Message.match handles the union exhaustively",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 p-5 lg:grid-cols-[0.8fr_auto_1.2fr]"
                            ),
                        ],
                        [
                            message_card("input Message", event, "cyan", h),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["Message.match →"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        model.matchHandled
                                            ? "rounded-[var(--radius-surface)] border border-emerald-500/40 bg-emerald-500/5 p-5"
                                            : "rounded-[var(--radius-surface)] border border-dashed border-border bg-background p-5 opacity-45"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["handler output"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                model.matchHandled
                                                    ? "mt-3 font-mono text-sm font-semibold text-emerald-600"
                                                    : "mt-3 font-mono text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            model.matchHandled
                                                ? MessagesDemo.handlerOutput(
                                                      model
                                                  )
                                                : "not handled yet",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Handle message",
                                MessagesDemo.Message.ClickedHandleExampleMessage(),
                                to_parent_message,
                                model.matchHandled,
                                h
                            ),
                            action(
                                "Reset",
                                MessagesDemo.Message.ClickedResetMessageHandler(),
                                to_parent_message,
                                !model.matchHandled,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Exhaustive by default",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `Message.match<UpdateReturn>(
  message,
  {
    ClickedIncrement: () => ...,
    UpdatedSearch: ({ value }) => ...,
    SucceededLoadNotes: ({ count }) => ...,
    FailedLoadNotes: ({ error }) => ...,
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
                            "defineMessageUnion intentionally exposes constructors plus exhaustive match. If you add a new variant, exhaustive call sites must acknowledge it. For partial/shared-tag handling, Foldkit recommends Effect Match instead.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const boundary_view = <ParentMessage>(
    model: MessagesDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const child = MessagesDemo.childMessage(model)
    const parent = MessagesDemo.parentWrappedMessage(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · keep child vocabularies behind one parent message",
                [
                    h.div(
                        [h.Class("p-5")],
                        [
                            input_control(
                                "Child draft",
                                model.childDraft,
                                (value) =>
                                    to_parent_message(
                                        MessagesDemo.Message.UpdatedChildDraft({
                                            value,
                                        })
                                    ),
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 lg:grid-cols-[1fr_auto_1fr]"
                            ),
                        ],
                        [
                            message_card("ComposerMessage", child, "cyan", h),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                [
                                    model.childWrapped
                                        ? "GotComposerMessage →"
                                        : "wrap child →",
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        model.childWrapped ? "" : "opacity-35"
                                    ),
                                ],
                                [
                                    message_card(
                                        "ParentMessage",
                                        parent,
                                        "violet",
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Wrap child message",
                                MessagesDemo.Message.ClickedWrapChildMessage(),
                                to_parent_message,
                                model.childWrapped,
                                h
                            ),
                            action(
                                "Reset",
                                MessagesDemo.Message.ClickedResetChildMessage(),
                                to_parent_message,
                                model.childDraft === "Hello Foldkit" &&
                                    !model.childWrapped,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Why Got*?",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "A parent does not need every child tag flattened into its own union. `GotComposerMessage: { message: ComposerMessage }` gives the child a vocabulary it can grow independently, while the parent handles one explicit boundary event.",
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Keep the owning union visible",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Use `Message.ClickedSave()` rather than destructuring `ClickedSave` into a sibling binding. The namespace at the call site makes the event's owning domain explicit.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: MessagesDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Facts"
                ? fact_view(model, to_parent_message, h)
                : model.stage === "Union"
                  ? union_view(model, to_parent_message, h)
                  : model.stage === "Match"
                    ? match_view(model, to_parent_message, h)
                    : boundary_view(model, to_parent_message, h),
        ]
    )
