import { Duration, Effect, Match as M, Option, Schema as S } from "effect"
import { AsyncData, Command, Subscription, type Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

import * as Audio from "../audio.ts"
import * as Timer from "./timer.ts"

export const Author = S.Struct({
    name: S.String,
    books: S.Number,
    birth: S.Number,
    death: S.Number,
})
export type Author = typeof Author.Type
export const authors: ReadonlyArray<Author> = [
    Author.make({
        name: "William Shakespeare",
        books: 37,
        birth: 1564,
        death: 1616,
    }),
    Author.make({ name: "Jane Austen", books: 6, birth: 1775, death: 1817 }),
    Author.make({
        name: "John Kennedy Toole",
        books: 1,
        birth: 1937,
        death: 1969,
    }),
    Author.make({
        name: "Charles Dickens",
        books: 20,
        birth: 1812,
        death: 1870,
    }),
    Author.make({ name: "Mark Twain", books: 28, birth: 1835, death: 1910 }),
    Author.make({ name: "Isaac Asimov", books: 500, birth: 1920, death: 1992 }),
]
const Count = AsyncData.Schema(S.Number, S.String)
export const Model = S.Struct({
    author_index: S.Number,
    books: Count.schema,
    age_at_death: Count.schema,
    keeps_previous_data: S.Boolean,
    timer: Timer.Timer,
})
export type Model = typeof Model.Type

export const SelectedAuthor = taggedStruct("SelectedAuthor", {
    author_index: S.Number,
})
export const CompletedFetchBooks = taggedStruct("CompletedFetchBooks", {
    author_index: S.Number,
    books: S.Number,
})
export const CompletedFetchAgeAtDeath = taggedStruct(
    "CompletedFetchAgeAtDeath",
    {
        author_index: S.Number,
        years: S.Number,
    }
)
export const ToggledKeepPreviousData = taggedStruct("ToggledKeepPreviousData")
export const TickedAuthorTimer = taggedStruct("TickedAuthorTimer", {
    now_ms: S.Number,
})
export const Message = S.Union([
    Audio.CompletedPlayCue,
    Audio.FailedPlayCue,
    SelectedAuthor,
    CompletedFetchBooks,
    CompletedFetchAgeAtDeath,
    ToggledKeepPreviousData,
    TickedAuthorTimer,
])
export type Message = typeof Message.Type

export const author_at = (author_index: number): Author =>
    authors[author_index] ??
    Author.make({ name: "", books: 0, birth: 0, death: 0 })
const FetchBooks = Command.define("FetchBooks", {
    args: { author_index: S.Number },
    messages: [CompletedFetchBooks],
    execute: ({ author_index }) =>
        Effect.sleep(Duration.millis(600)).pipe(
            Effect.as(
                CompletedFetchBooks({
                    author_index,
                    books: author_at(author_index).books,
                })
            )
        ),
})
const FetchAgeAtDeath = Command.define("FetchAgeAtDeath", {
    args: { author_index: S.Number },
    messages: [CompletedFetchAgeAtDeath],
    execute: ({ author_index }) =>
        Effect.sleep(Duration.millis(500)).pipe(
            Effect.as(
                CompletedFetchAgeAtDeath({
                    author_index,
                    years:
                        author_at(author_index).death -
                        author_at(author_index).birth,
                })
            )
        ),
})

export const init: readonly [Model, ReadonlyArray<Command.Command<Message>>] = [
    Model.make({
        author_index: 0,
        books: AsyncData.Loading(),
        age_at_death: AsyncData.Loading(),
        keeps_previous_data: true,
        timer: Timer.start(),
    }),
    [FetchBooks({ author_index: 0 }), FetchAgeAtDeath({ author_index: 0 })],
]

const reload = <A, E>(
    data: AsyncData.AsyncData<A, E>,
    keeps_previous_data: boolean
): AsyncData.AsyncData<A, E> =>
    keeps_previous_data
        ? Option.getOrElse(AsyncData.revalidateOrLoad(data), () => data)
        : AsyncData.Loading()
type UpdateReturn = Update.Return<Model, Message, Audio.AudioService>
const landed = (model: Model): UpdateReturn =>
    AsyncData.isPending(model.books) || AsyncData.isPending(model.age_at_death)
        ? { model, commands: [] }
        : {
              model: modifyFields(model, { timer: Timer.settle }),
              commands: [Audio.play(Audio.AuthorLanded())],
          }

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedAuthor: ({ author_index }) => ({
                model: modifyFields(model, {
                    author_index: () => author_index,
                    books: (books) => reload(books, model.keeps_previous_data),
                    age_at_death: (age) =>
                        reload(age, model.keeps_previous_data),
                    timer: Timer.start,
                }),
                commands: [
                    FetchBooks({ author_index }),
                    FetchAgeAtDeath({ author_index }),
                    Audio.play(Audio.AuthorSelected({ author_index })),
                ],
            }),
            CompletedFetchBooks: ({ author_index, books }) =>
                author_index === model.author_index
                    ? landed(
                          modifyFields(model, {
                              books: () => AsyncData.Success({ data: books }),
                          })
                      )
                    : { model, commands: [] },
            CompletedFetchAgeAtDeath: ({ author_index, years }) =>
                author_index === model.author_index
                    ? landed(
                          modifyFields(model, {
                              age_at_death: () =>
                                  AsyncData.Success({ data: years }),
                          })
                      )
                    : { model, commands: [] },
            ToggledKeepPreviousData: () => ({
                model: modifyFields(model, { keeps_previous_data: (keeps) => !keeps }),
                commands: [],
            }),
            TickedAuthorTimer: ({ now_ms }) => ({
                model: modifyFields(model, {
                    timer: (timer) => Timer.tick(timer, now_ms),
                }),
                commands: [],
            }),
            CompletedPlayCue: () => ({ model, commands: [] }),
            FailedPlayCue: () => ({ model, commands: [] }),
        })
    )

export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    authorTimer: entry(
        { is_ticking: S.Boolean },
        {
            modelToDependencies: (model) => ({
                is_ticking: Timer.is_ticking(model.timer),
            }),
            dependenciesToStream: ({ is_ticking }) =>
                Timer.tick_stream(is_ticking, (now_ms) =>
                    TickedAuthorTimer({ now_ms })
                ),
        }
    ),
}))

export const books_per_year = (
    model: Model
): AsyncData.AsyncData<string, string> =>
    AsyncData.map(
        AsyncData.all([model.books, model.age_at_death]),
        ([books, years]) => (years === 0 ? "0.00" : (books / years).toFixed(2))
    )
