import clsx from "clsx"
import { Array, Match as M, Number, Option } from "effect"
import { File } from "foldkit"
import * as Ui from "@foldkit/ui"
import { type Html, type HtmlBuilder } from "foldkit/html"

import * as Attachments from "../step/attachments.ts"

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

const dropZoneClassName =
    "block cursor-pointer rounded-[var(--radius-control)] border-2 border-dashed px-4 py-6 text-center transition border-border hover:border-primary hover:bg-accent/50 data-[drag-over]:border-primary data-[drag-over]:bg-accent/70"

const fileKey = (file: File.File): string =>
    `${File.name(file)}:${File.size(file)}:${file.lastModified}`

const resumeView = <ParentMessage>(
    resume: File.File,
    toParentMessage: (message: Attachments.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("div")(
        "resume-filled",
        [
            h.Class(
                "flex items-center justify-between rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card px-4 py-3 text-card-foreground"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-center gap-3")],
                [
                    h.span([h.Class("text-lg")], ["📄"]),
                    h.div(
                        [],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "text-sm font-medium text-foreground"
                                    ),
                                ],
                                [File.name(resume)]
                            ),
                            h.p(
                                [h.Class("text-xs text-muted-foreground")],
                                [formatFileSize(File.size(resume))]
                            ),
                        ]
                    ),
                ]
            ),
            h.button(
                [
                    h.Type("button"),
                    h.OnClick(toParentMessage(Attachments.RemovedResume())),
                    h.Class(
                        "text-sm text-muted-foreground hover:text-destructive transition cursor-pointer"
                    ),
                ],
                ["Remove"]
            ),
        ]
    )
}

const additionalFileView = <ParentMessage>(
    file: File.File,
    fileIndex: number,
    toParentMessage: (message: Attachments.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("div")(
        fileKey(file),
        [
            h.Class(
                "flex items-center justify-between rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card px-3 py-2 text-card-foreground"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-center gap-2")],
                [
                    h.span([h.Class("text-sm")], ["📎"]),
                    h.span(
                        [h.Class("text-sm text-foreground")],
                        [File.name(file)]
                    ),
                    h.span(
                        [h.Class("text-xs text-muted-foreground")],
                        [formatFileSize(File.size(file))]
                    ),
                ]
            ),
            h.button(
                [
                    h.Type("button"),
                    h.OnClick(
                        toParentMessage(
                            Attachments.RemovedAdditionalFile({ fileIndex })
                        )
                    ),
                    h.Class(
                        "text-xs text-muted-foreground hover:text-destructive transition cursor-pointer"
                    ),
                ],
                ["Remove"]
            ),
        ]
    )
}

export const attachmentsView = <ParentMessage>(
    {
        resumeDrop,
        maybeResume,
        additionalFilesDrop,
        additionalFiles,
    }: Attachments.Model,
    toParentMessage: (message: Attachments.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const resumeSection = h.div(
        [h.Class("space-y-2")],
        [
            h.h3(
                [h.Class("text-sm font-medium text-foreground")],
                ["Resume (PDF)"]
            ),
            Option.match(maybeResume, {
                onNone: () =>
                    h.submodel({
                        slotId: resumeDrop.id,
                        model: resumeDrop,
                        view: Ui.FileDrop.view,
                        viewInputs: {
                            accept: ["application/pdf", ".doc", ".docx"],
                            toView: (attributes) =>
                                h.keyed("label")(
                                    "resume-empty",
                                    [
                                        ...attributes.root,
                                        h.Class(
                                            clsx(dropZoneClassName, "py-6")
                                        ),
                                    ],
                                    [
                                        h.p(
                                            [
                                                h.Class(
                                                    "text-sm text-muted-foreground"
                                                ),
                                            ],
                                            [
                                                "Drop your resume or click to upload",
                                            ]
                                        ),
                                        h.p(
                                            [
                                                h.Class(
                                                    "text-xs text-muted-foreground mt-1"
                                                ),
                                            ],
                                            ["PDF, DOC, or DOCX up to 10MB"]
                                        ),
                                        h.input(attributes.input),
                                    ]
                                ),
                        },
                        toParentMessage: (message) =>
                            toParentMessage(
                                Attachments.GotResumeDropMessage({ message })
                            ),
                    }),
                onSome: (resume) =>
                    resumeView<ParentMessage>(resume, toParentMessage, h),
            }),
        ]
    )

    const additionalSection = h.div(
        [h.Class("space-y-2")],
        [
            h.h3(
                [h.Class("text-sm font-medium text-foreground")],
                ["Additional Files (optional)"]
            ),
            h.submodel({
                slotId: additionalFilesDrop.id,
                model: additionalFilesDrop,
                view: Ui.FileDrop.view,
                viewInputs: {
                    multiple: true,
                    toView: (attributes) =>
                        h.label(
                            [
                                ...attributes.root,
                                h.Class(clsx(dropZoneClassName, "py-8")),
                            ],
                            [
                                h.p(
                                    [h.Class("text-sm text-muted-foreground")],
                                    [
                                        "Drag and drop files here, or click to browse",
                                    ]
                                ),
                                h.p(
                                    [
                                        h.Class(
                                            "text-xs text-muted-foreground mt-1"
                                        ),
                                    ],
                                    [
                                        "Cover letters, certifications, portfolios, etc.",
                                    ]
                                ),
                                h.input(attributes.input),
                            ]
                        ),
                },
                toParentMessage: (message) =>
                    toParentMessage(
                        Attachments.GotAdditionalFilesDropMessage({ message })
                    ),
            }),
            ...Array.match(additionalFiles, {
                onEmpty: () => [],
                onNonEmpty: (files) => [
                    h.div(
                        [h.Class("space-y-2")],
                        files.map((file, fileIndex) =>
                            additionalFileView<ParentMessage>(
                                file,
                                fileIndex,
                                toParentMessage,
                                h
                            )
                        )
                    ),
                ],
            }),
        ]
    )

    return h.div([h.Class("space-y-6")], [resumeSection, additionalSection])
}
