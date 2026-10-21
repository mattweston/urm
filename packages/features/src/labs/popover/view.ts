/** # Popover view */
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

const triggerClassName =
    "inline-flex items-center gap-1.5 px-4 py-2 text-base font-normal cursor-pointer transition rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground select-none [box-shadow:var(--shadow-control)]"

const basicPanelClassName =
    "w-64 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-overlay)] p-4 z-10 outline-none"

const animatedPanelClassName =
    "w-64 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-overlay)] p-4 z-10 outline-none transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"

const backdropClassName = "fixed inset-0 z-0"

const wrapperClassName = "relative inline-block"

const POPOVER_ANCHOR = {
    placement: "bottom-start" as const,
    gap: 4,
    padding: 8,
}

/**
 * Compare basic and animated popovers anchored to their triggers. Each popover
 * has an independent submodel, while backdrop and dismissal behavior remain
 * part of the shared component implementation.
 */
export const view = <ParentMessage>(
    popoverBasic: Ui.Popover.Model,
    popoverAnimated: Ui.Popover.Model,
    basicToMessage: (message: Ui.Popover.Message) => ParentMessage,
    animatedToMessage: (message: Ui.Popover.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const panelContent = h.div(
        [],
        [
            h.p(
                [h.Class("text-sm font-semibold text-foreground mb-2")],
                ["Analytics"]
            ),
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    "Get a better understanding of where your traffic is coming from.",
                ]
            ),
        ]
    )

    const popoverViewConfig = (panelClassNameValue: string) => ({
        anchor: POPOVER_ANCHOR,
        toView: (render: Ui.Popover.RenderInfo) =>
            h.div(
                [h.Class(wrapperClassName)],
                [
                    h.button(
                        [...render.button, h.Class(triggerClassName)],
                        ["Solutions"]
                    ),
                    ...(render.isVisible
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
                                      h.Class(panelClassNameValue),
                                  ],
                                  [panelContent]
                              ),
                          ]
                        : []),
                ]
            ),
    })

    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Popover"]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Basic"]
            ),
            h.div(
                [h.Class("relative")],
                [
                    h.submodel({
                        slotId: popoverBasic.id,
                        model: popoverBasic,
                        view: Ui.Popover.view,
                        viewInputs: popoverViewConfig(basicPanelClassName),
                        toParentMessage: basicToMessage,
                    }),
                ]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Animated"]
            ),
            h.div(
                [h.Class("relative")],
                [
                    h.submodel({
                        slotId: popoverAnimated.id,
                        model: popoverAnimated,
                        view: Ui.Popover.view,
                        viewInputs: popoverViewConfig(animatedPanelClassName),
                        toParentMessage: animatedToMessage,
                    }),
                ]
            ),
        ]
    )
}
