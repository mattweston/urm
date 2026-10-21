import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"

export const Model = S.Struct({
    areaListbox: Ui.Listbox.Model,
    securityLevelListbox: Ui.Listbox.Model,
    area: S.String,
    securityLevel: S.String,
    subject: S.String,
    description: S.String,
})

export type Model = typeof Model.Type
