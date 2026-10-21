import { focus } from "foldkit/dom"
import { Array, Effect, Match as M, Option, Schema as S } from "effect"
import { Command } from "foldkit"
import * as Ui from "@foldkit/ui"
import { evo } from "foldkit/struct"

import type { Message } from "./app.message.ts"
import {
    LoadedUploadPreview,
    FailedUploadPreview,
    CompletedPreviewFocus,
    DeleteUploadFailed,
    DeletedUpload,
    GotDeleteConfirmationDialogMessage,
    ImportUploadFailed,
    ImportedUpload,
    FailedLoadingUploads,
    GotUploadDropMessage,
    LoadedUploads,
    UploadCsvFailed,
    UploadedCsv,
} from "./app.message.ts"
import type { Model } from "./app.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const FocusCsvPreview = Command.define("FocusCsvPreview", {
    args: { selector: S.String },
    messages: [CompletedPreviewFocus],
    execute: ({ selector }) =>
        focus(selector).pipe(Effect.ignore, Effect.as(CompletedPreviewFocus())),
})

export const LoadCsvPreview = Command.define("LoadCsvPreview", {
    args: { domain_id: S.String, upload_id: S.String },
    messages: [LoadedUploadPreview, FailedUploadPreview],
    execute: ({
        domain_id,
        upload_id,
    }): Effect.Effect<
        typeof LoadedUploadPreview.Type | typeof FailedUploadPreview.Type
    > =>
        Effect.succeed(
            FailedUploadPreview({
                domain_id,
                upload_id,
                error: "CSV preview is unavailable in this host",
            })
        ),
})

const ImportUpload = Command.define("ImportUpload", {
    args: { domain_id: S.String, uploadId: S.String },
    messages: [ImportedUpload, ImportUploadFailed],
    execute: () =>
        Effect.succeed(
            ImportUploadFailed({
                error: "No CSV import persistence adapter installed",
            })
        ),
})

export { parse_csv as parseCsv } from "@urm/domain/csv"
const LoadUploads = Command.define("LoadUploads", {
    messages: [LoadedUploads, FailedLoadingUploads],
    execute: Effect.succeed(
        FailedLoadingUploads({
            error: "No CSV uploads persistence adapter installed",
        })
    ),
})

const loadUploads = () => LoadUploads()

export const initDeferred = (domain_id: string): UpdateReturn => [
    {
        domain_id,
        can_write: false,
        search: "",
        status_filter: "all",
        preview_id: "",
        preview_rows: [],
        preview_loading: false,
        preview_error: "",
        preview_page: 0,
        loading: false,
        error: null,
        uploads: [],
        uploadDrop: Ui.FileDrop.init({ id: "csv-upload-drop" }),
        selectedUploadFiles: [],
        uploadBusy: false,
        importedUploadIds: [],
        pendingDeleteUploadId: null,
        deleteConfirmationDialog: Ui.Dialog.init({ id: "delete-csv-upload" }),
    },
    [],
]

