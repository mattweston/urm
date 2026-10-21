import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"

export const Model = S.Struct({
    basic: Ui.Tooltip.Model,
    noDelay: Ui.Tooltip.Model,
})

export type Model = typeof Model.Type
