import * as Ui from "@foldkit/ui"
import { Mount } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./mount.ts"

type ToParentMessage<ParentMessage> = (message: Demo.Message) => ParentMessage

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
    message: Demo.Message,
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
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Foldkit Mount examples"),
        ],
        Demo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        Demo.Message.SelectedMountStage({
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

const fact_grid = <ParentMessage>(
    facts: ReadonlyArray<readonly [string, string]>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4")],
        facts.map(([label, value]) =>
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
                                "text-[9px] font-semibold tracking-wider text-muted-foreground uppercase"
                            ),
                        ],
                        [label]
                    ),
                    h.div(
                        [
                            h.Class(
                                "mt-2 break-words font-mono text-xs font-semibold text-cyan-500"
                            ),
                        ],
                        [value]
                    ),
                ]
            )
        )
    )

const code_card = <ParentMessage>(
    label: string,
    code: string,
    tone: "cyan" | "green" | "amber" | "violet",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const classes =
        tone === "green"
            ? "border-emerald-500/40 bg-emerald-500/5"
            : tone === "amber"
              ? "border-amber-500/40 bg-amber-500/5"
              : tone === "violet"
                ? "border-violet-500/40 bg-violet-500/5"
                : "border-cyan-500/40 bg-cyan-500/5"

    return h.div(
        [h.Class(`rounded-[var(--radius-surface)] border ${classes}`)],
        [
            h.div(
                [
                    h.Class(
                        "border-b-(length:--surface-border-width) border-border px-4 py-3 text-xs font-semibold"
                    ),
                ],
                [label]
            ),
            h.pre(
                [
                    h.Class(
                        "overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-6"
                    ),
                ],
                [code]
            ),
        ]
    )
}

