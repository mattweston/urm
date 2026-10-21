import { Array, Match as M } from "effect"
import clsx from "clsx"
import type { Html, HtmlBuilder } from "foldkit/html"

import {
    ClickedCancelAllUploadsDemo,
    ClickedCancelUploadDemo,
    ClickedRestartUploadDemo,
    ClickedStartUploadDemo,
    type UploadsDemoMessage,
} from "./message.ts"
import type { Upload, UploadStatus } from "./upload.ts"
import type { Model } from "./model.ts"

const badgeClass = (status: UploadStatus): string =>
    M.value(status).pipe(
        M.when("Uploading", () => "bg-primary/15 text-primary"),
        M.when("Done", () => "bg-accent text-accent-foreground"),
        M.when("Cancelled", () => "bg-muted text-muted-foreground"),
        M.exhaustive
    )

const ACTION_BUTTON_CLASS =
    "px-3 py-1 text-sm font-medium rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border transition [box-shadow:var(--shadow-control)]"

const uploadActionView = <ParentMessage>(
    upload: Upload,
    toUploadsDemoMessage: (message: UploadsDemoMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    M.value(upload.status).pipe(
        M.when("Uploading", () =>
            h.keyed("button")(
                "Uploading",
                [
                    h.OnClick(
                        toUploadsDemoMessage(
                            ClickedCancelUploadDemo({ uploadId: upload.id })
                        )
                    ),
                    h.AriaLabel(`Cancel upload ${upload.id}`),
                    h.Class(
                        clsx(
                            ACTION_BUTTON_CLASS,
                            "border-destructive text-destructive hover:bg-destructive/10"
                        )
                    ),
                ],
                ["Cancel"]
            )
        ),
        M.when("Cancelled", () =>
            h.keyed("button")(
                "Cancelled",
                [
                    h.OnClick(
                        toUploadsDemoMessage(
                            ClickedRestartUploadDemo({ uploadId: upload.id })
                        )
                    ),
                    h.AriaLabel(`Restart upload ${upload.id}`),
                    h.Class(
                        clsx(
                            ACTION_BUTTON_CLASS,
                            "border-primary text-primary hover:bg-primary/10"
                        )
                    ),
                ],
                ["Restart"]
            )
        ),
        M.when("Done", () => h.empty),
        M.exhaustive
    )

const uploadView = <ParentMessage>(
    upload: Upload,
    toUploadsDemoMessage: (message: UploadsDemoMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.keyed("li")(
        String(upload.id),
        [
            h.Class(
                "p-4 bg-card text-card-foreground rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border flex flex-col gap-2"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-center justify-between gap-3")],
                [
                    h.div(
                        [h.Class("flex items-baseline gap-2 min-w-0")],
                        [
                            h.span(
                                [h.Class("font-medium truncate")],
                                [upload.fileName]
                            ),
                            h.span(
                                [
                                    h.Class(
                                        "text-sm text-muted-foreground shrink-0"
                                    ),
                                ],
                                [`${upload.sizeMegabytes} MB`]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("flex items-center gap-3 shrink-0")],
                        [
                            h.span(
                                [
                                    h.Class(
                                        clsx(
                                            "px-2 py-0.5 text-xs font-semibold rounded-full",
                                            badgeClass(upload.status)
                                        )
                                    ),
                                ],
                                [upload.status]
                            ),
                            uploadActionView(upload, toUploadsDemoMessage, h),
                        ]
                    ),
                ]
            ),
            upload.status === "Uploading"
                ? h.div([
                      h.Class("h-1.5 rounded-full bg-primary animate-pulse"),
                  ])
                : h.empty,
        ]
    )

export const view = <ParentMessage>(
    model: Model,
    toUploadsDemoMessage: (message: UploadsDemoMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const { uploads } = model
    const isAnyUploadRunning = Array.some(
        uploads,
        (upload) => upload.status === "Uploading"
    )

    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Interrupting commands"]
            ),
            h.div(
                [h.Class("flex flex-wrap gap-3 mb-6")],
                [
                    h.button(
                        [
                            h.OnClick(
                                toUploadsDemoMessage(ClickedStartUploadDemo())
                            ),
                            h.Class(
                                "px-4 py-2 rounded-[var(--radius-control)] bg-primary text-primary-foreground font-medium transition hover:opacity-90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            ),
                        ],
                        ["Upload a file"]
                    ),
                    isAnyUploadRunning
                        ? h.keyed("button")(
                              "CancelAll",
                              [
                                  h.OnClick(
                                      toUploadsDemoMessage(
                                          ClickedCancelAllUploadsDemo()
                                      )
                                  ),
                                  h.Class(
                                      "px-4 py-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive text-destructive font-medium transition hover:bg-destructive/10"
                                  ),
                              ],
                              ["Cancel all"]
                          )
                        : h.empty,
                ]
            ),
            Array.match(uploads, {
                onEmpty: () =>
                    h.keyed("p")(
                        "NoUploads",
                        [h.Class("text-muted-foreground")],
                        ["Nothing here yet. Start an upload."]
                    ),
                onNonEmpty: (uploads) =>
                    h.keyed("ul")(
                        "UploadList",
                        [h.Class("flex flex-col gap-3 max-w-2xl")],
                        Array.map(uploads, (upload) =>
                            uploadView(upload, toUploadsDemoMessage, h)
                        )
                    ),
            }),
        ]
    )
}
