import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import * as Audio from "./audio.ts"
import * as Counter from "./examples/counter.ts"
import * as Author from "./examples/combining.ts"
import * as Comments from "./examples/embedding.ts"
import * as Dice from "./examples/on-change.ts"
import * as RepeatedText from "./examples/combined-inputs.ts"
import * as Roll from "./examples/on-demand.ts"
import * as Like from "./examples/optimistic-update.ts"
import * as Search from "./examples/streaming.ts"
import * as Todos from "./examples/items.ts"
import * as Weather from "./examples/decoding.ts"
import { FoldkitRoute } from "./route.ts"

export const ChangedFoldkitRoute = taggedStruct("ChangedFoldkitRoute", {
    route: FoldkitRoute,
})
export const Message = S.Union([
    ChangedFoldkitRoute,
    Audio.Message,
    Counter.Message,
    RepeatedText.Message,
    Dice.Message,
    Weather.Message,
    Roll.Message,
    Author.Message,
    Like.Message,
    Todos.Message,
    Comments.Message,
    Search.Message,
])
export type Message = typeof Message.Type
