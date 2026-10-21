/** # Disclosure view */
import clsx from "clsx"
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Icon from "../_shared/icon.ts"
import { ToggledOpen, type Message } from "./message.ts"
import type { Model } from "./model.ts"

const buttonClassName =
    "w-full flex items-center justify-between px-4 py-3 text-left text-base font-normal cursor-pointer transition border-(length:--surface-border-width) border-border text-foreground hover:bg-accent rounded-[var(--radius-surface)] data-[open]:rounded-b-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 select-none [box-shadow:var(--shadow-surface)]"

const panelClassName =
    "px-4 py-3 border-x-(length:--surface-border-width) border-b-(length:--surface-border-width) border-border rounded-b-[var(--radius-surface)] text-foreground"

const chevron = <ParentMessage>(
    isOpen: boolean,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.span(
        [h.Class(clsx("text-muted-foreground", { "rotate-180": isOpen }))],
        [Icon.chevronDown("w-4 h-4")]
    )
}

/**
 * The disclosure keeps its open state in the standalone lab model. Foldkit's
 * headless component connects the trigger to its conditional panel and exposes
 * the expanded state to assistive technology.
 */
export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Disclosure"]
            ),
            Ui.Disclosure.view(
                {
                    id: "disclosure-demo",
                    isOpen: model.isOpen,
                    onToggle: (isOpen) =>
                        toParentMessage(ToggledOpen({ isOpen })),
                    toView: (attributes) =>
                        h.div(
                            [],
                            [
                                h.button(
                                    [
                                        ...attributes.button,
                                        h.Class(buttonClassName),
                                    ],
                                    [
                                        h.div(
                                            [
                                                h.Class(
                                                    "flex items-center justify-between w-full"
                                                ),
                                            ],
                                            [
                                                h.span(
                                                    [],
                                                    ["What is Foldkit?"]
                                                ),
                                                chevron<ParentMessage>(
                                                    model.isOpen,
                                                    h
                                                ),
                                            ]
                                        ),
                                    ]
                                ),
                                model.isOpen
                                    ? h.div(
                                          [
                                              ...attributes.panel,
                                              h.Class(panelClassName),
                                          ],
                                          [
                                              h.p(
                                                  [h.Class("text-foreground")],
                                                  [
                                                      "Foldkit is an Elm-inspired UI framework powered by Effect. It brings the Model-View-Update architecture to TypeScript with Schema-typed state, explicit side effects via commands, and composable headless UI components.",
                                                  ]
                                              ),
                                          ]
                                      )
                                    : h.empty,
                            ]
                        ),
                },
                h
            ),
        ]
    )
}
