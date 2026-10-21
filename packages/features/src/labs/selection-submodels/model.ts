import { Option, Schema as S } from "effect"
import * as Ui from "@foldkit/ui"

import { Plan } from "./plan.ts"

export const Model = S.Struct({
    listbox: Ui.Listbox.Model,
    maybeSelectedPlan: S.Option(Plan),
})

export type Model = typeof Model.Type

export const initialModel: Model = {
    listbox: Ui.Listbox.init({ id: "selection-submodels-plan" }),
    maybeSelectedPlan: Option.none(),
}
