import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./submodel.ts"

type ToParentMessage<ParentMessage> = (
    message: Demo.DemoMessage
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
    message: Demo.DemoMessage,
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
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Foldkit Submodel examples"),
        ],
        Demo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        Demo.DemoMessage.SelectedSubmodelStage({
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

const parentMessage = (message: Demo.ParentMessage): Demo.DemoMessage =>
    Demo.DemoMessage.GotParentMessage({
        message,
    })

const fact_grid = <ParentMessage>(
    facts: ReadonlyArray<readonly [string, string]>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("grid gap-3 p-5 sm:grid-cols-2")],
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
                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                            ),
                        ],
                        [label]
                    ),
                    h.div(
                        [
                            h.Class(
                                "mt-2 font-mono text-xs font-semibold text-cyan-500"
                            ),
                        ],
                        [value]
                    ),
                ]
            )
        )
    )

const ownership_view = <ParentMessage>(
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · parent stores the child; child owns the state machine",
                [
                    fact_grid(Demo.ownershipFacts(model.parent), h),
                    controls(
                        [
                            action(
                                "Reset child theme through helper",
                                parentMessage(
                                    Demo.ParentMessage.ClickedResetSettings()
                                ),
                                to_parent_message,
                                model.parent.settings.theme === "System",
                                h
                            ),
                            action(
                                "Reset whole demo",
                                Demo.DemoMessage.ClickedResetSubmodelDemo(),
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
                "Do not reach into the child slice",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 md:grid-cols-2")],
                        [
                            code_card(
                                "Avoid",
                                `evo(parent, {
  settings: settings =>
    evo(settings, {
      theme: () => "Light"
    })
})`,
                                "amber",
                                h
                            ),
                            code_card(
                                "Prefer",
                                `export const setTheme =
  (model, theme) =>
    settingsUpdate(
      model,
      SettingsMessage.ChangedTheme({
        theme
      })
    )

foldSettingsTheme(
  parent,
  "Light"
)`,
                                "green",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const code_card = <ParentMessage>(
    label: string,
    code: string,
    tone: "amber" | "green" | "violet" | "cyan",
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

const fold_view = <ParentMessage>(
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const steps = Demo.foldSteps(model.parent)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · Got*Message routes into Update.foldChild",
                [
                    h.div(
                        [h.Class("grid gap-2 p-5 md:grid-cols-5")],
                        steps.map((step, index) =>
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-violet-500/30 bg-violet-500/5 p-3"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        [String(index + 1).padStart(2, "0")]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-[10px] leading-5"
                                            ),
                                        ],
                                        [step]
                                    ),
                                ]
                            )
                        )
                    ),
                    controls(
                        [
                            action(
                                "Child: Dark",
                                parentMessage(
                                    Demo.ParentMessage.GotSettingsMessage({
                                        message:
                                            Demo.SettingsMessage.ChangedTheme({
                                                theme: "Dark",
                                            }),
                                    })
                                ),
                                to_parent_message,
                                model.parent.settings.theme === "Dark",
                                h
                            ),
                            action(
                                "Toggle notifications",
                                parentMessage(
                                    Demo.ParentMessage.GotSettingsMessage({
                                        message:
                                            Demo.SettingsMessage.ToggledNotifications(),
                                    })
                                ),
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
                "Late child Messages can safely no-op",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "`read` returns Option because a routed or keyed child may have disappeared before a queued Message arrives. `Option.none()` makes foldChild return the parent unchanged instead of crashing or writing into a missing child.",
                        ]
                    ),
                    controls(
                        [
                            action(
                                model.simulatedLateMessage
                                    ? "Late message simulated"
                                    : "Simulate late-message case",
                                Demo.DemoMessage.ClickedSimulateLateMessage(),
                                to_parent_message,
                                model.simulatedLateMessage,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
        ]
    )
}

const view_boundary_view = <ParentMessage>(
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · h.submodel creates a typed runtime boundary",
                [
                    fact_grid(Demo.viewBoundaryFacts(model.parent), h),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [
                            h.submodel({
                                slotId: "settings-demo",
                                model: model.parent.settings,
                                view: Demo.settingsView,
                                viewInputs: {
                                    currentUser: model.parent.currentUser,
                                    sectionLabel: "Preferences",
                                },
                                toParentMessage: (message) =>
                                    to_parent_message(
                                        parentMessage(
                                            Demo.ParentMessage.GotSettingsMessage(
                                                {
                                                    message,
                                                }
                                            )
                                        )
                                    ),
                            }),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Four required pieces",
                [
                    code_card(
                        "Parent embed",
                        `h.submodel({
  slotId: "settings",
  model: model.settings,
  view: Settings.view,
  viewInputs: {
    currentUser: model.currentUser
  },
  toParentMessage: message =>
    Message.GotSettingsMessage({
      message
    })
})`,
                        "cyan",
                        h
                    ),
                ],
                h
            ),
            panel(
                "slotId is position identity",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "The slot id names this rendered child position under the current parent boundary. Sibling submodels need distinct slotIds. In a dynamic list, use the same stable Model id for the keyed row, slotId, and wrapper Message identifier.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const out_view = <ParentMessage>(
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · OutMessages report facts across the boundary",
                [
                    h.div(
                        [h.Class("space-y-2 p-5")],
                        Demo.outMessageFacts(model.parent).map((fact, index) =>
                            h.div(
                                [
                                    h.Class(
                                        "grid grid-cols-[2.5rem_1fr] gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3"
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
                                    h.span(
                                        [h.Class("font-mono text-xs")],
                                        [fact]
                                    ),
                                ]
                            )
                        )
                    ),
                    controls(
                        [
                            action(
                                "Select Light",
                                parentMessage(
                                    Demo.ParentMessage.GotSettingsMessage({
                                        message:
                                            Demo.SettingsMessage.ChangedTheme({
                                                theme: "Light",
                                            }),
                                    })
                                ),
                                to_parent_message,
                                model.parent.settings.theme === "Light",
                                h
                            ),
                            action(
                                "Select Dark",
                                parentMessage(
                                    Demo.ParentMessage.GotSettingsMessage({
                                        message:
                                            Demo.SettingsMessage.ChangedTheme({
                                                theme: "Dark",
                                            }),
                                    })
                                ),
                                to_parent_message,
                                model.parent.settings.theme === "Dark",
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Message vs OutMessage",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 md:grid-cols-2")],
                        [
                            code_card(
                                "Child Message",
                                `ChangedTheme({
  theme: "Dark"
})

→ route this back into
  settingsUpdate`,
                                "cyan",
                                h
                            ),
                            code_card(
                                "Child OutMessage",
                                `SelectedTheme({
  theme: "Dark"
})

→ report a fact the
  parent may act on`,
                                "violet",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "foldOutMessage sees the updated parent",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "foldChild writes the updated child Model into the parent first, then runs `foldOutMessage` as an Update.Step. That lets the parent react to the surfaced fact while seeing the completed child state. Do not manually unpack a child return: that can leave an OutMessage behind.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

export const view = <ParentMessage>(
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Ownership"
                ? ownership_view(model, to_parent_message, h)
                : model.stage === "Fold"
                  ? fold_view(model, to_parent_message, h)
                  : model.stage === "View"
                    ? view_boundary_view(model, to_parent_message, h)
                    : out_view(model, to_parent_message, h),
        ]
    )
