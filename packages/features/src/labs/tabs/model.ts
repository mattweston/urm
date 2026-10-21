import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"

export const TabValue = S.Literals(["Foldkit", "React", "Elm"])
export type TabValue = typeof TabValue.Type

export const Model = S.Struct({
    horizontalTabs: Ui.Tabs.Model,
    horizontalValue: TabValue,
    verticalTabs: Ui.Tabs.Model,
    verticalValue: TabValue,
})

export type Model = typeof Model.Type
