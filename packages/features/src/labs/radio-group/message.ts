import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const Plan = S.Literals(["Startup", "Business", "Enterprise"])
export type Plan = typeof Plan.Type

export const SelectedHorizontal = taggedStruct("SelectedHorizontal", {
    value: Plan,
})
export const SelectedVertical = taggedStruct("SelectedVertical", {
    value: Plan,
})

export const Message = S.Union([SelectedHorizontal, SelectedVertical])
export type Message = typeof Message.Type
