import { Schema as S } from "effect"

import { Ball } from "./ball.ts"

export const Model = S.Struct({
    balls: S.Array(Ball),
    nextBallId: S.Number,
    isRunning: S.Boolean,
})
export type Model = typeof Model.Type

export const initialModel: Model = Model.make({
    balls: [],
    nextBallId: 0,
    isRunning: true,
})
