import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as ViewDemo from "./examples/view.ts"

type ToParentMessage<ParentMessage> = (
    message: ViewDemo.DemoMessage
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
    message: ViewDemo.DemoMessage,
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
    model: ViewDemo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Foldkit View examples"),
        ],
        ViewDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        ViewDemo.DemoMessage.SelectedViewStage({ stage })
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

const appMessage = (message: ViewDemo.Message): ViewDemo.DemoMessage =>
    ViewDemo.DemoMessage.GotAppMessage({
        message,
    })

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

const render_view = <ParentMessage>(
    model: ViewDemo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · Model in, HTML out",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-cyan-500/40 bg-cyan-500/5 p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Model"]
                                    ),
                                    h.pre(
                                        [
                                            h.Class(
                                                "mt-3 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-5 text-cyan-500"
                                            ),
                                        ],
                                        [
                                            JSON.stringify(
                                                {
                                                    count: model.app.count,
                                                    search: model.app.search,
                                                    locale: model.app.locale,
                                                },
                                                null,
                                                2
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["view(model, h) →"]
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
                                        ["Rendered description"]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-3 font-mono text-3xl font-bold"
                                            ),
                                        ],
                                        [String(model.app.count)]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-2 font-mono text-xs text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            model.app.search === ""
                                                ? "search = empty"
                                                : `search = "${model.app.search}"`,
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Increment",
                                appMessage(ViewDemo.Message.ClickedIncrement()),
                                to_parent_message,
                                false,
                                h
                            ),
                            action(
                                "Reset demo",
                                ViewDemo.DemoMessage.ClickedResetViewDemo(),
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
                "No hooks, no local state, no Effects",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "A Foldkit view is a pure description: given the same Model it produces the same Html/Document. It does not mutate state or execute Effects. Interactions only describe Messages for the runtime to dispatch.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const document_view = <ParentMessage>(
    model: ViewDemo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const facts = ViewDemo.documentFacts(model.app)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · Document fields are also derived from Model",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-5"
                            ),
                        ],
                        facts.map(([label, value]) =>
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-3"
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
                                                "mt-2 break-words font-mono text-xs font-semibold text-violet-500"
                                            ),
                                        ],
                                        [value]
                                    ),
                                ]
                            )
                        )
                    ),
                    controls(
                        [
                            action(
                                "English",
                                appMessage(
                                    ViewDemo.Message.SelectedLocale({
                                        locale: "English",
                                    })
                                ),
                                to_parent_message,
                                model.app.locale === "English",
                                h
                            ),
                            action(
                                "Arabic",
                                appMessage(
                                    ViewDemo.Message.SelectedLocale({
                                        locale: "Arabic",
                                    })
                                ),
                                to_parent_message,
                                model.app.locale === "Arabic",
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Application vs embedded view",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "A root makeApplication view returns a Document: title + body, with optional lang, dir, canonical, and ogUrl. An embedded makeElement view returns Html only because it does not own page-level metadata.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const key_action = <ParentMessage>(
    key: string,
    model: ViewDemo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        key,
        ViewDemo.DemoMessage.SelectedClaimedKey({
            key,
        }),
        to_parent_message,
        model.claimedKey === key,
        h
    )

const events_view = <ParentMessage>(
    model: ViewDemo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const preview = ViewDemo.eventPreview(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · handlers translate browser data into Messages",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 lg:grid-cols-2")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "space-y-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Simple events"]
                                    ),
                                    h.div(
                                        [h.Class("font-mono text-xs")],
                                        [
                                            "h.OnClick(Message.ClickedIncrement())",
                                        ]
                                    ),
                                    h.div(
                                        [h.Class("font-mono text-xs")],
                                        [
                                            "h.OnInput(value => Message.UpdatedSearch({ value }))",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "space-y-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Conditional key claim"]
                                    ),
                                    h.div(
                                        [h.Class("flex flex-wrap gap-2")],
                                        [
                                            key_action(
                                                "Enter",
                                                model,
                                                to_parent_message,
                                                h
                                            ),
                                            key_action(
                                                "Escape",
                                                model,
                                                to_parent_message,
                                                h
                                            ),
                                            key_action(
                                                "ArrowDown",
                                                model,
                                                to_parent_message,
                                                h
                                            ),
                                            key_action(
                                                "x",
                                                model,
                                                to_parent_message,
                                                h
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                preview.claimed
                                                    ? "rounded-[var(--radius-surface)] border border-emerald-500/40 bg-emerald-500/5 p-3 font-mono text-xs text-emerald-600"
                                                    : "rounded-[var(--radius-surface)] border border-amber-500/40 bg-amber-500/5 p-3 font-mono text-xs text-amber-600"
                                            ),
                                        ],
                                        [`${preview.key} → ${preview.output}`]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Some claims the event; None leaves it to the browser",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "With OnKeyDownPreventDefault, a translator returning Some(message) causes Foldkit to synchronously prevent the browser default and dispatch that Message. Returning None performs no dispatch and leaves the key's native behavior alone.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const composition_view = <ParentMessage>(
    model: ViewDemo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · the builder follows the Message boundary",
                [
                    h.div(
                        [h.Class("grid gap-4 p-5 lg:grid-cols-2")],
                        [
                            h.pre(
                                [
                                    h.Class(
                                        "overflow-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 font-mono text-xs leading-6"
                                    ),
                                ],
                                [
                                    `const helper = (
  count: number,
  h: HtmlBuilder<Message>
) =>
  h.div([], [String(count)])

const genericHelper =
  <ParentMessage>(
    text: string,
    h: HtmlBuilder<ParentMessage>
  ) =>
    h.p([], [text])`,
                                ]
                            ),
                            h.pre(
                                [
                                    h.Class(
                                        "overflow-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 font-mono text-xs leading-6"
                                    ),
                                ],
                                [
                                    `const childView =
  Submodel.defineView<
    ChildModel,
    ChildMessage
  >((model, h) => ...)

h.submodel({
  slotId: "child-counter",
  model: model.child,
  view: childView,
  toParentMessage: message =>
    Message.GotChildMessage({
      message
    })
})`,
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            result_card(
                                "child builder",
                                "HtmlBuilder<ChildMessage>",
                                "cyan",
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "text-center font-mono text-xs text-violet-500"
                                    ),
                                ],
                                ["toParentMessage →"]
                            ),
                            result_card(
                                "parent builder",
                                "HtmlBuilder<Message>",
                                "green",
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                "Child +1",
                                appMessage(
                                    ViewDemo.Message.GotChildMessage({
                                        message:
                                            ViewDemo.ChildMessage.ClickedIncrement(),
                                    })
                                ),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-4 font-mono text-xs text-muted-foreground"
                            ),
                        ],
                        [`child count = ${model.app.child.count}`]
                    ),
                ],
                h
            ),
            panel(
                "inertHtml at module scope",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "`inertHtml` is `HtmlBuilder<never>`. It can build elements and handler-free attributes when no live builder exists, but it cannot express Foldkit event handlers. Inside a view, use the builder passed to that view.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const result_card = <ParentMessage>(
    label: string,
    value: string,
    tone: "cyan" | "green",
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                tone === "green"
                    ? "rounded-[var(--radius-surface)] border border-emerald-500/40 bg-emerald-500/5 p-4"
                    : "rounded-[var(--radius-surface)] border border-cyan-500/40 bg-cyan-500/5 p-4"
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
                        tone === "green"
                            ? "mt-2 font-mono text-xs font-semibold text-emerald-600"
                            : "mt-2 font-mono text-xs font-semibold text-cyan-500"
                    ),
                ],
                [value]
            ),
        ]
    )

export const view = <ParentMessage>(
    model: ViewDemo.DemoModel,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Render"
                ? render_view(model, to_parent_message, h)
                : model.stage === "Document"
                  ? document_view(model, to_parent_message, h)
                  : model.stage === "Events"
                    ? events_view(model, to_parent_message, h)
                    : composition_view(model, to_parent_message, h),
        ]
    )
