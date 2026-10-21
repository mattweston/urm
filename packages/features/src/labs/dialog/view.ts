/** # Dialog view */
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"
import { GotAnimatedMessage, GotBasicMessage, type Message } from "./message.ts"
import type { Model } from "./model.ts"

const triggerClassName =
    "px-4 py-2 text-base font-normal cursor-pointer transition rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background text-foreground hover:bg-accent select-none [box-shadow:var(--shadow-control)]"

const backdropClassName = "fixed inset-0 bg-background/80"

const animatedBackdropClassName =
    "fixed inset-0 bg-background/80 transition duration-150 ease-out data-[closed]:opacity-0"

const panelClassName =
    "bg-card text-card-foreground rounded-[var(--radius-surface)] p-6 max-w-md mx-auto relative [box-shadow:var(--shadow-overlay)]"

const animatedPanelClassName =
    "bg-card text-card-foreground rounded-[var(--radius-surface)] p-6 max-w-md mx-auto relative [box-shadow:var(--shadow-overlay)] transition duration-150 ease-out data-[closed]:opacity-0 data-[closed]:scale-95"

const titleClassName = "text-lg font-normal text-foreground mb-2"

const dialogClassName =
    "backdrop:bg-transparent bg-transparent p-0 open:flex items-center justify-center"

const cancelButtonClassName =
    "px-4 py-2 text-base font-normal cursor-pointer transition rounded-[var(--radius-control)] border-(length:--surface-border-width) border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"

const confirmButtonClassName =
    "px-4 py-2 text-base font-normal cursor-pointer transition rounded-[var(--radius-control)] bg-primary text-primary-foreground hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"

const dialogPanel = <ParentMessage>(
    dialogModel: Ui.Dialog.Model,
    render: Ui.Dialog.RenderInfo,
    toDialogMessage: (message: Ui.Dialog.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [],
        [
            h.h2(
                [h.Class(titleClassName), h.Id(Ui.Dialog.titleId(dialogModel))],
                ["Confirm Action"]
            ),
            h.p(
                [h.Class("text-muted-foreground mb-4")],
                [
                    "Are you sure you want to proceed? This action demonstrates the Dialog component with focus trapping, backdrop click, and Escape key handling.",
                ]
            ),
            h.div(
                [h.Class("flex gap-2 justify-end")],
                [
                    h.button(
                        [...render.closeButton, h.Class(cancelButtonClassName)],
                        ["Cancel"]
                    ),
                    h.button(
                        [
                            h.Class(confirmButtonClassName),
                            h.OnClick(
                                toDialogMessage(
                                    Ui.Dialog.Message.RequestedClose()
                                )
                            ),
                        ],
                        ["Confirm"]
                    ),
                ]
            ),
        ]
    )
}

/**
 * Open the basic and animated dialog variants to compare their presentation.
 * Both use the same typed dialog model for focus management, escape-key
 * dismissal, backdrop interaction, and returning focus to the trigger.
 */
export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const basic = model.basic
    const animated = model.animated
    const toBasicMessage = (message: Ui.Dialog.Message): ParentMessage =>
        toParentMessage(GotBasicMessage({ message }))
    const toAnimatedMessage = (message: Ui.Dialog.Message): ParentMessage =>
        toParentMessage(GotAnimatedMessage({ message }))

    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Dialog"]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Basic"]
            ),
            h.div(
                [h.Class("flex gap-3")],
                [
                    h.button(
                        [
                            h.Class(triggerClassName),
                            h.OnClick(
                                toBasicMessage(
                                    Ui.Dialog.Message.RequestedOpen()
                                )
                            ),
                        ],
                        ["Open Dialog"]
                    ),
                ]
            ),
            h.submodel({
                slotId: basic.id,
                model: basic,
                view: Ui.Dialog.view,
                viewInputs: {
                    toView: (render) =>
                        h.dialog(
                            [...render.dialog, h.Class(dialogClassName)],
                            render.isVisible
                                ? [
                                      h.div(
                                          [
                                              ...render.backdrop,
                                              h.Class(backdropClassName),
                                          ],
                                          []
                                      ),
                                      h.div(
                                          [
                                              ...render.panel,
                                              h.Class(panelClassName),
                                          ],
                                          [
                                              dialogPanel<ParentMessage>(
                                                  basic,
                                                  render,
                                                  toBasicMessage,
                                                  h
                                              ),
                                          ]
                                      ),
                                  ]
                                : []
                        ),
                },
                toParentMessage: toBasicMessage,
            }),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Animated"]
            ),
            h.div(
                [h.Class("flex gap-3")],
                [
                    h.button(
                        [
                            h.Class(triggerClassName),
                            h.OnClick(
                                toAnimatedMessage(
                                    Ui.Dialog.Message.RequestedOpen()
                                )
                            ),
                        ],
                        ["Open Animated Dialog"]
                    ),
                ]
            ),
            h.submodel({
                slotId: animated.id,
                model: animated,
                view: Ui.Dialog.view,
                viewInputs: {
                    toView: (render) =>
                        h.dialog(
                            [...render.dialog, h.Class(dialogClassName)],
                            render.isVisible
                                ? [
                                      h.div(
                                          [
                                              ...render.backdrop,
                                              h.Class(
                                                  animatedBackdropClassName
                                              ),
                                          ],
                                          []
                                      ),
                                      h.div(
                                          [
                                              ...render.panel,
                                              h.Class(animatedPanelClassName),
                                          ],
                                          [
                                              dialogPanel<ParentMessage>(
                                                  animated,
                                                  render,
                                                  toAnimatedMessage,
                                                  h
                                              ),
                                          ]
                                      ),
                                  ]
                                : []
                        ),
                },
                toParentMessage: toAnimatedMessage,
            }),
        ]
    )
}
