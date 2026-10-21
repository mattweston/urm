import { Schema as S } from "effect"

import { CheckoutState, TransitionLogEntry } from "./machine.ts"

export const Model = S.Struct({
    checkout: CheckoutState,
    transitionLog: S.Array(TransitionLogEntry),
    nextTransitionLogId: S.Number,
})

export type Model = typeof Model.Type
