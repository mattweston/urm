import { library_view } from "./library.view.ts"
import { File } from "foldkit"
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import {
    ClickedUploadCsv,
    ConfirmedDeleteUpload,
    GotDeleteConfirmationDialogMessage,
    GotUploadDropMessage,
    RemovedSelectedUploadFile,
    type Message,
} from "./app.message.ts"
import type { Model } from "./app.model.ts"

const panelClassName =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
const dropZoneClassName =
    "flex flex-col items-center gap-2 cursor-pointer rounded-[var(--radius-surface)] border-2 border-dashed border-border bg-muted px-6 py-10 text-center hover:border-primary select-none data-[drag-over]:border-primary data-[drag-over]:bg-accent"

const formatFileSize = (bytes: number): string =>
    bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`

const deleteConfirmationView = (
    model: Model,
    h: HtmlBuilder<Message>
): Html => {
    const toDialogMessage = (message: Ui.Dialog.Message) =>
        GotDeleteConfirmationDialogMessage({ message })

    return h.submodel({
        slotId: model.deleteConfirmationDialog.id,
        model: model.deleteConfirmationDialog,
        view: Ui.Dialog.view,
        viewInputs: {
            toView: (render) =>
                h.dialog(
                    [
                        ...render.dialog,
                        h.Class(
                            "backdrop:bg-black/50 bg-transparent p-0 open:flex items-center justify-center"
                        ),
                    ],
                    render.isVisible
                        ? [
                              h.div(
                                  [
                                      ...render.backdrop,
                                      h.Class("fixed inset-0 bg-black/50"),
                                  ],
                                  []
                              ),
                              h.div(
                                  [
                                      ...render.panel,
                                      h.Class(
                                          "w-full max-w-md rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-overlay)]"
                                      ),
                                  ],
                                  [
                                      h.h2(
                                          [
                                              h.Id(
                                                  Ui.Dialog.titleId(
                                                      model.deleteConfirmationDialog
                                                  )
                                              ),
                                              h.Class("text-xl font-semibold"),
                                          ],
                                          ["Delete CSV upload"]
                                      ),
                                      h.p(
                                          [
                                              h.Class(
                                                  "mt-2 text-sm text-muted-foreground"
                                              ),
                                          ],
                                          [
                                              "Delete this CSV upload and all of its rows? This cannot be undone.",
                                          ]
                                      ),
                                      h.div(
                                          [
                                              h.Class(
                                                  "mt-6 flex justify-end gap-2"
                                              ),
                                          ],
                                          [
                                              h.button(
                                                  [
                                                      ...render.closeButton,
                                                      h.Class(
                                                          "inline-flex h-10 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                                      ),
                                                  ],
                                                  ["Cancel"]
                                              ),
                                              h.button(
                                                  [
                                                      h.Type("button"),
                                                      h.OnClick(
                                                          ConfirmedDeleteUpload()
                                                      ),
                                                      h.Class(
                                                          "inline-flex h-10 items-center rounded-[var(--radius-control)] bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                                                      ),
                                                  ],
                                                  ["Delete"]
                                              ),
                                          ]
                                      ),
                                  ]
                              ),
                          ]
                        : []
                ),
        },
        toParentMessage: toDialogMessage,
    })
}

const fileDropView = (model: Model, h: HtmlBuilder<Message>): Html => {
    return h.submodel({
        slotId: model.uploadDrop.id,
        model: model.uploadDrop,
        view: Ui.FileDrop.view,
        viewInputs: {
            multiple: false,
            accept: ["text/csv", ".csv"],
            toView: (attributes) =>
                h.label(
                    [...attributes.root, h.Class(dropZoneClassName)],
                    [
                        h.p(
                            [h.Class("text-base font-medium text-foreground")],
                            ["Drop a CSV file or browse"]
                        ),
                        h.p(
                            [h.Class("text-sm text-muted-foreground")],
                            ["CSV only, parsed into upload rows"]
                        ),
                        h.input(attributes.input),
                    ]
                ),
        },
        toParentMessage: (message) => GotUploadDropMessage({ message }),
    })
}

const selectedFilesView = (model: Model, h: HtmlBuilder<Message>): Html => {
    return h.div(
        [h.Class("space-y-2")],
        model.selectedUploadFiles.length === 0
            ? [
                  h.p(
                      [h.Class("text-sm text-muted-foreground")],
                      ["No file selected yet."]
                  ),
              ]
            : model.selectedUploadFiles.map((file, fileIndex) =>
                  h.div(
                      [
                          h.Class(
                              "flex items-center justify-between gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2"
                          ),
                      ],
                      [
                          h.div(
                              [h.Class("min-w-0")],
                              [
                                  h.p(
                                      [
                                          h.Class(
                                              "truncate text-sm font-medium text-foreground"
                                          ),
                                      ],
                                      [File.name(file)]
                                  ),
                                  h.p(
                                      [
                                          h.Class(
                                              "text-xs text-muted-foreground"
                                          ),
                                      ],
                                      [formatFileSize(File.size(file))]
                                  ),
                              ]
                          ),
                          h.button(
                              [
                                  h.Type("button"),
                                  h.OnClick(
                                      RemovedSelectedUploadFile({ fileIndex })
                                  ),
                                  h.Class(
                                      "text-sm text-muted-foreground hover:text-destructive"
                                  ),
                              ],
                              ["Remove"]
                          ),
                      ]
                  )
              )
    )
}

const uploadCard = (model: Model, h: HtmlBuilder<Message>): Html => {
    return h.section(
        [h.Class(panelClassName)],
        [
            h.div(
                [h.Class("mb-4 flex items-start justify-between gap-3")],
                [
                    h.div(
                        [],
                        [
                            h.h2(
                                [
                                    h.Class(
                                        "text-lg font-semibold text-foreground"
                                    ),
                                ],
                                ["Upload CSV"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                ["Import a CSV into the shared upload store."]
                            ),
                        ]
                    ),
                ]
            ),
            fileDropView(model, h),
            h.div([h.Class("mt-4")], [selectedFilesView(model, h)]),
            h.div(
                [h.Class("mt-4 flex items-center justify-end")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.Disabled(
                                model.uploadBusy ||
                                    model.selectedUploadFiles.length === 0
                            ),
                            h.OnClick(ClickedUploadCsv()),
                            h.Class(
                                "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-secondary-foreground disabled:hover:bg-secondary border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)] disabled:[box-shadow:var(--shadow-control)]"
                            ),
                        ],
                        [model.uploadBusy ? "Uploading..." : "Upload CSV"]
                    ),
                ]
            ),
        ]
    )
}

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
    return h.div(
        [h.Class("min-h-screen bg-background text-foreground")],
        [
            h.main(
                [h.Class("mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-8")],
                [
                    h.div(
                        [h.Class("flex items-end justify-between gap-3")],
                        [
                            h.div(
                                [],
                                [
                                    h.h1(
                                        [
                                            h.Class(
                                                "text-3xl font-bold tracking-tight"
                                            ),
                                        ],
                                        ["CSV uploads"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Upload, preview, and import CSV data into your tables or contacts.",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    ...(model.error === null
                        ? []
                        : [
                              h.div(
                                  [
                                      h.Class(
                                          "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                                      ),
                                  ],
                                  [model.error]
                              ),
                          ]),
                    ...(model.can_write && model.preview_id === ""
                        ? [uploadCard(model, h)]
                        : []),
                    library_view(model, h),
                    deleteConfirmationView(model, h),
                ]
            ),
        ]
    )
}
