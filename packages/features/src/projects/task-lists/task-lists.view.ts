import { Array, Equal, Option, flow, pipe } from "effect"
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { TodoList } from "@urm/domain/schemas/tasks"
import {
    CancelledNewTaskList,
    ChangedNewTaskListTitle,
    ClickedDeleteTaskList,
    ConfirmedDeleteTaskList,
    GotDeleteConfirmationDialogMessage,
    ClickedAddTaskList,
    GotDragAndDropMessage,
    MovedTaskListForward,
    SubmittedNewTaskList,
    type ViewMessage,
} from "./task-lists.message.ts"
import type { Model, TaskListStatus } from "./task-lists.model.ts"
import { taskListInputId } from "./task-lists.constant.ts"
import {
    IconArrowRight,
    IconGripVertical,
    IconTrash,
} from "@urm/ui/foldkit/icons/view.ts"

const COLUMNS: ReadonlyArray<{
    status: TaskListStatus
    label: string
}> = [
    { status: "backlog", label: "To Do" },
    { status: "active", label: "In progress" },
    { status: "done", label: "Done" },
]

const nextStatusLabel = (status: TaskListStatus): string =>
    status === "backlog"
        ? "In progress"
        : status === "active"
          ? "Done"
          : "To Do"

const cardClassName = (model: Model, list_id: string): string => {
    const is_this_list_dragged = Option.exists(
        Ui.DragAndDrop.maybeDraggedItemId(model.dragAndDrop),
        (id) => id === list_id
    )
    const is_pointer_dragged =
        model.dragAndDrop.dragState._tag === "Dragging" && is_this_list_dragged
    const is_keyboard_dragged =
        model.dragAndDrop.dragState._tag === "KeyboardDragging" &&
        is_this_list_dragged

    if (is_pointer_dragged) {
        return "rounded-[var(--radius-surface)] p-3 border-2 outline-none bg-muted border-dashed border-border opacity-50"
    }

    if (is_keyboard_dragged) {
        return "rounded-[var(--radius-surface)] p-3 border-2 outline-none bg-card [box-shadow:var(--shadow-surface)] border-primary"
    }

    return "rounded-[var(--radius-surface)] p-3 border-(length:--surface-border-width) outline-none bg-card [box-shadow:var(--shadow-surface)] select-none border-border/60 focus:border-primary cursor-grab"
}

const listCardContent = <ParentMessage>(
    list: TodoList,
    href: string,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> => [
    h.a(
        [
            h.Href(href),
            h.Class(
                "block cursor-pointer text-sm font-medium text-foreground hover:underline"
            ),
        ],
        [list.title]
    ),
    h.div(
        [h.Class("mt-1 text-xs text-muted-foreground line-clamp-2")],
        ["Open todo list"]
    ),
]

const listCardView = <ParentMessage>(
    model: Model,
    list: TodoList,
    index: number,
    href: string,
    toParentMessage: (message: ViewMessage) => ParentMessage,
    renderListMeta: ((list: TodoList) => Html) | undefined,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("li")(
        list.id,
        [
            h.Class(cardClassName(model, list.id)),
            ...(model.can_write === false
                ? []
                : Ui.DragAndDrop.draggable(
                      {
                          model: model.dragAndDrop,
                          toParentMessage: (message) =>
                              toParentMessage(
                                  GotDragAndDropMessage({ message })
                              ),
                          itemId: list.id,
                          containerId: list.status,
                          index,
                      },
                      h
                  )),
            ...Ui.DragAndDrop.sortable(list.id),
        ],
        [
            h.div(
                [h.Class("flex min-h-7 items-center justify-end")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.Disabled(model.can_write === false),
                            h.AriaLabel(`Drag ${list.title}`),
                            h.Class(
                                "grid size-7 touch-none cursor-grab place-items-center rounded-[var(--radius-surface)] text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
                            ),
                        ],
                        [IconGripVertical({ class: "size-4" })]
                    ),
                ]
            ),
            ...listCardContent(list, href, h),
            ...(renderListMeta === undefined ? [] : [renderListMeta(list)]),
            h.div(
                [
                    h.Class(
                        "mt-3 flex items-center justify-end gap-2 border-t-(length:--surface-border-width) border-border/60 pt-2.5"
                    ),
                ],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.Disabled(model.can_write === false),
                            h.AriaLabel(`Delete ${list.title}`),
                            h.OnClick(
                                toParentMessage(
                                    ClickedDeleteTaskList({ id: list.id })
                                )
                            ),
                            h.Class(
                                "grid size-7 place-items-center rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted text-destructive hover:bg-destructive/10"
                            ),
                        ],
                        [IconTrash({ class: "size-3.5" })]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Disabled(model.can_write === false),
                            h.AriaLabel(
                                `Move ${list.title} forward to ${nextStatusLabel(list.status)}`
                            ),
                            h.OnClick(
                                toParentMessage(
                                    MovedTaskListForward({ id: list.id })
                                )
                            ),
                            h.Class(
                                "grid size-7 place-items-center rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted text-muted-foreground hover:border-primary hover:text-primary"
                            ),
                        ],
                        [IconArrowRight({ class: "size-3.5" })]
                    ),
                ]
            ),
        ]
    )
}

