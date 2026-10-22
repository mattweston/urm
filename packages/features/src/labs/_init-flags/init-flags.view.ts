import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./init-flags.ts"

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
            h.AriaLabel("Foldkit Init and Flags examples"),
        ],
        Demo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        Demo.DemoMessage.SelectedInitFlagsStage({
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
            h.pre(
                [
                    h.Class(
                        "mt-2 overflow-auto whitespace-pre-wrap font-mono text-xs font-semibold leading-5"
                    ),
                ],
                [value]
            ),
        ]
    )
}

const flag_case_action = <ParentMessage>(
    flagCase: Demo.FlagCase,
    selected: Demo.FlagCase,
    message: Demo.DemoMessage,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(flagCase, message, to_parent_message, selected === flagCase, h)

const init_view = <ParentMessage>(
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const flags = Demo.flagsForCase(model.flagCase)
    const initialized = Demo.initForCase(model.flagCase)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · init creates the first Model",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["None", "Saved", "Partial", "Request"] as const).map(
                            (flagCase) =>
                                flag_case_action(
                                    flagCase,
                                    model.flagCase,
                                    Demo.DemoMessage.SelectedInitFlagCase({
                                        flagCase,
                                    }),
                                    to_parent_message,
                                    h
                                )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 lg:grid-cols-[1fr_auto_1fr]"
                            ),
                        ],
                        [
                            result_card(
                                "Flags input",
                                Demo.flagsLabel(flags),
                                "cyan",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["init(flags) →"]
                            ),
                            result_card(
                                "first Model",
                                Demo.modelLabel(initialized.model),
                                "green",
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
                                "return type",
                                "Update.Return<Model, Message>",
                                h
                            ),
                            stat(
                                "startup Commands",
                                initialized.commands === undefined
                                    ? "none"
                                    : `WarmStartup × ${initialized.commands.length}`,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Same return shape as update",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `export const init:
  Runtime.ApplicationInit<
    Model,
    Message,
    Flags
  > =
  flags => ({
    model: {
      count:
        Option.getOrElse(
          flags.savedCount,
          () => 0
        ),
      ...
    },

    commands: [
      WarmStartup({ count })
    ]
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
                            "Init is pure. It folds startup input into the first Model and may describe one-shot startup work as Commands. The runtime executes those Commands only after startup has produced the initial Model.",
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
                [h.Class("mt-2 font-mono text-xs font-bold text-violet-500")],
                [value]
            ),
        ]
    )

const flags_view = <ParentMessage>(
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const flags = Demo.flagsForCase(model.flagCase)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · Flags are the typed startup boundary",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["None", "Saved", "Partial", "Request"] as const).map(
                            (flagCase) =>
                                flag_case_action(
                                    flagCase,
                                    model.flagCase,
                                    Demo.DemoMessage.SelectedInitFlagCase({
                                        flagCase,
                                    }),
                                    to_parent_message,
                                    h
                                )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 lg:grid-cols-2"
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
                                    `export const Flags =
  Schema.Struct({
    savedCount:
      Schema.Option(
        Schema.Number
      ),

    savedTheme:
      Schema.Option(Theme),

    requestLabel:
      Schema.Option(
        Schema.String
      )
  })

export type Flags =
  typeof Flags.Type`,
                                ]
                            ),
                            result_card(
                                "Flags value",
                                Demo.flagsLabel(flags),
                                "cyan",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Fresh boot gets Flags from an Effect",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            `export const flags:
  Effect.Effect<Flags> =
  Effect.sync(() => {
    // persisted state,
    // runtime config,
    // other startup-only data

    return Flags.make({
      savedCount,
      savedTheme,
      requestLabel
    })
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
                            "The Effect may perform startup-only I/O, but init remains pure because the runtime resolves that Effect first and passes only the decoded Flags value into init. If the same service is also needed by Commands or Subscriptions, provide it as an application Resource instead of hiding it inside the startup Effect.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const boot_view = <ParentMessage>(
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const steps = Demo.bootSteps(model.flagCase)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · fresh client boot",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        (["None", "Saved", "Partial", "Request"] as const).map(
                            (flagCase) =>
                                flag_case_action(
                                    flagCase,
                                    model.flagCase,
                                    Demo.DemoMessage.SelectedInitFlagCase({
                                        flagCase,
                                    }),
                                    to_parent_message,
                                    h
                                )
                        )
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-2 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-2 lg:grid-cols-5"
                            ),
                        ],
                        steps.map((step, index) =>
                            h.div(
                                [
                                    h.Class(
                                        model.bootStep > index
                                            ? "rounded-[var(--radius-surface)] border border-emerald-500/40 bg-emerald-500/5 p-4"
                                            : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 opacity-35"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold"
                                            ),
                                        ],
                                        [step.title]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-[10px] leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [step.detail]
                                    ),
                                ]
                            )
                        )
                    ),
                    controls(
                        [
                            action(
                                "Advance boot",
                                Demo.DemoMessage.ClickedAdvanceFreshBoot(),
                                to_parent_message,
                                model.bootStep >= steps.length,
                                h
                            ),
                            action(
                                "Reset",
                                Demo.DemoMessage.ClickedResetFreshBoot(),
                                to_parent_message,
                                model.bootStep === 0,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Runtime wiring",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [Demo.freshBootSketch]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Declaring `Flags` in makeApplication changes init's type: Flags become its first argument. Omitting the Flags Schema means init takes no Flags argument, so mismatched startup wiring is caught by TypeScript.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const hydrate_view = <ParentMessage>(
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const comparison = Demo.hydrationComparison(
        model.hydrationServerFlags,
        model.hydrationClientFlags
    )

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · SSR / hydration reuses the same Flags Schema + init",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 lg:grid-cols-2")],
                        [
                            h.div(
                                [],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Server-provided Flags"]
                                    ),
                                    h.div(
                                        [h.Class("flex flex-wrap gap-2")],
                                        (
                                            [
                                                "None",
                                                "Saved",
                                                "Partial",
                                                "Request",
                                            ] as const
                                        ).map((flagCase) =>
                                            flag_case_action(
                                                flagCase,
                                                model.hydrationServerFlags,
                                                Demo.DemoMessage.SelectedServerFlagCase(
                                                    {
                                                        flagCase,
                                                    }
                                                ),
                                                to_parent_message,
                                                h
                                            )
                                        )
                                    ),
                                ]
                            ),
                            h.div(
                                [],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Hypothetical fresh-client Flags"]
                                    ),
                                    h.div(
                                        [h.Class("flex flex-wrap gap-2")],
                                        (
                                            [
                                                "None",
                                                "Saved",
                                                "Partial",
                                                "Request",
                                            ] as const
                                        ).map((flagCase) =>
                                            flag_case_action(
                                                flagCase,
                                                model.hydrationClientFlags,
                                                Demo.DemoMessage.SelectedClientFlagCase(
                                                    {
                                                        flagCase,
                                                    }
                                                ),
                                                to_parent_message,
                                                h
                                            )
                                        )
                                    ),
                                ]
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
                            result_card(
                                "server Model",
                                Demo.modelLabel(comparison.serverModel),
                                "green",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["same init"]
                            ),
                            result_card(
                                "different fresh boot would produce",
                                Demo.modelLabel(
                                    comparison.hypotheticalClientModel
                                ),
                                comparison.same ? "green" : "amber",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Hydration does not rerun the client Flags Effect",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [Demo.hydrationSketch]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "The server/build supplies the concrete Flags value, renderToString encodes it through the declared Schema, and Runtime.hydrate decodes that handoff and calls the same init. A hydrating entry does not provide the fresh-client Flags Effect; missing or invalid handoff data fails startup instead of silently creating a different Model.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Init"
                ? init_view(model, to_parent_message, h)
                : model.stage === "Flags"
                  ? flags_view(model, to_parent_message, h)
                  : model.stage === "Boot"
                    ? boot_view(model, to_parent_message, h)
                    : hydrate_view(model, to_parent_message, h),
        ]
    )
