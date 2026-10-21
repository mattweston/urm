import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ClickedStartComputeEngine = taggedStruct(
    "ClickedStartComputeEngine"
)
export const ClickedStopComputeEngine = taggedStruct("ClickedStopComputeEngine")
export const StartedComputeEngine = taggedStruct("StartedComputeEngine", {
    engineId: S.String,
})
export const StoppedComputeEngine = taggedStruct("StoppedComputeEngine")
export const FailedStartComputeEngine = taggedStruct(
    "FailedStartComputeEngine",
    {
        reason: S.String,
    }
)
export const ClickedComputeSquare = taggedStruct("ClickedComputeSquare")
export const CompletedComputeSquare = taggedStruct("CompletedComputeSquare", {
    result: S.Number,
})
export const SkippedComputeSquare = taggedStruct("SkippedComputeSquare")

export const ManagedResourceLayerMessage = S.Union([
    ClickedStartComputeEngine,
    ClickedStopComputeEngine,
    StartedComputeEngine,
    StoppedComputeEngine,
    FailedStartComputeEngine,
    ClickedComputeSquare,
    CompletedComputeSquare,
    SkippedComputeSquare,
])
export type ManagedResourceLayerMessage =
    typeof ManagedResourceLayerMessage.Type
