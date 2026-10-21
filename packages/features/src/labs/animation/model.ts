import * as Ui from "@foldkit/ui"
import { Schema as S } from "effect"

export const Model = S.Struct({
    animation: Ui.Animation.Model,
    isShowing: S.Boolean,
})
export type Model = typeof Model.Type