const cause_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · choose by what causes the side effect",
                [
                    h.div(
                        [h.Class("space-y-2 p-5")],
                        Demo.causeFacts().map(([primitive, cause]) =>
                            h.div(
                                [
                                    h.Class(
                                        primitive === "Mount"
                                            ? "grid gap-3 rounded-[var(--radius-surface)] border border-emerald-500/40 bg-emerald-500/5 p-4 md:grid-cols-[10rem_1fr] md:items-center"
                                            : "grid gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 md:grid-cols-[10rem_1fr] md:items-center"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                primitive === "Mount"
                                                    ? "font-mono text-sm font-semibold text-emerald-600"
                                                    : "font-mono text-sm font-semibold"
                                            ),
                                        ],
                                        [primitive]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [cause]
                                    ),
                                ]
                            )
                        )
                    ),
                ],
                h
            ),
            panel(
                "Check the cause, not the timing",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Use Mount only when the work is inseparable from a particular live Element and should live exactly as long as that DOM node. Something merely happens after an element appears does not automatically make it Mount work — focus caused by OpenedDialog is still a Command.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const lifecycle_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · setup and cleanup follow DOM-node identity",
                [
                    fact_grid(Demo.lifecycleFacts(model), h),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [
                            model.showMeasuredPanel
                                ? h.div(
                                      [
                                          h.Key(
                                              `measure-panel-${model.panelGeneration}`
                                          ),
                                          h.Class(
                                              "min-h-24 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                                          ),
                                          h.OnMount(
                                              Mount.mapMessage(
                                                  Demo.MeasurePanel({
                                                      instanceId: `measure-panel-${model.panelGeneration}`,
                                                  }),
                                                  to_parent_message
                                              )
                                          ),
                                      ],
                                      [
                                          `Mounted instance: measure-panel-${model.panelGeneration}`,
                                      ]
                                  )
                                : h.div(
                                      [
                                          h.Class(
                                              "rounded-[var(--radius-surface)] border border-dashed border-border p-4 text-muted-foreground"
                                          ),
                                      ],
                                      ["Element absent → Mount scope closed"]
                                  ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                model.showMeasuredPanel
                                    ? "Remove element"
                                    : "Insert element",
                                Demo.Message.ClickedToggleMeasuredPanel(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Replace keyed element",
                                Demo.Message.ClickedReplaceMeasuredPanel(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Reset",
                                Demo.Message.ClickedResetMountDemo(),
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
                "Real Mount.define",
                [
                    code_card(
                        "One-shot mount",
                        `const MeasurePanel =
  Mount.define(
    "MeasurePanel",
    {
      args: {
        instanceId:
          Schema.String
      },

      messages: [
        Message.MeasuredPanel
      ],

      execute: ({
        element,
        instanceId
      }) =>
        Effect.gen(function* () {
          yield* Effect.acquireRelease(
            setup(element),
            cleanup
          )

          return Message.MeasuredPanel({
            instanceId,
            width:
              element
                .getBoundingClientRect()
                .width
          })
        })
    }
  )

h.div([
  h.Key(instanceId),
  h.OnMount(
    MeasurePanel({
      instanceId
    })
  )
])`,
                        "green",
                        h
                    ),
                ],
                h
            ),
            panel(
                "VNode re-render is not remount",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Foldkit rebuilds VNodes every render, but a reused DOM node keeps its Mount running. Removing the node closes the Mount scope; changing a stable key replaces the node, runs old finalizers, then acquires a fresh Mount. In keyed lists, use stable Model identity so the node and Mount move with the same logical item.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const stream_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · defineStream for continuing element-owned events",
                [
                    fact_grid(Demo.streamFacts(model), h),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "h-40 overflow-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background"
                                    ),
                                    h.OnMount(
                                        Mount.mapMessage(
                                            Demo.ObservePanelScroll({
                                                instanceId: "scroll-panel",
                                            }),
                                            to_parent_message
                                        )
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "min-h-[520px] p-4 text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Scroll this panel. Its listener exists only while this DOM element exists.",
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
                "Listener and cleanup share the same Mount scope",
                [
                    code_card(
                        "Continuous scroll Mount",
                        `const ObservePanelScroll =
  Mount.defineStream(
    "ObservePanelScroll",
    {
      args: {
        instanceId:
          Schema.String
      },

      messages: [
        Message.ObservedPanelScroll
      ],

      execute: ({
        element,
        instanceId
      }) =>
        Stream.callback(queue =>
          Effect.gen(function* () {
            yield* Effect.acquireRelease(
              addScrollListener(
                element,
                event =>
                  Queue.offerUnsafe(
                    queue,
                    Message.ObservedPanelScroll({
                      instanceId,
                      scrollTop:
                        event.currentTarget
                          .scrollTop
                    })
                  )
              ),
              removeScrollListener
            )

            return yield* Effect.never
          })
        )
    }
  )`,
                        "cyan",
                        h
                    ),
                ],
                h
            ),
            panel(
                "Args are captured at mount",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Mount args are per-instance acquisition inputs, not reactive properties. A reused DOM node does not rerun execute merely because a later render creates a new MountAction with different args. If a later Message should cause new work, use a Command; if changing Model data should own an ongoing stream lifetime, use a Subscription.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const paused_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · historical DOM can pause while the live app keeps running",
                [
                    fact_grid(Demo.pausedFacts(model), h),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                                    ),
                                    h.OnMount(
                                        Mount.mapMessage(
                                            Demo.MountEditorShell({
                                                instanceId:
                                                    model.editorInstance,
                                            }),
                                            to_parent_message
                                        )
                                    ),
                                ],
                                [
                                    "Imperative editor shell — inspect data-view-state / aria-readonly during DevTools time travel.",
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "viewStateChanges",
                [
                    code_card(
                        "Imperative integration",
                        `const MountEditorShell =
  Mount.define(
    "MountEditorShell",
    {
      messages: [
        Message.CompletedMountEditorShell
      ],

      execute: ({
        element,
        viewStateChanges
      }) =>
        Effect.gen(function* () {
          const editor =
            yield* Effect.acquireRelease(
              createEditor(element),
              editor =>
                Effect.sync(
                  () => editor.destroy()
                )
            )

          yield* viewStateChanges.pipe(
            Stream.runForEach(
              state =>
                Effect.sync(
                  () =>
                    editor.setEditable(
                      state === "Live"
                    )
                )
            ),
            Effect.forkScoped
          )

          return Message
            .CompletedMountEditorShell()
        })
    }
  )`,
                        "violet",
                        h
                    ),
                ],
                h
            ),
            panel(
                "Paused is view state, not application state",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "DevTools time travel can display historical DOM while the live Model, Commands, Subscriptions, and live-acquired Mounts continue. A surviving Mount observes `Paused` and should make DOM-derived interaction read-only; when Foldkit restores the live view it observes `Live` again. Do not turn this signal into an application Message.",
                        ]
                    ),
                ],
                h
            ),
            panel(
                "One OnMount per element",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "A VNode has one insert/destroy Mount hook. Two `h.OnMount(...)` attributes on the same element do not compose — the later one replaces the earlier one. Combine element-owned behaviors into one Mount and register all required releases in that single scope.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

export const view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Cause"
                ? cause_view(model, to_parent_message, h)
                : model.stage === "Lifecycle"
                  ? lifecycle_view(model, to_parent_message, h)
                  : model.stage === "Stream"
                    ? stream_view(model, to_parent_message, h)
                    : paused_view(model, to_parent_message, h),
        ]
    )
