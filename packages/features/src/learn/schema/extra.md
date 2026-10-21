but only one small Foldkit-specific addition. I wouldn’t make a separate Schema demo for it.

Our existing Effect Schema demo already covers the substantial material: Shape (Struct, Literals, optionalKey, Type/Encoded), Decode, Transform, Encode, plus a Schema.Union example. Foldkit’s current Schema API reference adds essentially one ergonomic helper: ts, which wraps Effect’s Schema.TaggedStruct and makes the schema itself callable as a constructor.

For example:

import { Schema as S } from "effect"
import { ts } from "foldkit/schema"

const Loading = ts("Loading")

const Success = ts("Success", {
data: S.String,
})

Loading()
// { \_tag: "Loading" }

Success({
data: "hello",
})
// { \_tag: "Success", data: "hello" }

The difference is basically:

// Effect directly
const Loading =
S.TaggedStruct("Loading", {})

Loading.make({})

versus:

// Foldkit convenience
const Loading =
ts("Loading")

Loading()

ts still behaves as a normal TaggedStruct Schema; Foldkit adds the callable-constructor ergonomics rather than a new validation/encoding model. The API calls the resulting type CallableTaggedStruct.

So I’d update the existing Schema demo rather than create another one: add a compact fifth section/card called “Foldkit Tagged Struct” showing TaggedStruct.make() → ts(...)().

Also, the more substantial Foldkit tagged-state abstraction—defineTaggedUnion, constructors, .match, .guards, .isAnyOf, .subset—is already better represented in the Foldkit Model demo we made. The /api-reference/schema page itself doesn’t add those concept
