import { Array, Match as M, Number } from "effect"
import { File } from "foldkit"
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    ClickedRemoveFile,
    GotFileDropMessage,
    type Message,
} from "./message.ts"
import type { Model } from "./model.ts"

const dropZoneClassName =
    "flex flex-col items-center gap-2 cursor-pointer rounded-[var(--radius-surface)] border-2 border-dashed border-border bg-muted px-6 py-10 text-center hover:border-primary select-none data-[drag-over]:border-primary data-[drag-over]:bg-accent"

const primaryTextClassName = "text-base font-medium text-foreground"

const secondaryTextClassName = "text-sm text-muted-foreground"

const fileRowClassName =
    "flex items-center justify-between gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 bg-card text-card-foreground"

const fileNameClassName = "text-sm font-medium text-foreground truncate"

const fileSizeClassName = "text-xs text-muted-foreground"

const removeButtonClassName =
    "text-sm text-muted-foreground hover:text-destructive cursor-pointer"

const BYTES_PER_KB = 1024
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB

const formatFileSize = (bytes: number): string =>
    M.value(bytes).pipe(
        M.when(Number.isLessThan(BYTES_PER_KB), () => `${bytes} B`),
        M.when(
            Number.isLessThan(BYTES_PER_MB),
            () => `${(bytes / BYTES_PER_KB).toFixed(1)} KB`
        ),
        M.orElse(() => `${(bytes / BYTES_PER_MB).toFixed(1)} MB`)
    )

const fileKey = (file: File.File): string =>
    `${File.name(file)}:${File.size(file)}:${file.lastModified}`

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const { fileDrop, files } = model
    const fileDropToMessage = (message: Ui.FileDrop.Message): ParentMessage =>
        toParentMessage(GotFileDropMessage({ message }))
    const removeFileToMessage = (fileIndex: number): ParentMessage =>
        toParentMessage(ClickedRemoveFile({ fileIndex }))

    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["File Drop"]
            ),
            h.div(
                [h.Class("flex flex-col gap-3 w-full max-w-md")],
                [
                    h.submodel({
                        slotId: fileDrop.id,
                        model: fileDrop,
                        view: Ui.FileDrop.view,
                        viewInputs: {
                            multiple: true,
                            toView: (attributes) =>
                                h.label(
                                    [
                                        ...attributes.root,
                                        h.Class(dropZoneClassName),
                                    ],
                                    [
                                        h.p(
                                            [h.Class(primaryTextClassName)],
                                            ["Drop files or click to browse"]
                                        ),
                                        h.p(
                                            [h.Class(secondaryTextClassName)],
                                            [
                                                "Any file type. This demo just lists them.",
                                            ]
                                        ),
                                        h.input(attributes.input),
                                    ]
                                ),
                        },
                        toParentMessage: fileDropToMessage,
                    }),
                    ...Array.match(files, {
                        onEmpty: () => [],
                        onNonEmpty: (files) =>
                            files.map((file, fileIndex) =>
                                h.keyed("div")(
                                    fileKey(file),
                                    [h.Class(fileRowClassName)],
                                    [
                                        h.div(
                                            [h.Class("flex flex-col min-w-0")],
                                            [
                                                h.span(
                                                    [
                                                        h.Class(
                                                            fileNameClassName
                                                        ),
                                                    ],
                                                    [File.name(file)]
                                                ),
                                                h.span(
                                                    [
                                                        h.Class(
                                                            fileSizeClassName
                                                        ),
                                                    ],
                                                    [
                                                        formatFileSize(
                                                            File.size(file)
                                                        ),
                                                    ]
                                                ),
                                            ]
                                        ),
                                        h.button(
                                            [
                                                h.Type("button"),
                                                h.OnClick(
                                                    removeFileToMessage(
                                                        fileIndex
                                                    )
                                                ),
                                                h.Class(removeButtonClassName),
                                            ],
                                            ["Remove"]
                                        ),
                                    ]
                                )
                            ),
                    }),
                ]
            ),
        ]
    )
}
