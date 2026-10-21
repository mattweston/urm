import { Array, Match as M, Number, Option, pipe } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"
import type { UploadsDemoMessage as Message } from "./message.ts"
import type { Model } from "./model.ts"
import {
    CancelUploadDemoFile,
    fakeFileForUpload,
    setUploadStatusForId,
    Upload,
    UploadDemoFile,
} from "./upload.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [{ nextId: 0, uploads: [] }, []]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ClickedStartUploadDemo: () => {
                const fakeFile = fakeFileForUpload(model.nextId)
                const upload = Upload.make({
                    id: model.nextId,
                    fileName: fakeFile.name,
                    sizeMegabytes: fakeFile.sizeMegabytes,
                    status: "Uploading",
                })
                return [
                    evo(model, {
                        nextId: Number.increment,
                        uploads: Array.append(upload),
                    }),
                    [
                        UploadDemoFile({
                            uploadId: upload.id,
                            sizeMegabytes: upload.sizeMegabytes,
                        }),
                    ],
                ]
            },
            ClickedCancelUploadDemo: ({ uploadId }) => [
                model,
                [CancelUploadDemoFile({ uploadId })],
            ],
            ClickedCancelAllUploadsDemo: () => [
                model,
                pipe(
                    model.uploads,
                    Array.filter(({ status }) => status === "Uploading"),
                    Array.map(({ id }) =>
                        CancelUploadDemoFile({ uploadId: id })
                    )
                ),
            ],
            ClickedRestartUploadDemo: ({ uploadId }) =>
                pipe(
                    model.uploads,
                    Array.findFirst(
                        (upload) =>
                            upload.id === uploadId &&
                            upload.status === "Cancelled"
                    ),
                    Option.match({
                        onNone: (): UpdateReturn => [model, []],
                        onSome: (upload): UpdateReturn => [
                            evo(model, {
                                uploads: setUploadStatusForId(
                                    uploadId,
                                    "Uploading"
                                ),
                            }),
                            [
                                UploadDemoFile({
                                    uploadId,
                                    sizeMegabytes: upload.sizeMegabytes,
                                }),
                            ],
                        ],
                    })
                ),
            SucceededUploadDemoFile: ({ uploadId }) => [
                evo(model, {
                    uploads: setUploadStatusForId(uploadId, "Done"),
                }),
                [],
            ],
            CompletedCancelUploadDemoFile: ({ uploadId, outcome }) =>
                M.value(outcome).pipe(
                    M.withReturnType<UpdateReturn>(),
                    M.tagsExhaustive({
                        Interrupted: () => [
                            evo(model, {
                                uploads: setUploadStatusForId(
                                    uploadId,
                                    "Cancelled"
                                ),
                            }),
                            [],
                        ],
                        NotFound: () => [model, []],
                    })
                ),
        })
    )
