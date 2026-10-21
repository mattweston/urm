import { Schema as S } from "effect"

import { Popover } from "@foldkit/ui"

export const Model = S.Struct({
    basic: Popover.Model,
    animated: Popover.Model,
})

export type Model = typeof Model.Type
