import { Schema as S } from "effect"

export const Model = S.Struct({
    isCollapsed: S.Boolean,
    mobileIsOpen: S.Boolean,
})
export type Model = typeof Model.Type

export const initialModel: Model = Model.make({
    isCollapsed: false,
    mobileIsOpen: false,
})
