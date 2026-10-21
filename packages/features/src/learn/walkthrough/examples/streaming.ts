import {
    Array,
    Duration,
    Effect,
    Match as M,
    Schedule,
    Schema as S,
    Stream,
    String as String_,
    pipe,
} from "effect"
import { Command, Subscription, type Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

const ROW_INTERVAL = Duration.millis(200)
const PAGE_DELAY = Duration.millis(1000)
const PAGE_SIZE = 5
const MAX_RESULTS = 20
const ROW_COUNT = 50

export const Row = S.Struct({
    row_id: S.Number,
    title: S.String,
    description: S.String,
})
export type Row = typeof Row.Type

const rows: ReadonlyArray<Row> = Array.makeBy(ROW_COUNT, (index) =>
    Row.make({
        row_id: index + 1,
        title: `Item ${index + 1}`,
        description: `Description for item ${index + 1}`,
    })
)

export const Pattern = S.Literals(["Subscription", "Command"])
export type Pattern = typeof Pattern.Type
export const patterns: ReadonlyArray<Pattern> = ["Subscription", "Command"]

export const Model = S.Struct({
    query: S.String,
    pattern: Pattern,
    stream_token: S.Number,
    is_streaming: S.Boolean,
    streamed: S.Array(Row),
    pulled: S.Array(Row),
    is_pulling: S.Boolean,
})
export type Model = typeof Model.Type

export const UpdatedSearchQuery = taggedStruct("UpdatedSearchQuery", {
    value: S.String,
})
export const SelectedSearchPattern = taggedStruct("SelectedSearchPattern", {
    pattern: Pattern,
})
export const ClickedSearch = taggedStruct("ClickedSearch")
export const ReceivedSearchRow = taggedStruct("ReceivedSearchRow", { row: Row })
export const CompletedStreamRows = taggedStruct("CompletedStreamRows")
export const ClickedLoadMore = taggedStruct("ClickedLoadMore")
export const CompletedLoadPage = taggedStruct("CompletedLoadPage", {
    rows: S.Array(Row),
})
export const Message = S.Union([
    UpdatedSearchQuery,
    SelectedSearchPattern,
    ClickedSearch,
    ReceivedSearchRow,
    CompletedStreamRows,
    ClickedLoadMore,
    CompletedLoadPage,
])
export type Message = typeof Message.Type

export const matching = (query: string): ReadonlyArray<Row> =>
    pipe(
        Array.filter(rows, (row) =>
            pipe(
                row.title,
                String_.toLowerCase,
                String_.includes(query.toLowerCase())
            )
        ),
        Array.take(MAX_RESULTS)
    )

export const visible_rows = (model: Model): ReadonlyArray<Row> =>
    model.pattern === "Subscription" ? model.streamed : model.pulled

export const has_more_pages = (model: Model): boolean =>
    model.pulled.length < matching(model.query).length

const LoadPage = Command.define("LoadPage", {
    args: { query: S.String, offset: S.Number },
    messages: [CompletedLoadPage],
    execute: ({ query, offset }) =>
        Effect.sleep(PAGE_DELAY).pipe(
            Effect.as(
                CompletedLoadPage({
                    rows: pipe(
                        matching(query),
                        Array.drop(offset),
                        Array.take(PAGE_SIZE)
                    ),
                })
            )
        ),
})

export const init: Model = Model.make({
    query: "item",
    pattern: "Subscription",
    stream_token: 0,
    is_streaming: false,
    streamed: [],
    pulled: [],
    is_pulling: false,
})

type UpdateReturn = Update.Return<Model, Message>

const start_search = (model: Model): UpdateReturn =>
    model.pattern === "Subscription"
        ? {
              model: modifyFields(model, {
                  stream_token: (token) => token + 1,
                  is_streaming: () => true,
                  streamed: () => [],
              }),
              commands: [],
          }
        : {
              model: modifyFields(model, { pulled: () => [], is_pulling: () => true }),
              commands: [LoadPage({ query: model.query, offset: 0 })],
          }

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            UpdatedSearchQuery: ({ value }) => ({
                model: modifyFields(model, { query: () => value }),
                commands: [],
            }),
            SelectedSearchPattern: ({ pattern }) => ({
                model: modifyFields(model, {
                    pattern: () => pattern,
                    is_streaming: () => false,
                }),
                commands: [],
            }),
            ClickedSearch: () => start_search(model),
            ReceivedSearchRow: ({ row }) => ({
                model: modifyFields(model, {
                    streamed: (streamed) => Array.append(streamed, row),
                }),
                commands: [],
            }),
            CompletedStreamRows: () => ({
                model: modifyFields(model, { is_streaming: () => false }),
                commands: [],
            }),
            ClickedLoadMore: () =>
                model.is_pulling
                    ? { model, commands: [] }
                    : {
                          model: modifyFields(model, { is_pulling: () => true }),
                          commands: [
                              LoadPage({
                                  query: model.query,
                                  offset: model.pulled.length,
                              }),
                          ],
                      },
            CompletedLoadPage: ({ rows: page }) => ({
                model: modifyFields(model, {
                    pulled: (pulled) => Array.appendAll(pulled, page),
                    is_pulling: () => false,
                }),
                commands: [],
            }),
        })
    )

// The rows arrive from a Stream the runtime owns. Its dependencies are the
// query and the search token, so typing a new query or pressing search tears
// the old Stream down and starts a new one — there is no in-flight request to
// cancel by hand.
const row_stream = (query: string): Stream.Stream<Message> => {
    const completed: Message = CompletedStreamRows()
    return Stream.fromIterable(matching(query)).pipe(
        Stream.schedule(Schedule.spaced(ROW_INTERVAL)),
        Stream.map((row): Message => ReceivedSearchRow({ row })),
        Stream.concat(Stream.make(completed))
    )
}

export const subscriptions = Subscription.make<Model, Message>()((entry) => ({
    searchRows: entry(
        {
            is_streaming: S.Boolean,
            query: S.String,
            stream_token: S.Number,
        },
        {
            modelToDependencies: (model) => ({
                is_streaming: model.is_streaming,
                query: model.query,
                stream_token: model.stream_token,
            }),
            dependenciesToStream: ({ is_streaming, query }) =>
                Stream.when(
                    row_stream(query),
                    Effect.sync(() => is_streaming)
                ),
        }
    ),
}))
