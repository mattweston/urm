import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as UpdateDemo from "./update.ts"

type ToParentMessage<ParentMessage> = (
    message: UpdateDemo.Message
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
    message: UpdateDemo.Message,
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
    model: UpdateDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Foldkit Update examples"),
        ],
        UpdateDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        UpdateDemo.Message.SelectedUpdateStage({ stage })
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

const transition_view = <ParentMessage>(
    model: UpdateDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const preview = UpdateDemo.transitionPreview(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · one pure function defines every transition",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            result_card(
                                "current Model.count",
                                String(preview.before),
                                "cyan",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["ClickedPureIncrement → update →"]
                            ),
                            result_card(
                                "next Model.count",
                                String(preview.after),
                                "green",
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Click increment",
                                UpdateDemo.Message.ClickedPureIncrement(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Reset count",
                                UpdateDemo.Message.ClickedPureReset(),
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
                "The update boundary",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `const update = (model, message) =>
  Message.match<Update.Return<Model, Message>>(
    message,
    {
      ClickedIncrement: () => ({
        model: evo(model, {
          count: count => count + 1
        })
      })
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
                            "Update is pure: same Model + same Message → same return value. It does not mutate state or perform browser/network/timer work. Those effects are described as Commands and executed by the Runtime after update returns.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const commands_view = <ParentMessage>(
    model: UpdateDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const preview = UpdateDemo.commandPreview(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · return Commands beside the next Model",
                [
                    h.div(
                        [h.Class("grid gap-3 p-5 sm:grid-cols-3")],
                        [
                            result_card(
                                "Model.count",
                                String(preview.modelCount),
                                "cyan",
                                h
                            ),
                            result_card(
                                "persistedCount",
                                String(preview.persistedCount),
                                "violet",
                                h
                            ),
                            result_card(
                                "runtime state",
                                preview.state,
                                model.isPersisting ? "amber" : "green",
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                model.isPersisting
                                    ? "Persisting…"
                                    : "Increment + persist",
                                UpdateDemo.Message.ClickedPersistIncrement(),
                                to_parent_message,
                                model.isPersisting,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Transition now; effect later",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `ClickedPersistIncrement: () => {
  const nextCount = model.count + 1

  return {
    model: evo(model, {
      count: () => nextCount,
      isPersisting: () => true
    }),
    commands: [
      PersistCount({ count: nextCount })
    ]
  }
}

CompletedPersistCount: ({ count }) => ({
  model: evo(model, {
    persistedCount: () => count,
    isPersisting: () => false
  })
})`,
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Optional means omit it",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "When a branch statically creates no Commands, return `{ model }` and omit `commands`. Do not write a literal `commands: []`. With exactOptionalPropertyTypes, also avoid manually copying `commands: someResult.commands`; use the Update composition helpers instead.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const combine_view = <ParentMessage>(
    model: UpdateDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · compose update Steps",
                [
                    h.div(
                        [h.Class("grid gap-3 p-5 sm:grid-cols-3")],
                        [
                            result_card(
                                "dialogOpen",
                                String(model.dialogOpen),
                                model.dialogOpen ? "green" : "cyan",
                                h
                            ),
                            result_card(
                                "status",
                                model.status,
                                model.status === "Clean" ? "green" : "amber",
                                h
                            ),
                            result_card(
                                "audit",
                                model.auditCompleted
                                    ? "completed"
                                    : "not completed",
                                model.auditCompleted ? "green" : "violet",
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border"
                            ),
                        ],
                        model.combineLog.length === 0
                            ? [
                                  h.div(
                                      [
                                          h.Class(
                                              "px-5 py-8 text-center text-sm text-muted-foreground"
                                          ),
                                      ],
                                      ["Run the combined update."]
                                  ),
                              ]
                            : model.combineLog.map((entry, index) =>
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
                                              [
                                                  String(index + 1).padStart(
                                                      2,
                                                      "0"
                                                  ),
                                              ]
                                          ),
                                          h.span(
                                              [h.Class("font-mono text-xs")],
                                              [entry]
                                          ),
                                      ]
                                  )
                              )
                    ),
                    controls(
                        [
                            action(
                                "Run Update.combine",
                                UpdateDemo.Message.ClickedRunCombinedUpdate(),
                                to_parent_message,
                                model.combineLog.length > 0,
                                h
                            ),
                            action(
                                "Reset",
                                UpdateDemo.Message.ClickedResetUpdateDemo(),
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
                "Each Step sees the previous Step's Model",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `return Update.combine(model, [
  openDialog,
  clearStatus,
  queueAudit
])`,
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Steps run in list order against the Model produced by the previous Step. Their Commands are concatenated into one returned batch. The Runtime then forks those Commands independently, so application logic must not depend on Command execution/completion order.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const child_view = <ParentMessage>(
    model: UpdateDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const outMessage = UpdateDemo.outMessagePreview(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · fold child updates into the parent",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            result_card(
                                "ChildModel.count",
                                String(model.child.count),
                                "cyan",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["GotChildMessage → foldChild →"]
                            ),
                            result_card(
                                "Parent child field",
                                JSON.stringify(model.child),
                                "green",
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Child +1",
                                UpdateDemo.Message.GotChildMessage({
                                    message:
                                        UpdateDemo.ChildMessage.ClickedIncrement(),
                                }),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Child reset",
                                UpdateDemo.Message.GotChildMessage({
                                    message:
                                        UpdateDemo.ChildMessage.ClickedReset(),
                                }),
                                to_parent_message,
                                model.child.count === 0,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "foldChild owns the plumbing",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `const foldChildCounter =
  Update.foldChild({
    update: childUpdate,

    read: model =>
      Option.some(model.child),

    write: (model, nextChild) =>
      evo(model, {
        child: () => nextChild
      }),

    toParentMessage: message =>
      Message.GotChildMessage({ message })
  })`,
                        ]
                    ),
                ],
                h
            ),
            panel(
                "OutMessages are a different return channel",
                [
                    h.div(
                        [h.Class("p-5")],
                        [
                            h.pre(
                                [
                                    h.Class(
                                        "overflow-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 font-mono text-xs leading-6"
                                    ),
                                ],
                                [
                                    `const dialogClose = {
  model: evo(model, {
    dialogOpen: () => false
  })
}

return Update.withOutMessage(
  dialogClose,
  OutMessage.ClosedDemo({
    reason: "user closed demo"
  })
)`,
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        model.showOutMessageExample
                                            ? "mt-4"
                                            : "mt-4 opacity-35"
                                    ),
                                ],
                                [
                                    result_card(
                                        "ReturnWithOutMessage.outMessage",
                                        outMessage === undefined
                                            ? "undefined"
                                            : JSON.stringify(outMessage),
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
                                "Show OutMessage result",
                                UpdateDemo.Message.ClickedShowOutMessageExample(),
                                to_parent_message,
                                model.showOutMessageExample,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Don't lose an OutMessage",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "`Update.Return<Model, Message>` explicitly cannot contain an OutMessage; `ReturnWithOutMessage` can. That type distinction prevents child results that may report something outward from being silently treated as plain `{ model, commands }` results.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: UpdateDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Transition"
                ? transition_view(model, to_parent_message, h)
                : model.stage === "Commands"
                  ? commands_view(model, to_parent_message, h)
                  : model.stage === "Combine"
                    ? combine_view(model, to_parent_message, h)
                    : child_view(model, to_parent_message, h),
        ]
    )
