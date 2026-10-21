import { BrowserKeyValueStore } from "@effect/platform-browser"
import { Clock, Effect, Random, Schema as S } from "effect"
import { KeyValueStore } from "effect/persistence"
import { Command } from "foldkit"
import { GeneratedTodo, SavedTodos } from "./todo.message.ts"

const TODOS_STORAGE_KEY = "todos"

const TodoItem = S.Struct({
    id: S.String,
    text: S.String,
    completed: S.Boolean,
    createdAt: S.Number,
})

const Todos = S.Array(TodoItem)

export const GenerateTodo = Command.define("GenerateTodo", {
    args: { text: S.String },
    messages: [GeneratedTodo],
    execute: ({ text }) =>
        Effect.gen(function* () {
            const id = yield* Random.nextIntBetween(
                0,
                Number.MAX_SAFE_INTEGER
            ).pipe(Effect.map((value) => value.toString(36)))
            const timestamp = yield* Clock.currentTimeMillis
            return GeneratedTodo({ id, timestamp, text })
        }),
})

const SaveTodos = Command.define("SaveTodos", {
    args: { todos: Todos },
    messages: [SavedTodos],
    execute: ({ todos }) =>
        Effect.gen(function* () {
            const store = yield* KeyValueStore.KeyValueStore
            yield* store.set(
                TODOS_STORAGE_KEY,
                S.encodeSync(S.fromJsonString(Todos))(todos)
            )
            return SavedTodos({ todos })
        }).pipe(
            Effect.catch(() => Effect.succeed(SavedTodos({ todos }))),
            Effect.provide(BrowserKeyValueStore.layerLocalStorage)
        ),
})

export const saveTodos = (todos: typeof Todos.Type) => SaveTodos({ todos })
