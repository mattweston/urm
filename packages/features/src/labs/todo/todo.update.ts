import { Array, Match as M, Option, String } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"
import type { Model } from "./todo.model.ts"
import { NotEditing, Editing } from "./todo.model.ts"
import type { Message } from "./todo.message.ts"
import { GenerateTodo, saveTodos } from "./todo.command.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            UpdatedNewTodo: ({ text }) => [
                evo(model, {
                    newTodoText: () => text,
                }),
                [],
            ],

            UpdatedEditingTodo: ({ text }) => [
                evo(model, {
                    editing: () =>
                        M.value(model.editing).pipe(
                            M.tagsExhaustive({
                                NotEditing: () => model.editing,
                                Editing: ({ id }) => Editing({ id, text }),
                            })
                        ),
                }),
                [],
            ],

            AddedTodo: () => {
                if (String.isEmpty(String.trim(model.newTodoText))) {
                    return [model, []]
                }

                return [
                    model,
                    [GenerateTodo({ text: String.trim(model.newTodoText) })],
                ]
            },

            GeneratedTodo: ({ id, timestamp, text }) => {
                const newTodo = {
                    id,
                    text,
                    completed: false,
                    createdAt: timestamp,
                }

                const updatedTodos = [...model.todos, newTodo]

                return [
                    evo(model, {
                        todos: () => updatedTodos,
                        newTodoText: () => "",
                    }),
                    [saveTodos(updatedTodos)],
                ]
            },

            DeletedTodo: ({ id }) => {
                const updatedTodos = Array.filter(
                    model.todos,
                    (todo) => todo.id !== id
                )

                return [
                    evo(model, {
                        todos: () => updatedTodos,
                    }),
                    [saveTodos(updatedTodos)],
                ]
            },

            ToggledTodo: ({ id }) => {
                const updatedTodos = Array.map(model.todos, (todo) =>
                    todo.id === id
                        ? evo(todo, { completed: (completed) => !completed })
                        : todo
                )

                return [
                    evo(model, {
                        todos: () => updatedTodos,
                    }),
                    [saveTodos(updatedTodos)],
                ]
            },

            StartedEditing: ({ id }) => {
                const todo = Array.findFirst(model.todos, (t) => t.id === id)
                return [
                    evo(model, {
                        editing: () =>
                            Editing({
                                id,
                                text: Option.match(todo, {
                                    onNone: () => "",
                                    onSome: (t) => t.text,
                                }),
                            }),
                    }),
                    [],
                ]
            },

            SavedEdit: () =>
                M.value(model.editing).pipe(
                    withUpdateReturn,
                    M.tagsExhaustive({
                        NotEditing: () => [model, []],

                        Editing: ({ id, text }) => {
                            if (String.isEmpty(String.trim(text))) {
                                return [
                                    evo(model, {
                                        editing: () => NotEditing(),
                                    }),
                                    [],
                                ]
                            }

                            const updatedTodos = Array.map(
                                model.todos,
                                (todo) =>
                                    todo.id === id
                                        ? evo(todo, {
                                              text: () => String.trim(text),
                                          })
                                        : todo
                            )

                            return [
                                evo(model, {
                                    todos: () => updatedTodos,
                                    editing: () => NotEditing(),
                                }),
                                [saveTodos(updatedTodos)],
                            ]
                        },
                    })
                ),

            CancelledEdit: () => [
                evo(model, {
                    editing: () => NotEditing(),
                }),
                [],
            ],

            ToggledAll: () => {
                const allCompleted = Array.every(
                    model.todos,
                    (todo) => todo.completed
                )
                const updatedTodos = Array.map(model.todos, (todo) =>
                    evo(todo, {
                        completed: () => !allCompleted,
                    })
                )

                return [
                    evo(model, {
                        todos: () => updatedTodos,
                    }),
                    [saveTodos(updatedTodos)],
                ]
            },

            ClearedCompleted: () => {
                const updatedTodos = Array.filter(
                    model.todos,
                    (todo) => !todo.completed
                )

                return [
                    evo(model, {
                        todos: () => updatedTodos,
                    }),
                    [saveTodos(updatedTodos)],
                ]
            },

            SelectedFilter: ({ filter }) => [
                evo(model, {
                    filter: () => filter,
                }),
                [],
            ],

            SavedTodos: ({ todos }) => [
                evo(model, {
                    todos: () => todos,
                }),
                [],
            ],
        })
    )

export const init = (): UpdateReturn => [
    {
        todos: [],
        newTodoText: "",
        filter: "All",
        editing: NotEditing(),
    },
    [],
]
