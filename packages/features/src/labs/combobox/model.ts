import * as Ui from "@foldkit/ui"
import { Schema as S } from "effect"

import { City } from "./city.ts"

export const Model = S.Struct({
    basic: Ui.Combobox.Model,
    maybeBasicValue: S.Option(City),
    nullable: Ui.Combobox.Model,
    maybeNullableValue: S.Option(City),
    selectOnFocus: Ui.Combobox.Model,
    maybeSelectOnFocusValue: S.Option(City),
    multi: Ui.Combobox.Multi.Model,
    multiValues: S.Array(City),
})
export type Model = typeof Model.Type
