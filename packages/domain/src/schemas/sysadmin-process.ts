import { Schema } from "effect"
import { StudioMetricSnapshot, StudioSystemSnapshot } from "./studio.ts"

export const SysadminProcessSnapshot = Schema.Struct({
    id: Schema.String,
    metrics: Schema.Array(StudioMetricSnapshot),
    system: StudioSystemSnapshot,
})
export type SysadminProcessSnapshot = typeof SysadminProcessSnapshot.Type
