import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import * as Position from "./domain/position.ts"

export const TickedClock = taggedStruct("TickedClock")
export const PressedKey = taggedStruct("PressedKey", { key: S.String })
export const GeneratedApplePosition = taggedStruct("GeneratedApplePosition", {
    position: Position.Position,
})

export const Message = S.Union([
    TickedClock,
    PressedKey,
    GeneratedApplePosition,
])

export type Message = typeof Message.Type
