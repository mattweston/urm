import { Effect, Schema, Stream } from "effect"
import { Subscription } from "foldkit"
import {
    SearchResponse,
    SuggestResponse,
    ReceivedSuggestions,
    ReceivedSearch,
    FailedSearch,
    request_key,
} from "@urm/features/dev/grep"
import type { Model, Message } from "@urm/features/dev/grep"

const search = Effect.fn("Grep.search")(function* (
    key: string,
    parameters: string
) {
    return yield* Effect.tryPromise({
        try: async (signal) => {
            const response = await fetch("/__urm/grep/search", {
                method: "POST",
                signal,
                headers: {
                    "Content-Type": "application/json",
                    "X-URM-Grep": "1",
                },
                body: parameters,
            })
            const value: unknown = await response.json()
            if (!response.ok) {
                const error = Schema.decodeUnknownSync(
                    Schema.Struct({ error: Schema.String })
                )(value)
                throw new Error(error.error)
            }
            return Schema.decodeUnknownSync(SearchResponse)(value)
        },
        catch: (error) =>
            error instanceof Error
                ? error.message
                : "Search could not be loaded.",
    }).pipe(
        Effect.match({
            onSuccess: (response) => ReceivedSearch({ key, response }),
            onFailure: (error) => FailedSearch({ key, error }),
        })
    )
})

const suggest = Effect.fn("Grep.suggest")(function* (query: string) {
    yield* Effect.sleep("150 millis")
    return yield* Effect.tryPromise({
        try: async (signal) => {
            if (query.trim() === "") return { suggestions: [] }
            const response = await fetch("/__urm/grep/suggest", {
                method: "POST",
                signal,
                headers: {
                    "Content-Type": "application/json",
                    "X-URM-Grep": "1",
                },
                body: JSON.stringify({ query }),
            })
            if (!response.ok) throw new Error("Suggestions unavailable")
            const value: unknown = await response.json()
            return Schema.decodeUnknownSync(SuggestResponse)(value)
        },
        catch: () => "Suggestions unavailable",
    }).pipe(
        Effect.match({
            onSuccess: ({ suggestions }) =>
                ReceivedSuggestions({ query, suggestions }),
            onFailure: () => ReceivedSuggestions({ query, suggestions: [] }),
        })
    )
})

export const grep_search_subscriptions = Subscription.make<Model, Message>()(
    (entry) => ({
        suggestions: entry(
            { query: Schema.String, complete: Schema.Boolean },
            {
                modelToDependencies: (model) => ({
                    query: model.query,
                    complete: model.suggestion_query === model.query,
                }),
                dependenciesToStream: ({ query, complete }) =>
                    complete ? Stream.empty : Stream.fromEffect(suggest(query)),
            }
        ),
        search: entry(
            { key: Schema.String, complete: Schema.Boolean },
            {
                modelToDependencies: (model) => ({
                    key: request_key(model),
                    complete:
                        model.response_key === request_key(model) ||
                        model.failure_key === request_key(model),
                }),
                dependenciesToStream: ({ key, complete }) =>
                    complete
                        ? Stream.empty
                        : Stream.fromEffect(search(key, key)),
            }
        ),
    })
)
