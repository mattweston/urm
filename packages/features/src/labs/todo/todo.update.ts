import { Array, Match as M, Option, String } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"
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
                modifyFields(model, {
                    newTodoText: () => text,
                }),
                [],
            ],

            UpdatedEditingTodo: ({ text }) => [
                modifyFields(model, {
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
                    modifyFields(model, {
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
                    modifyFields(model, {
                        todos: () => updatedTodos,
                    }),
                    [saveTodos(updatedTodos)],
                ]
            },

            ToggledTodo: ({ id }) => {
                const updatedTodos = Array.map(model.todos, (todo) =>
                    todo.id === id
                        ? modifyFields(todo, { completed: (completed) => !completed })
                        : todo
                )

                return [
                    modifyFields(model, {
                        todos: () => updatedTodos,
                    }),
                    [saveTodos(updatedTodos)],
                ]
            },

            StartedEditing: ({ id }) => {
                const todo = Array.findFirst(model.todos, (t) => t.id === id)
                return [
                    modifyFields(model, {
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
                                    modifyFields(model, {
                                        editing: () => NotEditing(),
                                    }),
                                    [],
                                ]
                            }

                            const updatedTodos = Array.map(
                                model.todos,
                                (todo) =>
                                    todo.id === id
                                        ? modifyFields(todo, {
                                              text: () => String.trim(text),
                                          })
                                        : todo
                            )

                            return [
                                modifyFields(model, {
                                    todos: () => updatedTodos,
                                    editing: () => NotEditing(),
                                }),
                                [saveTodos(updatedTodos)],
                            ]
                        },
                    })
                ),

            CancelledEdit: () => [
                modifyFields(model, {
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
                    modifyFields(todo, {
                        completed: () => !allCompleted,
                    })
                )

                return [
                    modifyFields(model, {
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
                    modifyFields(model, {
                        todos: () => updatedTodos,
                    }),
                    [saveTodos(updatedTodos)],
                ]
            },

            SelectedFilter: ({ filter }) => [
                modifyFields(model, {
                    filter: () => filter,
                }),
                [],
            ],

            SavedTodos: ({ todos }) => [
                modifyFields(model, {
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
