import { Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import { Button, Dialog } from "@foldkit/ui"

import {
    ConfirmedGridSizeChange,
    GotErrorDialogMessage,
    GotGridSizeConfirmDialogMessage,
    type PixelArtMessage,
} from "./message.ts"

const DIALOG_CLASS = "bg-transparent p-0 open:flex items-center justify-center"

const BACKDROP_CLASS = "fixed inset-0 bg-black/60"

const PANEL_CLASS =
    "bg-card text-card-foreground border-(length:--surface-border-width) border-border rounded-[var(--radius-surface)] p-6 max-w-sm relative [box-shadow:var(--shadow-overlay)]"

const NEUTRAL_BUTTON_CLASS =
    "px-4 py-2 bg-muted text-foreground rounded hover:bg-accent hover:text-accent-foreground transition motion-reduce:transition-none cursor-pointer border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"

export const errorDialogView = <ParentMessage>(
    errorDialog: Dialog.Model,
    maybeExportError: Option.Option<string>,
    toParentMessage: (message: PixelArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.submodel({
        slotId: errorDialog.id,
        model: errorDialog,
        view: Dialog.view,
        viewInputs: {
            toView: ({
                dialog,
                backdrop,
                panel,
                closeButton,
                title,
                description,
                isVisible,
            }) =>
                h.dialog(
                    [...dialog, h.Class(DIALOG_CLASS)],
                    isVisible
                        ? [
                              h.div([...backdrop, h.Class(BACKDROP_CLASS)]),
                              h.div(
                                  [...panel, h.Class(PANEL_CLASS)],
                                  Option.match(maybeExportError, {
                                      onNone: () => [],
                                      onSome: (error) => [
                                          h.h2(
                                              [
                                                  ...title,
                                                  h.Class(
                                                      "text-lg font-semibold text-destructive mb-2"
                                                  ),
                                              ],
                                              ["Export failed"]
                                          ),
                                          h.p(
                                              [
                                                  ...description,
                                                  h.Class(
                                                      "text-sm text-muted-foreground mb-4"
                                                  ),
                                              ],
                                              [error]
                                          ),
                                          h.button(
                                              [
                                                  ...closeButton,
                                                  h.Class(
                                                      `w-full ${NEUTRAL_BUTTON_CLASS}`
                                                  ),
                                              ],
                                              ["Dismiss"]
                                          ),
                                      ],
                                  })
                              ),
                          ]
                        : []
                ),
        },
        toParentMessage: (message) =>
            toParentMessage(GotErrorDialogMessage({ message })),
    })

export const gridSizeConfirmDialogView = <ParentMessage>(
    gridSizeConfirmDialog: Dialog.Model,
    maybePendingGridSize: Option.Option<number>,
    toParentMessage: (message: PixelArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.submodel({
        slotId: gridSizeConfirmDialog.id,
        model: gridSizeConfirmDialog,
        view: Dialog.view,
        viewInputs: {
            toView: ({
                dialog,
                backdrop,
                panel,
                closeButton,
                title,
                description,
                isVisible,
            }) =>
                h.dialog(
                    [...dialog, h.Class(DIALOG_CLASS)],
                    isVisible
                        ? [
                              h.div([...backdrop, h.Class(BACKDROP_CLASS)]),
                              h.div(
                                  [...panel, h.Class(PANEL_CLASS)],
                                  Option.match(maybePendingGridSize, {
                                      onNone: () => [],
                                      onSome: (pendingSize) => [
                                          h.h2(
                                              [
                                                  ...title,
                                                  h.Class(
                                                      "text-lg font-semibold text-foreground mb-2"
                                                  ),
                                              ],
                                              [
                                                  `Change to ${pendingSize}×${pendingSize}?`,
                                              ]
                                          ),
                                          h.p(
                                              [
                                                  ...description,
                                                  h.Class(
                                                      "text-sm text-muted-foreground mb-5"
                                                  ),
                                              ],
                                              [
                                                  "This will clear your canvas and reset undo history.",
                                              ]
                                          ),
                                          h.div(
                                              [h.Class("flex gap-3")],
                                              [
                                                  h.button(
                                                      [
                                                          ...closeButton,
                                                          h.Class(
                                                              `flex-1 ${NEUTRAL_BUTTON_CLASS}`
                                                          ),
                                                      ],
                                                      ["Cancel"]
                                                  ),
                                                  Button.view(
                                                      {
                                                          onClick:
                                                              toParentMessage(
                                                                  ConfirmedGridSizeChange()
                                                              ),
                                                          toView: (
                                                              attributes
                                                          ) =>
                                                              h.button(
                                                                  [
                                                                      ...attributes.button,
                                                                      h.Class(
                                                                          "flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded hover:opacity-90 transition motion-reduce:transition-none cursor-pointer border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                                                                      ),
                                                                  ],
                                                                  [
                                                                      "Clear and resize",
                                                                  ]
                                                              ),
                                                      },
                                                      h
                                                  ),
                                              ]
                                          ),
                                      ],
                                  })
                              ),
                          ]
                        : []
                ),
        },
        toParentMessage: (message) =>
            toParentMessage(GotGridSizeConfirmDialogMessage({ message })),
    })
