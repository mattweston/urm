import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"

// Two lists: one with a uniform row height, one whose rows vary because some
// carry a summary line.
export const Model = S.Struct({
    fixed: Ui.VirtualList.Model,
    variable: Ui.VirtualList.Model,
})

export type Model = typeof Model.Type