export const init = (domain_id: string): UpdateReturn => {
    const [model] = initDeferred(domain_id)

    return [
        {
            ...model,
            loading: true,
        },
        [loadUploads()],
    ]
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            CompletedPreviewFocus: () => [model, []],
            ChangedUploadSearch: ({ value }) => [
                { ...model, search: value },
                [],
            ],
            ChangedUploadStatus: ({ value }) => [
                { ...model, status_filter: value },
                [],
            ],
            ClickedTableImport: () => [model, []],
            ClickedPreviewUpload: ({ upload_id }) => {
                if (
                    !model.uploads.some(
                        (upload) =>
                            upload.id === upload_id &&
                            upload.status === "completed"
                    )
                )
                    return [model, []]
                return [
                    {
                        ...model,
                        preview_id: upload_id,
                        preview_rows: [],
                        preview_page: 0,
                        preview_loading: true,
                        preview_error: "",
                    },
                    [
                        LoadCsvPreview({
                            domain_id: model.domain_id,
                            upload_id,
                        }),
                        FocusCsvPreview({ selector: "#csv-preview-heading" }),
                    ],
                ]
            },
            ClosedUploadPreview: () => [
                {
                    ...model,
                    preview_id: "",
                    preview_rows: [],
                    preview_loading: false,
                    preview_error: "",
                },
                [FocusCsvPreview({ selector: "#csv-upload-search" })],
            ],
            ChangedPreviewPage: ({ page }) => [
                {
                    ...model,
                    preview_page: Math.max(
                        0,
                        Math.min(
                            page,
                            Math.ceil(model.preview_rows.length / 25) - 1
                        )
                    ),
                },
                [],
            ],
            LoadedUploadPreview: ({ domain_id, upload_id, rows }) =>
                domain_id === model.domain_id && upload_id === model.preview_id
                    ? [
                          {
                              ...model,
                              preview_rows: rows,
                              preview_loading: false,
                          },
                          [],
                      ]
                    : [model, []],
            FailedUploadPreview: ({ domain_id, upload_id, error }) =>
                domain_id === model.domain_id && upload_id === model.preview_id
                    ? [
                          {
                              ...model,
                              preview_error: error,
                              preview_loading: false,
                          },
                          [],
                      ]
                    : [model, []],
            LoadedUploads: ({ uploads }) => [
                evo(model, {
                    loading: () => false,
                    error: () => null,
                    uploads: () =>
                        [...uploads].sort(
                            (left, right) => right.updated_at - left.updated_at
                        ),
                }),
                [],
            ],

            FailedLoadingUploads: ({ error }) => [
                evo(model, {
                    loading: () => false,
                    error: () => error,
                    uploadBusy: () => false,
                }),
                [],
            ],

            GotUploadDropMessage: ({ message: dropMessage }) => {
                const {
                    model: nextDrop,
                    commands = [],
                    outMessage: maybeOutMessage_value,
                } = Ui.FileDrop.update(model.uploadDrop, dropMessage)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const nextFiles = Option.match(maybeOutMessage, {
                    onNone: () => model.selectedUploadFiles,
                    onSome: M.type<Ui.FileDrop.OutMessage>().pipe(
                        M.tagsExhaustive({
                            ReceivedFiles: ({ files }) =>
                                Option.match(Array.head(files), {
                                    onNone: () => model.selectedUploadFiles,
                                    onSome: (file) => [file],
                                }),
                            RejectedNonFiles: () => model.selectedUploadFiles,
                        })
                    ),
                })

                return [
                    evo(model, {
                        uploadDrop: () => nextDrop,
                        selectedUploadFiles: () => nextFiles,
                    }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((nextMessage) =>
                                GotUploadDropMessage({ message: nextMessage })
                            )
                        )
                    ),
                ]
            },

            ClickedImportUpload: ({ uploadId }) => {
                if (
                    !model.can_write ||
                    model.uploadBusy ||
                    model.importedUploadIds.includes(uploadId)
                ) {
                    return [model, []]
                }

                return [
                    evo(model, {
                        error: () => null,
                        uploadBusy: () => true,
                    }),
                    [
                        ImportUpload({
                            domain_id: model.domain_id,
                            uploadId,
                        }),
                    ],
                ]
            },

            ImportedUpload: ({ uploadId }) => [
                evo(model, {
                    error: () => null,
                    uploadBusy: () => false,
                    importedUploadIds: () => [
                        ...model.importedUploadIds,
                        uploadId,
                    ],
                }),
                [],
            ],

            ImportUploadFailed: ({ error }) => [
                evo(model, {
                    uploadBusy: () => false,
                    error: () => error,
                }),
                [],
            ],

            RemovedSelectedUploadFile: ({ fileIndex }) => [
                evo(model, {
                    selectedUploadFiles: () =>
                        model.selectedUploadFiles.filter(
                            (_, index) => index !== fileIndex
                        ),
                }),
                [],
            ],

            RetriedUpload: ({ upload_id }) => {
                const upload = model.uploads.find(
                    (upload) => upload.id === upload_id
                )
                if (
                    !model.can_write ||
                    model.uploadBusy ||
                    !upload ||
                    upload.status === "completed"
                )
                    return [model, []]
                if (model.selectedUploadFiles.length !== 1)
                    return [
                        {
                            ...model,
                            error: "Select the original CSV file above, then retry this upload",
                        },
                        [],
                    ]
                const RetryUpload = Command.define("RetryUpload", {
                    args: { upload_id: S.String },
                    messages: [UploadedCsv, UploadCsvFailed],
                    execute: () =>
                        Effect.succeed(
                            UploadCsvFailed({
                                error: "Upload recovery is unavailable in this host",
                            })
                        ),
                })
                return [
                    { ...model, uploadBusy: true, error: null },
                    [RetryUpload({ upload_id })],
                ]
            },
            ClickedUploadCsv: () => {
                if (
                    !model.can_write ||
                    model.uploadBusy ||
                    model.selectedUploadFiles.length === 0
                ) {
                    return [model, []]
                }

                const [file] = model.selectedUploadFiles

                if (file === undefined) {
                    return [model, []]
                }
                const UploadCsv = Command.define("UploadCsv", {
                    messages: [UploadedCsv, UploadCsvFailed],
                    execute: Effect.succeed(
                        UploadCsvFailed({
                            error: "No CSV upload persistence adapter installed",
                        })
                    ),
                })

                return [
                    evo(model, {
                        error: () => null,
                        uploadBusy: () => true,
                    }),
                    [UploadCsv()],
                ]
            },

            UploadedCsv: () => [
                evo(model, {
                    error: () => null,
                    uploadBusy: () => false,
                    selectedUploadFiles: () => [],
                }),
                [loadUploads()],
            ],

            UploadCsvFailed: ({ error }) => [
                evo(model, {
                    uploadBusy: () => false,
                    error: () => error,
                }),
                [],
            ],

            ClickedDeleteUpload: ({ uploadId }) => {
                if (!model.can_write || model.uploadBusy) {
                    return [model, []]
                }

                const { model: deleteConfirmationDialog, commands = [] } =
                    Ui.Dialog.update(
                        model.deleteConfirmationDialog,
                        Ui.Dialog.Message.RequestedOpen()
                    )

                return [
                    evo(model, {
                        pendingDeleteUploadId: () => uploadId,
                        deleteConfirmationDialog: () =>
                            deleteConfirmationDialog,
                    }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotDeleteConfirmationDialogMessage({ message })
                            )
                        )
                    ),
                ]
            },

            GotDeleteConfirmationDialogMessage: ({ message }) => {
                const { model: deleteConfirmationDialog, commands = [] } =
                    Ui.Dialog.update(model.deleteConfirmationDialog, message)

                return [
                    evo(model, {
                        deleteConfirmationDialog: () =>
                            deleteConfirmationDialog,
                    }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((nextMessage) =>
                                GotDeleteConfirmationDialogMessage({
                                    message: nextMessage,
                                })
                            )
                        )
                    ),
                ]
            },

            ConfirmedDeleteUpload: () => {
                if (
                    !model.can_write ||
                    model.uploadBusy ||
                    model.pendingDeleteUploadId === null
                ) {
                    return [model, []]
                }

                const {
                    model: deleteConfirmationDialog,
                    commands: dialogCommands = [],
                } = Ui.Dialog.update(
                    model.deleteConfirmationDialog,
                    Ui.Dialog.Message.RequestedClose()
                )
                const DeleteUpload = Command.define("DeleteUpload", {
                    messages: [DeletedUpload, DeleteUploadFailed],
                    execute: Effect.succeed(
                        DeleteUploadFailed({
                            error: "No CSV uploads persistence adapter installed",
                        })
                    ),
                })

                return [
                    evo(model, {
                        error: () => null,
                        uploadBusy: () => true,
                        pendingDeleteUploadId: () => null,
                        deleteConfirmationDialog: () =>
                            deleteConfirmationDialog,
                    }),
                    [
                        ...dialogCommands.map(
                            Command.mapEffect(
                                Effect.map((message) =>
                                    GotDeleteConfirmationDialogMessage({
                                        message,
                                    })
                                )
                            )
                        ),
                        DeleteUpload(),
                    ],
                ]
            },

            DeletedUpload: ({ uploadId }) => [
                evo(model, {
                    error: () => null,
                    uploadBusy: () => false,
                    importedUploadIds: () =>
                        model.importedUploadIds.filter((id) => id !== uploadId),
                }),
                [loadUploads()],
            ],

            DeleteUploadFailed: ({ error }) => [
                evo(model, {
                    uploadBusy: () => false,
                    error: () => error,
                }),
                [],
            ],
        })
    )
