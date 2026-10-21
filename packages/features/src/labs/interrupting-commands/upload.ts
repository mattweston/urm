import { Array, Duration, Effect, Option, Schema as S, pipe } from "effect"
import { Command } from "foldkit"

import {
    CompletedCancelUploadDemoFile,
    SucceededUploadDemoFile,
} from "./message.ts"

export const UploadStatus = S.Literals(["Uploading", "Done", "Cancelled"])
export type UploadStatus = typeof UploadStatus.Type

export const Upload = S.Struct({
    id: S.Number,
    fileName: S.String,
    sizeMegabytes: S.Number,
    status: UploadStatus,
})
export type Upload = typeof Upload.Type

export const FakeFile = S.Struct({ name: S.String, sizeMegabytes: S.Number })
export type FakeFile = typeof FakeFile.Type

export const FAKE_FILES: Array.NonEmptyReadonlyArray<FakeFile> = [
    { name: "vacation-photos.zip", sizeMegabytes: 48 },
    { name: "demo-recording.mp4", sizeMegabytes: 87 },
    { name: "quarterly-report.pdf", sizeMegabytes: 12 },
    { name: "design-assets.sketch", sizeMegabytes: 34 },
    { name: "database-backup.sql", sizeMegabytes: 61 },
]

export const fakeFileForUpload = (uploadId: number): FakeFile =>
    pipe(
        FAKE_FILES,
        Array.get(uploadId % Array.length(FAKE_FILES)),
        Option.getOrElse(() => Array.headNonEmpty(FAKE_FILES))
    )

const MILLISECONDS_PER_MEGABYTE = 100

export const UploadKey = S.Struct({ uploadId: S.Number })
export type UploadKey = typeof UploadKey.Type

export const UploadDemoFile = Command.define("UploadDemoFile", {
    args: { ...UploadKey.fields, sizeMegabytes: S.Number },
    messages: [SucceededUploadDemoFile],
    interrupt: {
        keyFields: ["uploadId"],
        toKey: ({ uploadId }) => String(uploadId),
    },
    execute: ({ uploadId, sizeMegabytes }) =>
        Effect.gen(function* () {
            yield* Effect.sleep(
                Duration.millis(sizeMegabytes * MILLISECONDS_PER_MEGABYTE)
            )
            return SucceededUploadDemoFile({ uploadId })
        }),
})

export const CancelUploadDemoFile = ({ uploadId }: UploadKey) =>
    UploadDemoFile.Interrupt({ uploadId }, (outcome) =>
        CompletedCancelUploadDemoFile({ uploadId, outcome })
    )

export const setUploadStatusForId = (uploadId: number, status: UploadStatus) =>
    Array.map((upload: Upload) =>
        upload.id === uploadId ? Upload.make({ ...upload, status }) : upload
    )
