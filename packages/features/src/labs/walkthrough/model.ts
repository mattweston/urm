import { Schema as S } from "effect"

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

export const Model = S.Struct({
    route: FoldkitRoute,
    audio: Audio.Model,
    counter: Counter.Model,
    repeated_text: RepeatedText.Model,
    dice: Dice.Model,
    weather: Weather.Model,
    roll: Roll.Model,
    author: Author.Model,
    like: Like.Model,
    todos: Todos.Model,
    comments: Comments.Model,
    search: Search.Model,
})
export type Model = typeof Model.Type
