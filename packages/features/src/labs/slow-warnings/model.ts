import { Schema as S } from "effect"

export const Workload = S.Literals([
    "Idle",
    "Update",
    "View",
    "Patch",
    "SubscriptionDependencies",
])
export type Workload = typeof Workload.Type

export const SlowPhase = S.Literals([
    "Update",
    "View",
    "Patch",
    "SubscriptionDependencies",
])
export type SlowPhase = typeof SlowPhase.Type

export const SlowWarningReport = S.Struct({
    phase: SlowPhase,
    durationMs: S.Number,
    thresholdMs: S.Number,
    trigger: S.String,
    details: S.String,
})
export type SlowWarningReport = typeof SlowWarningReport.Type

export const SlowWarning = S.Struct({
    id: S.Number,
    ...SlowWarningReport.fields,
})
export type SlowWarning = typeof SlowWarning.Type

export const Model = S.Struct({
    activeWorkload: Workload,
    nextWarningId: S.Number,
    warnings: S.Array(SlowWarning),
    patchRows: S.Number,
    patchRun: S.Number,
})
export type Model = typeof Model.Type
