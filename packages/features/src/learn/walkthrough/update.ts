import { Match as M, Schema as S } from "effect"
import type { Update } from "foldkit"
import { evo } from "foldkit/struct"

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
import type { Message } from "./message.ts"
import { Model } from "./model.ts"
import type { FoldkitRoute } from "./route.ts"

type UpdateReturn = Update.Return<Model, Message, Audio.AudioService>

export const init = (route: FoldkitRoute): UpdateReturn => ({
    model: Model.make({
        route,
        audio: Audio.init,
        counter: Counter.init,
        repeated_text: RepeatedText.init,
        dice: Dice.init,
        weather: Weather.init[0],
        roll: Roll.init,
        author: Author.init[0],
        like: Like.init,
        todos: Todos.init,
        comments: Comments.init,
        search: Search.init,
    }),
    commands: [...Weather.init[1], ...Author.init[1]],
})

// Audio is checked first: the two cue-completion Messages also belong to five
// example unions, and it is the audio Model that acts on them.
const is_audio_message = S.is(Audio.Message)
const is_counter_message = S.is(Counter.Message)
const is_repeated_text_message = S.is(RepeatedText.Message)
const is_dice_message = S.is(Dice.Message)
const is_weather_message = S.is(Weather.Message)
const is_roll_message = S.is(Roll.Message)
const is_author_message = S.is(Author.Message)
const is_like_message = S.is(Like.Message)
const is_todos_message = S.is(Todos.Message)
const is_comments_message = S.is(Comments.Message)
const is_search_message = S.is(Search.Message)

export const update = (model: Model, message: Message): UpdateReturn => {
    if (is_audio_message(message)) {
        const { model: audio, commands = [] } = Audio.update(
            model.audio,
            message
        )
        return { model: evo(model, { audio: () => audio }), commands }
    }
    if (is_counter_message(message)) {
        const { model: counter, commands = [] } = Counter.update(
            model.counter,
            message
        )
        return { model: evo(model, { counter: () => counter }), commands }
    }
    if (is_repeated_text_message(message)) {
        const { model: repeated_text, commands = [] } = RepeatedText.update(
            model.repeated_text,
            message
        )
        return {
            model: evo(model, { repeated_text: () => repeated_text }),
            commands,
        }
    }
    if (is_dice_message(message)) {
        const { model: dice, commands = [] } = Dice.update(model.dice, message)
        return { model: evo(model, { dice: () => dice }), commands }
    }
    if (is_weather_message(message)) {
        const { model: weather, commands = [] } = Weather.update(
            model.weather,
            message
        )
        return { model: evo(model, { weather: () => weather }), commands }
    }
    if (is_roll_message(message)) {
        const { model: roll, commands = [] } = Roll.update(model.roll, message)
        return { model: evo(model, { roll: () => roll }), commands }
    }
    if (is_author_message(message)) {
        const { model: author, commands = [] } = Author.update(
            model.author,
            message
        )
        return { model: evo(model, { author: () => author }), commands }
    }
    if (is_like_message(message)) {
        const { model: like, commands = [] } = Like.update(model.like, message)
        return { model: evo(model, { like: () => like }), commands }
    }
    if (is_todos_message(message)) {
        const { model: todos, commands = [] } = Todos.update(
            model.todos,
            message
        )
        return { model: evo(model, { todos: () => todos }), commands }
    }
    if (is_comments_message(message)) {
        const { model: comments, commands = [] } = Comments.update(
            model.comments,
            message
        )
        return { model: evo(model, { comments: () => comments }), commands }
    }
    if (is_search_message(message)) {
        const { model: search, commands = [] } = Search.update(
            model.search,
            message
        )
        return { model: evo(model, { search: () => search }), commands }
    }
    return M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ChangedFoldkitRoute: ({ route }) => ({
                model: evo(model, { route: () => route }),
                commands: [],
            }),
        })
    )
}
