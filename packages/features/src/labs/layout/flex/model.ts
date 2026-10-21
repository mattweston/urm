import { Schema as S } from "effect"

import {
    AlignItems,
    DEFAULT_ALIGN_ITEMS,
    DEFAULT_FLEX_DIRECTION,
    DEFAULT_JUSTIFY_CONTENT,
    FlexDirection,
    JustifyContent,
} from "./flex.ts"

export const Model = S.Struct({
    flexDirection: FlexDirection,
    justifyContent: JustifyContent,
    alignItems: AlignItems,
    // the children are different heights, which is the only way align-items
    // has anything visible to do
    unevenChildren: S.Boolean,
})
export type Model = typeof Model.Type

export const initialModel: Model = Model.make({
    flexDirection: DEFAULT_FLEX_DIRECTION,
    justifyContent: DEFAULT_JUSTIFY_CONTENT,
    alignItems: DEFAULT_ALIGN_ITEMS,
    unevenChildren: true,
})
