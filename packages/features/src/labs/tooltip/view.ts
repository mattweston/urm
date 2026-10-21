/** # Tooltip view */
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { AnchorConfig } from "@foldkit/ui/tooltip"

const triggerClassName =
    "inline-flex items-center gap-1.5 px-4 py-2 text-base font-normal cursor-pointer transition rounded-[var(--radius-control)] border-(length:--field-border-width) border-input bg-background text-foreground hover:bg-accent select-none [box-shadow:var(--shadow-control)]"

const panelClassName =
    "z-50 rounded-md bg-foreground px-3 py-1.5 text-sm text-background [box-shadow:var(--shadow-overlay)]"

const wrapperClassName = "relative inline-block"

const TOOLTIP_ANCHOR: AnchorConfig = {
    placement: "top",
    gap: 6,
    padding: 8,
}

/**
 * The tooltip submodels manage delayed visibility, focus, hover, and anchored
 * positioning. The first example uses the standard delay, while the second opens
 * immediately.
 */
export const view = <ParentMessage>(
    tooltipBasic: Ui.Tooltip.Model,
    tooltipNoDelay: Ui.Tooltip.Model,
    basicToMessage: (message: Ui.Tooltip.Message) => ParentMessage,
    noDelayToMessage: (message: Ui.Tooltip.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("space-y-6")],
        [
            h.div(
                [h.Class("space-y-2")],
                [
                    h.h2(
                        [h.Class("text-2xl font-bold text-foreground")],
                        ["Tooltip"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "max-w-2xl text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Official Foldkit tooltip integration with a reusable wrapper. Hover or focus the trigger to reveal the label.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap gap-4")],
                [
                    h.div(
                        [h.Class("relative")],
                        [
                            h.submodel({
                                slotId: tooltipBasic.id,
                                model: tooltipBasic,
                                view: Ui.Tooltip.view,
                                viewInputs: {
                                    anchor: TOOLTIP_ANCHOR,
                                    toView: (render) =>
                                        h.div(
                                            [h.Class(wrapperClassName)],
                                            [
                                                h.button(
                                                    [
                                                        ...render.trigger,
                                                        h.Class(
                                                            triggerClassName
                                                        ),
                                                    ],
                                                    ["Hover or focus me"]
                                                ),
                                                render.isVisible
                                                    ? h.div(
                                                          [
                                                              ...render.panel,
                                                              h.Class(
                                                                  panelClassName
                                                              ),
                                                          ],
                                                          ["This is a tooltip"]
                                                      )
                                                    : h.empty,
                                            ]
                                        ),
                                },
                                toParentMessage: basicToMessage,
                            }),
                        ]
                    ),
                    h.div(
                        [h.Class("relative")],
                        [
                            h.submodel({
                                slotId: tooltipNoDelay.id,
                                model: tooltipNoDelay,
                                view: Ui.Tooltip.view,
                                viewInputs: {
                                    anchor: TOOLTIP_ANCHOR,
                                    toView: (render) =>
                                        h.div(
                                            [h.Class(wrapperClassName)],
                                            [
                                                h.button(
                                                    [
                                                        ...render.trigger,
                                                        h.Class(
                                                            triggerClassName
                                                        ),
                                                    ],
                                                    ["No delay"]
                                                ),
                                                render.isVisible
                                                    ? h.div(
                                                          [
                                                              ...render.panel,
                                                              h.Class(
                                                                  panelClassName
                                                              ),
                                                          ],
                                                          ["Shows immediately"]
                                                      )
                                                    : h.empty,
                                            ]
                                        ),
                                },
                                toParentMessage: noDelayToMessage,
                            }),
                        ]
                    ),
                ]
            ),
        ]
    )
}