const ghostListCardView = <ParentMessage>(
    list: TodoList,
    href: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] bg-card text-card-foreground [box-shadow:var(--shadow-overlay)] p-3 border-(length:--surface-border-width) border-border scale-105 rotate-2"
            ),
        ],
        listCardContent(list, href, h)
    )

const dropPlaceholder = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.keyed("li")(
        "drop-placeholder",
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-2 border-dashed border-primary/40 bg-primary/10 h-12"
            ),
            h.AriaHidden(true),
        ],
        []
    )

const addListView = <ParentMessage>(
    model: Model,
    status: TaskListStatus,
    toParentMessage: (message: ViewMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    if (model.can_write === false) return h.empty
    const is_adding = Option.exists(
        model.maybeNewListStatus,
        (selected_status) => selected_status === status
    )

    if (!is_adding) {
        return h.keyed("div")(
            "idle",
            [],
            [
                Ui.Button.view(
                    {
                        onClick: toParentMessage(
                            ClickedAddTaskList({ status })
                        ),
                        toView: (attributes) =>
                            h.button(
                                [
                                    ...attributes.button,
                                    h.Class(
                                        "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border p-2 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors cursor-pointer"
                                    ),
                                ],
                                ["+ Add list"]
                            ),
                    },
                    h
                ),
            ]
        )
    }

    return h.keyed("div")(
        "adding",
        [],
        [
            h.form(
                [
                    h.Class("flex flex-col gap-2"),
                    h.OnSubmit(toParentMessage(SubmittedNewTaskList())),
                ],
                [
                    h.label(
                        [h.For(taskListInputId(status)), h.Class("sr-only")],
                        ["New task list title"]
                    ),
                    Ui.Input.view(
                        {
                            id: taskListInputId(status),
                            value: model.newListTitle,
                            placeholder: "List title...",
                            onInput: (value) =>
                                toParentMessage(
                                    ChangedNewTaskListTitle({ value })
                                ),
                            toView: (attributes) =>
                                h.input([
                                    ...attributes.input,
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                                    ),
                                    h.OnKeyDownPreventDefault(
                                        flow(
                                            Option.liftPredicate(
                                                Equal.equals("Escape")
                                            ),
                                            Option.map(() =>
                                                toParentMessage(
                                                    CancelledNewTaskList()
                                                )
                                            )
                                        )
                                    ),
                                ]),
                        },
                        h
                    ),
                    h.div(
                        [h.Class("flex gap-2 justify-end")],
                        [
                            Ui.Button.view(
                                {
                                    onClick: toParentMessage(
                                        CancelledNewTaskList()
                                    ),
                                    toView: (attributes) =>
                                        h.button(
                                            [
                                                ...attributes.button,
                                                h.Class(
                                                    "rounded-[var(--radius-control)] px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                                                ),
                                            ],
                                            ["Cancel"]
                                        ),
                                },
                                h
                            ),
                            Ui.Button.view(
                                {
                                    type: "submit",
                                    toView: (attributes) =>
                                        h.button(
                                            [
                                                ...attributes.button,
                                                h.Class(
                                                    "rounded-[var(--radius-control)] bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                                ),
                                            ],
                                            ["Add"]
                                        ),
                                },
                                h
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const findDraggedList = (
    model: Model,
    dragged_id: string
): Option.Option<TodoList> =>
    pipe(
        model.lists,
        Array.findFirst((list) => list.id === dragged_id)
    )

const defaultListElements = <ParentMessage>(
    model: Model,
    lists: ReadonlyArray<TodoList>,
    listHref: (slug: string) => string,
    toParentMessage: (message: ViewMessage) => ParentMessage,
    renderListMeta: ((list: TodoList) => Html) | undefined,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    Array.map(lists, (list, index) =>
        listCardView(
            model,
            list,
            index,
            listHref(list.slug),
            toParentMessage,
            renderListMeta,
            h
        )
    )

const previewListElements = <ParentMessage>(
    model: Model,
    status: TaskListStatus,
    lists: ReadonlyArray<TodoList>,
    listHref: (slug: string) => string,
    toParentMessage: (message: ViewMessage) => ParentMessage,
    renderListMeta: ((list: TodoList) => Html) | undefined,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> => {
    if (!Ui.DragAndDrop.isDragging(model.dragAndDrop)) {
        return defaultListElements(
            model,
            lists,
            listHref,
            toParentMessage,
            renderListMeta,
            h
        )
    }

    return Option.match(Ui.DragAndDrop.maybeDraggedItemId(model.dragAndDrop), {
        onNone: () =>
            defaultListElements(
                model,
                lists,
                listHref,
                toParentMessage,
                renderListMeta,
                h
            ),
        onSome: (dragged_id) => {
            const maybe_target = Ui.DragAndDrop.maybeDropTarget(
                model.dragAndDrop
            )
            const visible_lists = Array.filter(
                lists,
                (list) => list.id !== dragged_id
            )
            const list_elements = defaultListElements(
                model,
                visible_lists,
                listHref,
                toParentMessage,
                renderListMeta,
                h
            )

            if (
                !Option.exists(
                    maybe_target,
                    (target) => target.containerId === status
                )
            ) {
                return list_elements
            }

            const target_index = Option.match(maybe_target, {
                onNone: () => visible_lists.length,
                onSome: (target) =>
                    Math.min(target.index, visible_lists.length),
            })
            const insert_element =
                model.dragAndDrop.dragState._tag === "Dragging"
                    ? dropPlaceholder(h)
                    : Option.match(findDraggedList(model, dragged_id), {
                          onNone: () => dropPlaceholder(h),
                          onSome: (list) =>
                              listCardView(
                                  model,
                                  list,
                                  target_index,
                                  listHref(list.slug),
                                  toParentMessage,
                                  renderListMeta,
                                  h
                              ),
                      })

            return pipe(
                list_elements,
                Array.insertAt(target_index, insert_element),
                Option.getOrElse(() => [...list_elements, insert_element])
            )
        },
    })
}

const columnView = <ParentMessage>(
    model: Model,
    status: TaskListStatus,
    label: string,
    listHref: (slug: string) => string,
    toParentMessage: (message: ViewMessage) => ParentMessage,
    renderListMeta: ((list: TodoList) => Html) | undefined,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const lists = Array.filter(model.lists, (list) => list.status === status)
    const is_drop_target =
        Ui.DragAndDrop.isDragging(model.dragAndDrop) &&
        Option.exists(
            Ui.DragAndDrop.maybeDropTarget(model.dragAndDrop),
            (target) => target.containerId === status
        )

    return h.keyed("div")(
        status,
        [
            h.Role("region"),
            h.AriaLabel(label),
            h.Class(
                is_drop_target
                    ? "flex min-h-[530px] min-w-[230px] flex-col rounded-[var(--radius-surface)] border-2 border-dashed border-primary bg-card/70 p-2.5 text-card-foreground"
                    : "flex min-h-[530px] min-w-[230px] flex-col rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border/60 bg-card/70 p-2.5 text-card-foreground"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-center justify-between gap-3 px-1 pb-3")],
                [
                    h.h2(
                        [h.Class("text-[13px] font-semibold text-foreground")],
                        [label]
                    ),
                    h.span(
                        [h.Class("text-xs text-muted-foreground")],
                        [`${lists.length}`]
                    ),
                ]
            ),
            h.ul(
                [
                    h.Class(
                        "flex flex-col gap-2 flex-1 overflow-y-auto min-h-0"
                    ),
                    ...Ui.DragAndDrop.droppable(status, label),
                ],
                previewListElements(
                    model,
                    status,
                    lists,
                    listHref,
                    toParentMessage,
                    renderListMeta,
                    h
                )
            ),
            h.div(
                [h.Class("mt-3 border-t border-border pt-3")],
                [addListView(model, status, toParentMessage, h)]
            ),
        ]
    )
}

const ghostElement = <ParentMessage>(
    model: Model,
    listHref: (slug: string) => string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    pipe(
        Ui.DragAndDrop.ghostStyle(model.dragAndDrop),
        Option.flatMap((ghost_style) =>
            pipe(
                Ui.DragAndDrop.maybeDraggedItemId(model.dragAndDrop),
                Option.flatMap((id) => findDraggedList(model, id)),
                Option.map((list) => ({ ghost_style, list }))
            )
        ),
        Option.match({
            onNone: () => h.empty,
            onSome: ({ ghost_style, list }) =>
                h.div(
                    [h.Style(ghost_style), h.Class("w-64"), h.AriaHidden(true)],
                    [ghostListCardView(list, listHref(list.slug), h)]
                ),
        })
    )

export const deleteConfirmationView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: ViewMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const pending_list = model.lists.find(
        (list) => list.id === model.pendingDeleteListId
    )

    return h.submodel({
        slotId: model.deleteConfirmationDialog.id,
        model: model.deleteConfirmationDialog,
        view: Ui.Dialog.view,
        viewInputs: {
            toView: (render) =>
                h.dialog(
                    [
                        ...render.dialog,
                        h.Class(
                            "backdrop:bg-black/50 bg-transparent p-0 open:flex items-center justify-center"
                        ),
                    ],
                    render.isVisible
                        ? [
                              h.div(
                                  [
                                      ...render.backdrop,
                                      h.Class("fixed inset-0 bg-black/50"),
                                  ],
                                  []
                              ),
                              h.div(
                                  [
                                      ...render.panel,
                                      h.Class(
                                          "relative z-10 w-full max-w-md rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-overlay)]"
                                      ),
                                  ],
                                  [
                                      h.h2(
                                          [
                                              h.Id(
                                                  Ui.Dialog.titleId(
                                                      model.deleteConfirmationDialog
                                                  )
                                              ),
                                              h.Class(
                                                  "text-xl font-semibold text-foreground"
                                              ),
                                          ],
                                          ["Delete project"]
                                      ),
                                      h.p(
                                          [
                                              h.Class(
                                                  "mt-2 text-sm text-muted-foreground"
                                              ),
                                          ],
                                          [
                                              `Delete ${pending_list?.title ?? "this project"} and all of its todos? This cannot be undone.`,
                                          ]
                                      ),
                                      h.div(
                                          [
                                              h.Class(
                                                  "mt-6 flex justify-end gap-2"
                                              ),
                                          ],
                                          [
                                              h.button(
                                                  [
                                                      ...render.closeButton,
                                                      h.Class(
                                                          "inline-flex h-10 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                                      ),
                                                  ],
                                                  ["Cancel"]
                                              ),
                                              h.button(
                                                  [
                                                      h.Type("button"),
                                                      h.OnClick(
                                                          toParentMessage(
                                                              ConfirmedDeleteTaskList()
                                                          )
                                                      ),
                                                      h.Class(
                                                          "inline-flex h-10 items-center rounded-[var(--radius-control)] border-(length:--control-border-width) border-border bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 [box-shadow:var(--shadow-control)]"
                                                      ),
                                                  ],
                                                  ["Delete"]
                                              ),
                                          ]
                                      ),
                                  ]
                              ),
                          ]
                        : []
                ),
        },
        toParentMessage: (message) =>
            toParentMessage(GotDeleteConfirmationDialogMessage({ message })),
    })
}

export const view = <ParentMessage>(
    model: Model,
    listHref: (slug: string) => string,
    toParentMessage: (message: ViewMessage) => ParentMessage,
    renderListMeta: ((list: TodoList) => Html) | undefined,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "mx-auto flex min-h-full w-full max-w-[1600px] flex-col gap-6 bg-background p-6 text-foreground"
            ),
        ],
        [
            h.div(
                [h.Class("space-y-1")],
                [
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-semibold tracking-tight text-foreground"
                            ),
                        ],
                        ["Projects"]
                    ),
                    h.p(
                        [h.Class("mt-1 text-sm text-muted-foreground")],
                        [
                            "Organize projects, then open one to manage its todos.",
                        ]
                    ),
                ]
            ),
            ...(model.error === ""
                ? []
                : [
                      h.p(
                          [h.Class("mx-6 mt-4 text-sm text-destructive")],
                          [model.error]
                      ),
                  ]),
            ...(!model.loaded
                ? [
                      h.p(
                          [h.Class("text-sm text-muted-foreground")],
                          ["Loading projects..."]
                      ),
                  ]
                : []),
            h.div(
                [
                    h.Class(
                        "grid flex-1 grid-cols-[repeat(3,minmax(230px,1fr))] items-start gap-3 overflow-x-auto bg-background pb-3"
                    ),
                ],
                Array.map(COLUMNS, ({ status, label }) =>
                    columnView(
                        model,
                        status,
                        label,
                        listHref,
                        toParentMessage,
                        renderListMeta,
                        h
                    )
                )
            ),
            ghostElement(model, listHref, h),
            deleteConfirmationView(model, toParentMessage, h),
            h.div(
                [h.Class("sr-only"), h.AriaLive("assertive")],
                [model.announcement]
            ),
        ]
    )
