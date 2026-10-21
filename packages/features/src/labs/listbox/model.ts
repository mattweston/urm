import * as Ui from "@foldkit/ui"
import { Schema as S } from "effect"
import { ListboxItem } from "./item.ts"

export const Model = S.Struct({
    basic: Ui.Listbox.Model,
    maybeSelectedItem: S.Option(ListboxItem),
    multi: Ui.Listbox.Multi.Model,
    selectedMultiItems: S.Array(ListboxItem),
    grouped: Ui.Listbox.Model,
    maybeSelectedGroupedItem: S.Option(S.String),
})

export type Model = typeof Model.Type
