import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Demo from "./runtime.ts"

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
            h.AriaLabel("Foldkit Runtime examples"),
        ],
        Demo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        Demo.DemoMessage.SelectedRuntimeStage({
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
        [h.Class("grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5")],
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
    tone: "cyan" | "violet" | "green",
    h: HtmlBuilder<ParentMessage>
): Html => {
    const classes =
        tone === "green"
            ? "border-emerald-500/40 bg-emerald-500/5"
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

const ownership_view = <ParentMessage>(
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · choose what the program owns",
                [
                    controls(
                        [
                            action(
                                "Application",
                                Demo.DemoMessage.SelectedOwnershipMode({
                                    ownership: "Application",
                                }),
                                to_parent_message,
                                model.ownership === "Application",
                                h
                            ),
                            action(
                                "Element",
                                Demo.DemoMessage.SelectedOwnershipMode({
                                    ownership: "Element",
                                }),
                                to_parent_message,
                                model.ownership === "Element",
                                h
                            ),
                        ],
                        h
                    ),
                    fact_grid(Demo.ownershipFacts(model.ownership), h),
                ],
                h
            ),
            panel(
                "Two constructors, same architecture",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 md:grid-cols-2")],
                        [
                            code_card(
                                "makeApplication",
                                `Runtime.makeApplication({
  Model,
  init,
  update,
  view: applicationView,
  subscriptions,
  container
})`,
                                "cyan",
                                h
                            ),
                            code_card(
                                "makeElement",
                                `Runtime.makeElement({
  Model,
  init,
  update,
  view: elementView,
  subscriptions,
  container
})`,
                                "violet",
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Ownership is about page authority",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Use makeApplication when Foldkit owns the page and may synchronize document title/head/html state. Use makeElement for a widget inside a page owned by something else; it renders Html only and never clobbers the host page's metadata.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const lifetime_view = <ParentMessage>(
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · choose who owns runtime lifetime",
                [
                    controls(
                        [
                            action(
                                "Runtime.run",
                                Demo.DemoMessage.SelectedLifetimeMode({
                                    lifetime: "Run",
                                }),
                                to_parent_message,
                                model.lifetime === "Run",
                                h
                            ),
                            action(
                                "Runtime.embed",
                                Demo.DemoMessage.SelectedLifetimeMode({
                                    lifetime: "Embed",
                                }),
                                to_parent_message,
                                model.lifetime === "Embed",
                                h
                            ),
                        ],
                        h
                    ),
                    fact_grid(Demo.lifetimeFacts(model), h),
                    model.lifetime === "Embed"
                        ? controls(
                              [
                                  action(
                                      model.embedDisposed
                                          ? "Disposed"
                                          : "handle.dispose()",
                                      Demo.DemoMessage.ClickedDisposeEmbed(),
                                      to_parent_message,
                                      model.embedDisposed,
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
                model.lifetime === "Run"
                    ? "Page-owned lifetime"
                    : "Host-owned lifetime",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            model.lifetime === "Run"
                                ? Demo.runSketch
                                : Demo.embedSketch,
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            model.lifetime === "Run"
                                ? "Runtime.run starts the program for the page lifetime and returns no lifecycle handle."
                                : "Runtime.embed returns an EmbedHandle. The host owns the boundary and calls dispose when it unmounts the Foldkit program; disposal interrupts the runtime scope and removes the rendered DOM from the container.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const routing_view = <ParentMessage>(
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · routing is an Application capability",
                [
                    controls(
                        [
                            action(
                                "Routing off",
                                Demo.DemoMessage.SelectedRoutingMode({
                                    routing: "Off",
                                }),
                                to_parent_message,
                                model.routing === "Off",
                                h
                            ),
                            action(
                                "Routing on",
                                Demo.DemoMessage.SelectedRoutingMode({
                                    routing: "On",
                                }),
                                to_parent_message,
                                model.routing === "On",
                                h
                            ),
                        ],
                        h
                    ),
                    fact_grid(Demo.routingFacts(model.routing), h),
                ],
                h
            ),
            panel(
                "URL changes still become Messages",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            model.routing === "On"
                                ? Demo.routingSketch
                                : `const application =
  Runtime.makeApplication({
    Model,
    init,
    update,
    view,
    container
  })

Runtime.run(application)`,
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            model.routing === "On"
                                ? "onUrlRequest translates a clicked link into a Message so update chooses internal/external navigation policy. onUrlChange translates the new URL into a Message so the Model can store the corresponding route. Routed init receives the current URL."
                                : "Without a routing config, the program leaves the URL bar alone. This is the default for most applications.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const loop_view = <ParentMessage>(
    model: Demo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const steps = Demo.runtimeLoop()

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · Runtime closes the loop",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-2 p-5 md:grid-cols-2 lg:grid-cols-3"
                            ),
                        ],
                        steps.map((step, index) =>
                            h.div(
                                [
                                    h.Class(
                                        model.loopStep > index
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
                                "Advance runtime loop",
                                Demo.DemoMessage.ClickedAdvanceRuntimeLoop(),
                                to_parent_message,
                                model.loopStep >= steps.length,
                                h
                            ),
                            action(
                                "Reset",
                                Demo.DemoMessage.ClickedResetRuntimeLoop(),
                                to_parent_message,
                                model.loopStep === 0,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Pure main.ts, side-effectful entry.ts",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 md:grid-cols-2")],
                        [
                            code_card(
                                "main.ts",
                                `Model
Message
init
update
view
Commands
Subscriptions
Resources`,
                                "green",
                                h
                            ),
                            code_card(
                                "entry.ts",
                                `const program =
  Runtime.makeApplication(...)

Runtime.run(program)`,
                                "violet",
                                h
                            ),
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Keeping Runtime construction/startup in entry.ts leaves the pure application definitions directly importable by tests. The Runtime owns execution: startup, rendering/patching, Command fibers, Subscription scopes, Resources/ManagedResources, and dispatching their result Messages back through update.",
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
            model.stage === "Ownership"
                ? ownership_view(model, to_parent_message, h)
                : model.stage === "Lifetime"
                  ? lifetime_view(model, to_parent_message, h)
                  : model.stage === "Routing"
                    ? routing_view(model, to_parent_message, h)
                    : loop_view(model, to_parent_message, h),
        ]
    )
