import * as Ui from "@foldkit/ui"
import { Schema as S } from "effect"

export const Model = S.Struct({
    basic: Ui.Menu.Model,
    animated: Ui.Menu.Model,
})

export type Model = typeof Model.Type
