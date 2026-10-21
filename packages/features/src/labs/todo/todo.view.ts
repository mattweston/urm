import { Array as Arr, Match as M } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { Model } from "./todo.model.ts"
import type { Message } from "./todo.message.ts"
import {
    UpdatedNewTodo,
    UpdatedEditingTodo,
    AddedTodo,
    DeletedTodo,
    ToggledTodo,
    StartedEditing,
    SavedEdit,
    CancelledEdit,
    ToggledAll,
    ClearedCompleted,
    SelectedFilter,
} from "./todo.message.ts"

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (msg: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const todoItemView = (todo: (typeof model.todos)[0]): Html =>
        M.value(model.editing).pipe(
            M.tagsExhaustive({
                NotEditing: () => nonEditingTodoView(todo),
                Editing: ({ id, text }) =>
                    id === todo.id
                        ? editingTodoView(todo, text)
                        : nonEditingTodoView(todo),
            })
        )

    const editingTodoView = (
        todo: (typeof model.todos)[0],
        text: string
    ): Html =>
        h.li(
            [
                h.Class(
                    "flex items-center gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted/40 p-3"
                ),
            ],
            [
                h.input([
                    h.Type("text"),
                    h.Id(`edit-${todo.id}`),
                    h.AriaLabel("Edit todo"),
                    h.Value(text),
                    h.Class(
                        "flex-1 rounded border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                    ),
                    h.OnInput((value) =>
                        toParentMessage(UpdatedEditingTodo({ text: value }))
                    ),
                ]),
                h.button(
                    [
                        h.OnClick(toParentMessage(SavedEdit())),
                        h.Class(
                            "rounded bg-primary px-3 py-1 text-primary-foreground hover:opacity-90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                        ),
                    ],
                    ["Save"]
                ),
                h.button(
                    [
                        h.OnClick(toParentMessage(CancelledEdit())),
                        h.Class(
                            "rounded bg-secondary px-3 py-1 text-secondary-foreground hover:bg-secondary/80 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                        ),
                    ],
                    ["Cancel"]
                ),
            ]
        )

    const nonEditingTodoView = (todo: (typeof model.todos)[0]): Html =>
        h.li(
            [
                h.Class(
                    "group flex items-center gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-3 hover:bg-accent"
                ),
            ],
            [
                h.input([
                    h.Type("checkbox"),
                    h.Id(`todo-${todo.id}`),
                    h.AriaLabel(todo.text),
                    h.Checked(todo.completed),
                    h.Class("h-4 w-4 rounded text-primary focus:ring-ring"),
                    h.OnClick(toParentMessage(ToggledTodo({ id: todo.id }))),
                ]),
                h.span(
                    [
                        h.Class(
                            `flex-1 ${todo.completed ? "line-through text-muted-foreground" : "text-foreground"}`
                        ),
                        h.OnClick(
                            toParentMessage(StartedEditing({ id: todo.id }))
                        ),
                    ],
                    [todo.text]
                ),
                h.button(
                    [
                        h.OnClick(
                            toParentMessage(DeletedTodo({ id: todo.id }))
                        ),
                        h.AriaLabel(`Delete ${todo.text}`),
                        h.Class(
                            "rounded px-2 py-1 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10"
                        ),
                    ],
                    ["×"]
                ),
            ]
        )

    const filterButtonView = (
        filter: "All" | "Active" | "Completed",
        label: string
    ): Html =>
        h.button(
            [
                h.OnClick(toParentMessage(SelectedFilter({ filter }))),
                h.Class(
                    `px-3 py-1 rounded ${
                        model.filter === filter
                            ? "bg-accent text-accent-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`
                ),
            ],
            [label]
        )

    const footerView = (activeCount: number, completedCount: number): Html =>
        Arr.match(model.todos, {
            onEmpty: () => h.empty,
            onNonEmpty: () =>
                h.div(
                    [h.Class("flex flex-col gap-4")],
                    [
                        h.div(
                            [
                                h.Class(
                                    "text-center text-sm text-muted-foreground"
                                ),
                                h.Role("status"),
                            ],
                            [
                                `${activeCount} active, ${completedCount} completed`,
                            ]
                        ),

                        h.div(
                            [h.Class("flex justify-center gap-2")],
                            [
                                filterButtonView("All", "All"),
                                filterButtonView("Active", "Active"),
                                filterButtonView("Completed", "Completed"),
                            ]
                        ),

                        h.div(
                            [h.Class("flex justify-center gap-2")],
                            [
                                Arr.match(model.todos, {
                                    onEmpty: () => h.empty,
                                    onNonEmpty: (todos) =>
                                        h.button(
                                            [
                                                h.OnClick(
                                                    toParentMessage(
                                                        ToggledAll()
                                                    )
                                                ),
                                                h.Class(
                                                    "rounded bg-secondary px-3 py-1 text-sm text-secondary-foreground hover:bg-secondary/80 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                                                ),
                                            ],
                                            [
                                                Arr.every(
                                                    todos,
                                                    (t) => t.completed
                                                )
                                                    ? "Mark all active"
                                                    : "Mark all complete",
                                            ]
                                        ),
                                }),

                                completedCount > 0
                                    ? h.button(
                                          [
                                              h.OnClick(
                                                  toParentMessage(
                                                      ClearedCompleted()
                                                  )
                                              ),
                                              h.Class(
                                                  "rounded bg-destructive/10 px-3 py-1 text-sm text-destructive hover:bg-destructive/20"
                                              ),
                                          ],
                                          [`Clear ${completedCount} completed`]
                                      )
                                    : h.empty,
                            ]
                        ),
                    ]
                ),
        })

    const filterTodos = (): typeof model.todos =>
        M.value(model.filter).pipe(
            M.when("All", () => model.todos),
            M.when("Active", () =>
                Arr.filter(model.todos, (todo) => !todo.completed)
            ),
            M.when("Completed", () =>
                Arr.filter(model.todos, (todo) => todo.completed)
            ),
            M.exhaustive
        )

    const filteredTodos = filterTodos()
    const activeCount = Arr.length(
        Arr.filter(model.todos, (todo) => !todo.completed)
    )
    const completedCount = Arr.length(model.todos) - activeCount

    return h.div(
        [h.Class("min-h-screen bg-background py-8 text-foreground")],
        [
            h.div(
                [
                    h.Class(
                        "mx-auto max-w-md rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    h.h1(
                        [
                            h.Class(
                                "mb-8 text-center text-3xl font-bold tracking-tight text-foreground"
                            ),
                        ],
                        ["Todo App"]
                    ),

                    h.form(
                        [
                            h.Class("mb-6"),
                            h.OnSubmit(toParentMessage(AddedTodo())),
                        ],
                        [
                            h.label(
                                [h.For("new-todo"), h.Class("sr-only")],
                                ["New todo"]
                            ),
                            h.div(
                                [h.Class("flex gap-3")],
                                [
                                    h.input([
                                        h.Id("new-todo"),
                                        h.Value(model.newTodoText),
                                        h.Placeholder("What needs to be done?"),
                                        h.Class(
                                            "flex-1 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-4 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                                        ),
                                        h.OnInput((text) =>
                                            toParentMessage(
                                                UpdatedNewTodo({ text })
                                            )
                                        ),
                                    ]),
                                    h.button(
                                        [
                                            h.Type("submit"),
                                            h.Class(
                                                "rounded-[var(--radius-control)] bg-primary px-6 py-2 text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                            ),
                                        ],
                                        ["Add"]
                                    ),
                                ]
                            ),
                        ]
                    ),

                    Arr.match(filteredTodos, {
                        onEmpty: () =>
                            h.div(
                                [
                                    h.Class(
                                        "py-8 text-center text-muted-foreground"
                                    ),
                                ],
                                [
                                    M.value(model.filter).pipe(
                                        M.when(
                                            "All",
                                            () => "No todos yet. Add one above!"
                                        ),
                                        M.when(
                                            "Active",
                                            () => "No active todos"
                                        ),
                                        M.when(
                                            "Completed",
                                            () => "No completed todos"
                                        ),
                                        M.exhaustive
                                    ),
                                ]
                            ),
                        onNonEmpty: (todos) =>
                            h.ul(
                                [h.Class("mb-6 space-y-2")],
                                Arr.map(todos, todoItemView)
                            ),
                    }),

                    footerView(activeCount, completedCount),
                ]
            ),
        ]
    )
}
