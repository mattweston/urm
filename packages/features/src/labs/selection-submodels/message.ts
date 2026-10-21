import { Schema as S } from "effect"
import { Listbox } from "@foldkit/ui"
import { taggedStruct } from "foldkit/schema"

import { Plan } from "./plan.ts"

export const GotSelectionSubmodelsListboxMessage = taggedStruct(
    "GotSelectionSubmodelsListboxMessage",
    { message: Listbox.Message }
)
export const RestoredSelectionSubmodelsPlan = taggedStruct(
    "RestoredSelectionSubmodelsPlan",
    { plan: Plan }
)
export const ClickedClearSelectionSubmodelsPlan = taggedStruct(
    "ClickedClearSelectionSubmodelsPlan"
)

export const SelectionSubmodelsMessage = S.Union([
    GotSelectionSubmodelsListboxMessage,
    RestoredSelectionSubmodelsPlan,
    ClickedClearSelectionSubmodelsPlan,
])
export type SelectionSubmodelsMessage = typeof SelectionSubmodelsMessage.Type
