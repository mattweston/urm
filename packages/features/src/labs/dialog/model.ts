import * as Ui from "@foldkit/ui"
import { Schema as S } from "effect"

export const Model = S.Struct({
    basic: Ui.Dialog.Model,
    animated: Ui.Dialog.Model,
})

export type Model = typeof Model.Type
