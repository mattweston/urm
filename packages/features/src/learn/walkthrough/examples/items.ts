import { Array, Match as M, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { evo } from "foldkit/struct"

import * as Audio from "../audio.ts"

export const Todo = S.Struct({
    todo_id: S.Number,
    text: S.String,
    is_completed: S.Boolean,
})
export type Todo = typeof Todo.Type
export const Filter = S.Literals(["All", "Open", "Done"])
export type Filter = typeof Filter.Type
export const filters: ReadonlyArray<Filter> = ["All", "Open", "Done"]
export const Model = S.Struct({
    draft: S.String,
    items: S.Array(Todo),
    next_todo_id: S.Number,
    filter: Filter,
})
export type Model = typeof Model.Type

export const UpdatedTodoDraft = taggedStruct("UpdatedTodoDraft", {
    value: S.String,
})
export const SubmittedTodo = taggedStruct("SubmittedTodo")
export const ToggledTodo = taggedStruct("ToggledTodo", { todo_id: S.Number })
export const ClickedDeleteTodo = taggedStruct("ClickedDeleteTodo", {
    todo_id: S.Number,
})
export const SelectedTodoFilter = taggedStruct("SelectedTodoFilter", {
    filter: Filter,
})
export const Message = S.Union([
    Audio.CompletedPlayCue,
    Audio.FailedPlayCue,
    UpdatedTodoDraft,
    SubmittedTodo,
    ToggledTodo,
    ClickedDeleteTodo,
    SelectedTodoFilter,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    draft: "",
    items: [],
    next_todo_id: 1,
    filter: "All",
})
const append_draft = (model: Model): Model => {
    const text = model.draft.trim()
    return text === ""
        ? model
        : evo(model, {
              items: (items) =>
                  Array.append(
                      items,
                      Todo.make({
                          todo_id: model.next_todo_id,
                          text,
                          is_completed: false,
                      })
                  ),
              next_todo_id: (todo_id) => todo_id + 1,
              draft: () => "",
          })
}
type UpdateReturn = Update.Return<Model, Message, Audio.AudioService>
export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            UpdatedTodoDraft: ({ value }) => ({
                model: evo(model, { draft: () => value }),
                commands: [],
            }),
            SubmittedTodo: () =>
                model.draft.trim() === ""
                    ? { model, commands: [] }
                    : {
                          model: append_draft(model),
                          commands: [Audio.play(Audio.TodoAdded())],
                      },
            ToggledTodo: ({ todo_id }) => ({
                model: evo(model, {
                    items: Array.map((item) =>
                        item.todo_id === todo_id
                            ? evo(item, { is_completed: (value) => !value })
                            : item
                    ),
                }),
                commands: [Audio.play(Audio.TodoAdded())],
            }),
            ClickedDeleteTodo: ({ todo_id }) => ({
                model: evo(model, {
                    items: Array.filter((item) => item.todo_id !== todo_id),
                }),
                commands: [Audio.play(Audio.TodoRemoved())],
            }),
            SelectedTodoFilter: ({ filter }) => ({
                model: evo(model, { filter: () => filter }),
                commands: [Audio.play(Audio.SwitchFlipped())],
            }),
            CompletedPlayCue: () => ({ model, commands: [] }),
            FailedPlayCue: () => ({ model, commands: [] }),
        })
    )
export const completed_count = (model: Model): number =>
    Array.filter(model.items, (item) => item.is_completed).length
export const visible_items = (model: Model): ReadonlyArray<Todo> =>
    M.value(model.filter).pipe(
        M.withReturnType<ReadonlyArray<Todo>>(),
        M.when("All", () => model.items),
        M.when("Open", () =>
            Array.filter(model.items, (item) => !item.is_completed)
        ),
        M.when("Done", () =>
            Array.filter(model.items, (item) => item.is_completed)
        ),
        M.exhaustive
    )
