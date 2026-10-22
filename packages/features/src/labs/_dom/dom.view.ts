import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./dom.ts"

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
            h.AriaLabel("Foldkit Dom examples"),
        ],
        Demo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        Demo.Message.SelectedDomStage({ stage })
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

const focus_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · one-shot focus / click belong in Commands",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 md:grid-cols-2")],
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
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["focus target"]
                                    ),
                                    model.focusTargetVisible
                                        ? h.input([
                                              h.Id("dom-demo-focus-input"),
                                              h.Class(
                                                  "mt-3 w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card px-3 py-2"
                                              ),
                                              h.Placeholder(
                                                  "Focus me through Dom.focus"
                                              ),
                                          ])
                                        : h.div(
                                              [
                                                  h.Class(
                                                      "mt-3 rounded-[var(--radius-surface)] border border-dashed border-border p-3 font-mono text-xs text-muted-foreground"
                                                  ),
                                              ],
                                              ["target not in DOM"]
                                          ),
                                    h.button(
                                        [
                                            h.Id("dom-demo-click-target"),
                                            h.Class(
                                                "mt-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-xs"
                                            ),
                                            h.OnClick(
                                                to_parent_message(
                                                    Demo.Message.ClickedByDom()
                                                )
                                            ),
                                        ],
                                        [
                                            `Programmatic click target (${model.programmaticClicks})`,
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("space-y-3")],
                                [
                                    result_card(
                                        "focus status",
                                        model.focusStatus,
                                        model.focusStatus === "ElementNotFound"
                                            ? "amber"
                                            : "green",
                                        h
                                    ),
                                    result_card(
                                        "selector",
                                        Demo.focusInputSelector,
                                        "violet",
                                        h
                                    ),
                                    result_card(
                                        "last failure",
                                        Demo.failureSummary(model),
                                        model.failureLog.length > 0
                                            ? "amber"
                                            : "cyan",
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Focus input",
                                Demo.Message.ClickedFocusInput(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Advance focus",
                                Demo.Message.ClickedAdvanceFocus(),
                                to_parent_message,
                                !model.focusTargetVisible,
                                h
                            ),
                            action(
                                "Dom.clickElement",
                                Demo.Message.ClickedProgrammaticClick(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                model.focusTargetVisible
                                    ? "Remove target"
                                    : "Render target",
                                Demo.Message.ClickedToggleFocusTarget(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Focus missing selector",
                                Demo.Message.ClickedFocusMissing(),
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
                "Dom helpers include commit timing",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Dom.focus, clickElement, showDialog, scrollIntoView, and advanceFocus resolve their selector after Foldkit's next render commit. That means one Message can update Model to render a target and return the DOM Command in the same transition — no manual Render.afterCommit wrapper is needed.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const scroll_mode_action = <ParentMessage>(
    mode: Demo.ScrollMode,
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        mode,
        Demo.Message.SelectedScrollMode({ mode }),
        to_parent_message,
        model.scrollMode === mode,
        h
    )

const scroll_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · choose scroll timing from the UI need",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["Commit", "Paint", "IfNeeded"] as const).map((mode) =>
                            scroll_mode_action(
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
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 lg:grid-cols-[1fr_0.8fr]"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "h-52 overflow-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background"
                                    ),
                                ],
                                [
                                    h.div(
                                        [h.Class("space-y-3 p-4")],
                                        [
                                            ...Array.from(
                                                {
                                                    length: 8,
                                                },
                                                (_, index) =>
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-3 text-xs text-muted-foreground"
                                                            ),
                                                        ],
                                                        [`row ${index + 1}`]
                                                    )
                                            ),
                                            h.div(
                                                [
                                                    h.Id(
                                                        "dom-demo-scroll-target"
                                                    ),
                                                    h.Class(
                                                        "rounded-[var(--radius-surface)] border border-emerald-500/40 bg-emerald-500/5 p-4 font-mono text-xs text-emerald-600"
                                                    ),
                                                ],
                                                ["scroll target"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("space-y-3")],
                                [
                                    result_card(
                                        "mode",
                                        model.scrollMode,
                                        "violet",
                                        h
                                    ),
                                    result_card(
                                        "why",
                                        Demo.scrollModeDetail(model.scrollMode),
                                        "cyan",
                                        h
                                    ),
                                    result_card(
                                        "status",
                                        model.scrollStatus,
                                        "green",
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Scroll to target",
                                Demo.Message.ClickedScrollTarget(),
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
                "Three scroll helpers",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `Dom.scrollIntoView(
  selector,
  { block: "nearest" }
)

Dom.scrollIntoViewAfterPaint(
  selector,
  { block: "center" }
)

Dom.scrollIntoViewIfNotVisible(
  selector,
  {
    block: "center",
    when: "Paint" // or "Commit"
  }
)`,
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const dialog_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · dialogs and page-global DOM state",
                [
                    h.div(
                        [h.Class("grid gap-3 p-5 sm:grid-cols-3")],
                        [
                            result_card(
                                "dialog element",
                                model.dialogVisible ? "rendered" : "absent",
                                model.dialogVisible ? "green" : "cyan",
                                h
                            ),
                            result_card(
                                "dialog status",
                                model.dialogStatus,
                                "violet",
                                h
                            ),
                            result_card(
                                "page scroll",
                                model.pageScrollLocked ? "locked" : "unlocked",
                                model.pageScrollLocked ? "amber" : "green",
                                h
                            ),
                        ]
                    ),
                    model.dialogVisible
                        ? h.dialog(
                              [
                                  h.Id("dom-demo-dialog"),
                                  h.Class(
                                      "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 shadow-xl"
                                  ),
                              ],
                              [
                                  h.h2(
                                      [h.Class("text-lg font-semibold")],
                                      ["DOM demo dialog"]
                                  ),
                                  h.input([
                                      h.Id("dom-demo-dialog-input"),
                                      h.Class(
                                          "mt-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2"
                                      ),
                                      h.Placeholder("showDialog focuses this"),
                                  ]),
                                  h.button(
                                      [
                                          h.Class(
                                              "mt-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2"
                                          ),
                                          h.OnClick(
                                              to_parent_message(
                                                  Demo.Message.ClickedCloseDialog()
                                              )
                                          ),
                                      ],
                                      ["Close"]
                                  ),
                              ]
                          )
                        : h.empty,
                    controls(
                        [
                            action(
                                "Open dialog",
                                Demo.Message.ClickedOpenDialog(),
                                to_parent_message,
                                model.dialogVisible,
                                h
                            ),
                            action(
                                "Close dialog",
                                Demo.Message.ClickedCloseDialog(),
                                to_parent_message,
                                !model.dialogVisible,
                                h
                            ),
                            action(
                                "Lock page scroll",
                                Demo.Message.ClickedLockScroll(),
                                to_parent_message,
                                model.pageScrollLocked,
                                h
                            ),
                            action(
                                "Unlock page scroll",
                                Demo.Message.ClickedUnlockScroll(),
                                to_parent_message,
                                !model.pageScrollLocked,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "showDialog owns framework dialog hygiene",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Dom.showDialog uses a real <dialog> but installs Foldkit's focus trap, Escape handling, return-focus tracking, stacking, and optional modal isolation. It returns true only when those resources were newly installed, which makes concurrent recovery/application calls idempotent.",
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Global helpers are reference-counted / reversible",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Dom.lockScroll and unlockScroll manage page scroll with reference counting, including scrollbar compensation and iOS touch handling. Dom.inertOthers / restoreInert similarly support nested isolation requests. These are still one-shot Effects — typically wrapped in Commands — rather than state mutations in update.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const timing_view = <ParentMessage>(
    model: Demo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · timing contracts and selector failures",
                [
                    h.div(
                        [h.Class("space-y-2 p-5")],
                        Demo.timingFacts().map(([api, timing]) =>
                            h.div(
                                [
                                    h.Class(
                                        "grid gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3 md:grid-cols-[14rem_1fr] md:items-center"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold text-violet-500"
                                            ),
                                        ],
                                        [api]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "text-xs text-muted-foreground"
                                            ),
                                        ],
                                        [timing]
                                    ),
                                ]
                            )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_1fr]"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Id("dom-demo-animated-box"),
                                    h.Class(
                                        "grid min-h-28 place-items-center rounded-[var(--radius-surface)] border border-cyan-500/40 bg-cyan-500/5 font-mono text-xs text-cyan-500 transition-transform duration-500 hover:translate-x-4"
                                    ),
                                ],
                                ["hover me to create a CSS transition"]
                            ),
                            h.div(
                                [h.Class("space-y-3")],
                                [
                                    result_card(
                                        "timing status",
                                        model.timingStatus,
                                        "green",
                                        h
                                    ),
                                    result_card(
                                        "selector failure",
                                        Demo.failureSummary(model),
                                        model.failureLog.length > 0
                                            ? "amber"
                                            : "cyan",
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Wait for animation",
                                Demo.Message.ClickedWaitForAnimation(),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Detect movement",
                                Demo.Message.ClickedDetectMovement(),
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
                "ElementNotFound belongs in the Effect error channel",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `const FocusInput =
  Command.define(
    "FocusInput",
    {
      messages: [
        Message.CompletedDomOperation,
        Message.FailedDomOperation
      ],

      execute:
        Dom.focus(
          "#email-input"
        ).pipe(
          Effect.match({
            onFailure: error =>
              Message.FailedDomOperation({
                operation: "focus",
                reason: String(error)
              }),

            onSuccess: () =>
              Message.CompletedDomOperation({
                operation: "focus",
                detail: "focused"
              })
          })
        )
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
                            "Focus/scroll/dialog/click helpers expose ElementNotFound rather than throwing into update. Catch meaningful missing-target cases and convert them to declared result Messages. Use Effect.ignore only when a stale/missing target is genuinely expected and has no Model consequence.",
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
            model.stage === "Focus"
                ? focus_view(model, to_parent_message, h)
                : model.stage === "Scroll"
                  ? scroll_view(model, to_parent_message, h)
                  : model.stage === "Dialog"
                    ? dialog_view(model, to_parent_message, h)
                    : timing_view(model, to_parent_message, h),
        ]
    )
