import { Option, Schema as S } from "effect"
import { EngineOff, EngineState } from "./engine.ts"

export const Model = S.Struct({
    engine: EngineState,
    computeCount: S.Number,
    maybeSquareResult: S.Option(S.Number),
})

export type Model = typeof Model.Type

export const initialModel: Model = {
    engine: EngineOff(),
    computeCount: 0,
    maybeSquareResult: Option.none(),
}
