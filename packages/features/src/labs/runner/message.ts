import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import {
    AudioAvailable,
    AudioReleased,
    AudioUnavailable,
    PlayedSound,
} from "./audio.ts"
import {
    Finalizer,
    FinalizerState,
    Notification,
    RunOutcome,
    ScopeState,
    TargetRect,
} from "./model.ts"
import { ResultValue } from "./result.ts"
import { ExampleRoute } from "./route.ts"
import { CodeLine } from "./shiki.ts"
import { ConcurrencyMode, FinalizerOutcome } from "./catalog/options.ts"

export const ChangedExampleRoute = taggedStruct("ChangedExampleRoute", {
    route: ExampleRoute,
})
// One node, one gesture: the original has no Start/Stop/Reset row — tapping the
// node runs it, interrupts it, or resets it depending on where the run is.
export const ClickedNode = taggedStruct("ClickedNode")
export const HighlightedCode = taggedStruct("HighlightedCode", {
    code: S.Array(CodeLine),
})
export const MeasuredHighlights = taggedStruct("MeasuredHighlights", {
    rects: S.Array(TargetRect),
})
export const HoveredStep = taggedStruct("HoveredStep", { index: S.Number })
export const UnhoveredStep = taggedStruct("UnhoveredStep")
export const ShookNode = taggedStruct("ShookNode")
export const ClearedStepHover = taggedStruct("ClearedStepHover", {
    token: S.Number,
})
export const RaisedNotification = taggedStruct("RaisedNotification", {
    notification: Notification,
})
export const DismissedNotification = taggedStruct("DismissedNotification", {
    id: S.String,
})
export const HoveredNode = taggedStruct("HoveredNode")
export const UnhoveredNode = taggedStruct("UnhoveredNode")
export const HoveredControl = taggedStruct("HoveredControl")
export const UnhoveredControl = taggedStruct("UnhoveredControl")
export const ToggledSound = taggedStruct("ToggledSound")
export const ChangedReducedMotion = taggedStruct("ChangedReducedMotion", {
    prefers: S.Boolean,
})
export const ChangedConcurrencyMode = taggedStruct("ChangedConcurrencyMode", {
    mode: ConcurrencyMode,
})
export const ChangedFinalizerOutcome = taggedStruct("ChangedFinalizerOutcome", {
    outcome: FinalizerOutcome,
})
export const SetRefValue = taggedStruct("SetRefValue", { value: S.String })
export const ClearedRefFlash = taggedStruct("ClearedRefFlash")
export const ChangedScopeState = taggedStruct("ChangedScopeState", {
    state: ScopeState,
})
export const AddedFinalizer = taggedStruct("AddedFinalizer", {
    finalizer: Finalizer,
})
export const ChangedFinalizerState = taggedStruct("ChangedFinalizerState", {
    id: S.String,
    state: FinalizerState,
})
export const StartedConcurrencyStep = taggedStruct("StartedConcurrencyStep", {
    run_id: S.Number,
    index: S.Number,
    started_at_millis: S.Number,
})
export const CompletedConcurrencyStep = taggedStruct(
    "CompletedConcurrencyStep",
    {
        run_id: S.Number,
        index: S.Number,
        completed_at_millis: S.Number,
        value: ResultValue,
    }
)
export const InterruptedConcurrencyStep = taggedStruct(
    "InterruptedConcurrencyStep",
    {
        run_id: S.Number,
        index: S.Number,
        interrupted_at_millis: S.Number,
    }
)
export const FailedConcurrencyStep = taggedStruct("FailedConcurrencyStep", {
    run_id: S.Number,
    index: S.Number,
    failed_at_millis: S.Number,
    error: S.String,
})
// PORT NOTE: the source's `SelectedExample` is gone. It swapped the example in
// the Model because that app had no routing; here the URL owns the selection,
// and keeping both would let the two disagree. The nav uses hrefs instead.
export const StartedSleep = taggedStruct("StartedSleep", {
    run_id: S.Number,
    started_at_millis: S.Number,
})
export const TickedElapsed = taggedStruct("TickedElapsed")
export const UpdatedElapsed = taggedStruct("UpdatedElapsed", {
    run_id: S.Number,
    elapsed_millis: S.Number,
})
export const SucceededRun = taggedStruct("SucceededRun", {
    run_id: S.Number,
    completed_at_millis: S.Number,
    outcome: RunOutcome,
})

export const Message = S.Union([
    ChangedExampleRoute,
    ClickedNode,
    HighlightedCode,
    MeasuredHighlights,
    HoveredStep,
    UnhoveredStep,
    ShookNode,
    ClearedStepHover,
    RaisedNotification,
    DismissedNotification,
    HoveredNode,
    UnhoveredNode,
    HoveredControl,
    UnhoveredControl,
    ToggledSound,
    ChangedReducedMotion,
    ChangedConcurrencyMode,
    ChangedFinalizerOutcome,
    SetRefValue,
    ClearedRefFlash,
    ChangedScopeState,
    AddedFinalizer,
    ChangedFinalizerState,
    StartedConcurrencyStep,
    CompletedConcurrencyStep,
    InterruptedConcurrencyStep,
    FailedConcurrencyStep,
    StartedSleep,
    TickedElapsed,
    UpdatedElapsed,
    SucceededRun,
    PlayedSound,
    AudioAvailable,
    AudioUnavailable,
    AudioReleased,
])
export type Message = typeof Message.Type
