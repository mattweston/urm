import { Schema as S } from "effect"

export const Submitted = S.Struct({
    name: S.String,
    email: S.String,
})

export const Model = S.Struct({
    name: S.String,
    email: S.String,
    // the values the form last submitted, so the demo can show the button did
    // something without navigating away
    submitted: S.NullOr(Submitted),
})
export type Model = typeof Model.Type

export const initialModel: Model = Model.make({
    name: "",
    email: "",
    submitted: null,
})
