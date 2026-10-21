import { Schema as S } from "effect"
import { Command } from "foldkit"
import { taggedStruct } from "foldkit/schema"

export const ClickedStartUploadDemo = taggedStruct("ClickedStartUploadDemo")
export const ClickedCancelUploadDemo = taggedStruct("ClickedCancelUploadDemo", {
    uploadId: S.Number,
})
export const ClickedCancelAllUploadsDemo = taggedStruct(
    "ClickedCancelAllUploadsDemo"
)
export const ClickedRestartUploadDemo = taggedStruct(
    "ClickedRestartUploadDemo",
    {
        uploadId: S.Number,
    }
)
export const SucceededUploadDemoFile = taggedStruct("SucceededUploadDemoFile", {
    uploadId: S.Number,
})
export const CompletedCancelUploadDemoFile = taggedStruct(
    "CompletedCancelUploadDemoFile",
    {
        uploadId: S.Number,
        outcome: Command.Interruptible.Outcome,
    }
)

export const UploadsDemoMessage = S.Union([
    ClickedStartUploadDemo,
    ClickedCancelUploadDemo,
    ClickedCancelAllUploadsDemo,
    ClickedRestartUploadDemo,
    SucceededUploadDemoFile,
    CompletedCancelUploadDemoFile,
])
export type UploadsDemoMessage = typeof UploadsDemoMessage.Type
