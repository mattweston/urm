import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const SucceededMountMap = taggedStruct("SucceededMountMap", {
    hostId: S.String,
})
export const FailedMountMap = taggedStruct("FailedMountMap", {
    reason: S.String,
})
export const SucceededObserveChapter = taggedStruct("SucceededObserveChapter")
export const FailedObserveChapter = taggedStruct("FailedObserveChapter", {
    reason: S.String,
})

export const EnteredChapter = taggedStruct("EnteredChapter", {
    chapterId: S.String,
})
export const ClickedChapter = taggedStruct("ClickedChapter", {
    chapterId: S.String,
})
export const CompletedMoveCamera = taggedStruct("CompletedMoveCamera")

export const Message = S.Union([
    SucceededMountMap,
    FailedMountMap,
    SucceededObserveChapter,
    FailedObserveChapter,
    EnteredChapter,
    ClickedChapter,
    CompletedMoveCamera,
])

export type Message = typeof Message.Type
