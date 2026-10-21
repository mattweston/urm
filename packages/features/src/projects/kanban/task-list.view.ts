import * as Array from "effect/Array"
import * as Option from "effect/Option"
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

/** Stable drag-and-drop container identifier for project tasks. */
export const PROJECT_TASK_LIST_ID = "project-task-list"

export type TaskItem = Readonly<{
    title: string
    status: "active" | "done"
}>

type Props<
    ParentMessage,
    Task extends TaskItem,
    TaskId extends string,
> = Readonly<{
    can_write?: boolean
    tasks: ReadonlyArray<Task>
    toTaskId: (task: Task) => TaskId
    drag_and_drop: Ui.DragAndDrop.Model
    new_task_title: string
    task_filter: "All" | "Active" | "Completed"
    editing_task: Option.Option<Readonly<{ task_id: TaskId; title: string }>>
    onTaskTitleInput: (value: string) => ParentMessage
    onSubmitTask: ParentMessage
    onSetTaskStatus: (
        task_id: TaskId,
        status: "active" | "done"
    ) => ParentMessage
    onEditTask: (task_id: TaskId) => ParentMessage
    onEditingTaskTitleInput: (value: string) => ParentMessage
    onSubmitEditingTask: ParentMessage
    onCancelEditingTask: ParentMessage
    onDeleteTask: (task_id: TaskId) => ParentMessage
    onSelectTaskFilter: (
        filter: "All" | "Active" | "Completed"
    ) => ParentMessage
    onToggleAllTasks: ParentMessage
    onClearCompletedTasks: ParentMessage
    toDragAndDropMessage: (message: Ui.DragAndDrop.Message) => ParentMessage
    renderTaskMeta?: (task: Task) => Html
    renderEditingTaskMeta?: (task: Task) => Html
}>

const icon = <ParentMessage>(
    paths: ReadonlyArray<string>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.svg(
        [
            h.AriaHidden(true),
            h.Class("size-4"),
            h.Xmlns("http://www.w3.org/2000/svg"),
            h.Fill("none"),
            h.Stroke("currentColor"),
            h.StrokeWidth("2"),
            h.StrokeLinecap("round"),
            h.StrokeLinejoin("round"),
            h.ViewBox("0 0 24 24"),
        ],
        Array.map(paths, (path) => h.path([h.D(path)], []))
    )

const grip_handle = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.span(
        [
            h.Class(
                "shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
            ),
        ],
        [
            h.svg(
                [
                    h.AriaHidden(true),
                    h.Class("size-4"),
                    h.Xmlns("http://www.w3.org/2000/svg"),
                    h.Fill("none"),
                    h.Stroke("currentColor"),
                    h.StrokeWidth("2"),
                    h.StrokeLinecap("round"),
                    h.StrokeLinejoin("round"),
                    h.ViewBox("0 0 24 24"),
                ],
                [
                    h.circle([h.Cx("9"), h.Cy("5"), h.R("1")], []),
                    h.circle([h.Cx("9"), h.Cy("12"), h.R("1")], []),
                    h.circle([h.Cx("9"), h.Cy("19"), h.R("1")], []),
                    h.circle([h.Cx("15"), h.Cy("5"), h.R("1")], []),
                    h.circle([h.Cx("15"), h.Cy("12"), h.R("1")], []),
                    h.circle([h.Cx("15"), h.Cy("19"), h.R("1")], []),
                ]
            ),
        ]
    )

export const taskListView = <
    ParentMessage,
    Task extends TaskItem,
    TaskId extends string,
>(
    props: Props<ParentMessage, Task, TaskId>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const task_id = (task: Task): TaskId => props.toTaskId(task)
    const icon_button = (
        on_click: ParentMessage,
        aria_label: string,
        class_name: string,
        content: Html
    ): Html =>
        h.button(
            [
                h.Type("button"),
                h.Disabled(props.can_write === false),
                h.OnClick(on_click),
                h.AriaLabel(aria_label),
                h.Class(
                    `flex size-8 items-center justify-center rounded border transition-colors hover:bg-accent hover:text-accent-foreground ${class_name}`
                ),
            ],
            [content]
        )

    const item_class_name = (task: Task): string => {
        const is_dragged = Option.contains(
            Ui.DragAndDrop.maybeDraggedItemId(props.drag_and_drop),
            task_id(task)
        )

        if (props.drag_and_drop.dragState._tag === "Dragging" && is_dragged) {
            return "flex items-center gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border bg-muted p-2 opacity-50 outline-none"
        }
        if (
            props.drag_and_drop.dragState._tag === "KeyboardDragging" &&
            is_dragged
        ) {
            return "flex items-center gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-primary bg-card p-2 outline-none [box-shadow:var(--shadow-surface)]"
        }

        return "group flex cursor-grab select-none items-center gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 outline-none [box-shadow:var(--shadow-surface)] focus:border-ring"
    }

    const editing_row = (task: Task, title: string): Html =>
        h.keyed("li")(
            task_id(task),
            [
                h.Class(
                    "flex flex-col items-stretch gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 text-card-foreground outline-none [box-shadow:var(--shadow-surface)]"
                ),
            ],
            [
                h.div(
                    [h.Class("flex w-full items-center gap-3")],
                    [
                        h.input([
                            h.Type("text"),
                            h.Id(`edit-task-${task_id(task)}`),
                            h.Disabled(props.can_write === false),
                            h.AriaLabel("Edit task"),
                            h.Value(title),
                            h.Class(
                                "min-w-0 flex-1 rounded border-(length:--surface-border-width) border-border bg-background px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            ),
                            h.OnInput(props.onEditingTaskTitleInput),
                            h.OnKeyDownPreventDefault((key) =>
                                key === "Enter"
                                    ? Option.some(props.onSubmitEditingTask)
                                    : key === "Escape"
                                      ? Option.some(props.onCancelEditingTask)
                                      : Option.none()
                            ),
                        ]),
                        icon_button(
                            props.onSubmitEditingTask,
                            "Save",
                            "border-primary/30 text-primary hover:bg-primary/10",
                            icon(["M5 12l5 5l10 -10"], h)
                        ),
                        icon_button(
                            props.onCancelEditingTask,
                            "Cancel",
                            "border-border text-muted-foreground",
                            icon(["M18 6l-12 12", "M6 6l12 12"], h)
                        ),
                    ]
                ),
                ...(props.renderEditingTaskMeta === undefined
                    ? []
                    : [
                          h.div(
                              [
                                  h.Class(
                                      "w-full border-t-(length:--surface-border-width) border-border pt-3"
                                  ),
                              ],
                              [props.renderEditingTaskMeta(task)]
                          ),
                      ]),
            ]
        )

    const non_editing_row = (task: Task, index: number): Html =>
        h.keyed("li")(
            task_id(task),
            [
                h.Class(item_class_name(task)),
                ...(props.can_write === false
                    ? []
                    : Ui.DragAndDrop.draggable<ParentMessage>(
                          {
                              model: props.drag_and_drop,
                              toParentMessage: props.toDragAndDropMessage,
                              itemId: task_id(task),
                              containerId: PROJECT_TASK_LIST_ID,
                              index,
                          },
                          h
                      )),
                ...Ui.DragAndDrop.sortable(task_id(task)),
            ],
            [
                grip_handle(h),
                h.input([
                    h.Type("checkbox"),
                    h.Disabled(props.can_write === false),
                    h.Id(`task-${task_id(task)}`),
                    h.AriaLabel(task.title),
                    h.Checked(task.status === "done"),
                    h.Class(
                        "size-4 shrink-0 rounded border-border bg-background text-primary accent-primary focus:ring-ring"
                    ),
                    h.OnClick(
                        props.onSetTaskStatus(
                            task_id(task),
                            task.status === "done" ? "active" : "done"
                        )
                    ),
                ]),
                h.label(
                    [
                        h.For(`task-${task_id(task)}`),
                        h.Class(
                            `flex-1 cursor-pointer select-none ${task.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`
                        ),
                        ...(props.can_write === false
                            ? []
                            : [h.OnClick(props.onEditTask(task_id(task)))]),
                    ],
                    [task.title]
                ),
                ...(props.renderTaskMeta === undefined
                    ? []
                    : [props.renderTaskMeta(task)]),
                icon_button(
                    props.onEditTask(task_id(task)),
                    "Edit",
                    "border-border text-muted-foreground hover:text-foreground",
                    icon(
                        [
                            "M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z",
                            "m15 5 4 4",
                        ],
                        h
                    )
                ),
                icon_button(
                    props.onDeleteTask(task_id(task)),
                    `Delete ${task.title}`,
                    "border-border text-destructive hover:bg-destructive/10",
                    icon(
                        [
                            "M10 11v6",
                            "M14 11v6",
                            "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
                            "M3 6h18",
                            "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
                        ],
                        h
                    )
                ),
            ]
        )

    const task_row = (task: Task, index: number): Html =>
        Option.match(props.editing_task, {
            onNone: () => non_editing_row(task, index),
            onSome: ({ task_id, title }) =>
                task_id === props.toTaskId(task)
                    ? editing_row(task, title)
                    : non_editing_row(task, index),
        })

    const filtered_tasks =
        props.task_filter === "All"
            ? props.tasks
            : Array.filter(props.tasks, (task) =>
                  props.task_filter === "Active"
                      ? task.status === "active"
                      : task.status === "done"
              )
    const is_dragged = (task: Task): boolean =>
        Option.exists(
            Ui.DragAndDrop.maybeDraggedItemId(props.drag_and_drop),
            (task_id) =>
                task_id === props.toTaskId(task) &&
                Ui.DragAndDrop.isDragging(props.drag_and_drop)
        )
    const visible_tasks = Array.filter(
        filtered_tasks,
        (task) => !is_dragged(task)
    )
    const task_elements = Array.map(visible_tasks, (task) =>
        task_row(
            task,
            Array.findFirstIndex(
                props.tasks,
                (candidate) => task_id(candidate) === task_id(task)
            ).pipe(Option.getOrElse(() => 0))
        )
    )
    const elements_with_placeholder = Option.match(
        Ui.DragAndDrop.maybeDropTarget(props.drag_and_drop),
        {
            onNone: () => task_elements,
            onSome: (target) => {
                if (
                    target.containerId !== PROJECT_TASK_LIST_ID ||
                    !Ui.DragAndDrop.isDragging(props.drag_and_drop)
                ) {
                    return task_elements
                }

                const placeholder = h.li(
                    [
                        h.Class(
                            "h-12 list-none rounded-md border-2 border-dashed border-primary/30 bg-primary/5"
                        ),
                        h.AriaHidden(true),
                    ],
                    []
                )
                return Option.getOrElse(
                    Array.insertAt(
                        task_elements,
                        Math.min(target.index, task_elements.length),
                        placeholder
                    ),
                    () => [...task_elements, placeholder]
                )
            },
        }
    )
    const ghost = Option.match(Ui.DragAndDrop.ghostStyle(props.drag_and_drop), {
        onNone: () => h.empty,
        onSome: (ghost_style) =>
            Option.match(
                Option.flatMap(
                    Ui.DragAndDrop.maybeDraggedItemId(props.drag_and_drop),
                    (task_id) =>
                        Array.findFirst(
                            props.tasks,
                            (task) => props.toTaskId(task) === task_id
                        )
                ),
                {
                    onNone: () => h.empty,
                    onSome: (task) =>
                        h.div(
                            [
                                h.Style(ghost_style),
                                h.Class(
                                    "scale-105 rotate-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-3 text-card-foreground [box-shadow:var(--shadow-overlay)]"
                                ),
                            ],
                            [task.title]
                        ),
                }
            ),
    })
    const active_count = Array.filter(
        props.tasks,
        (task) => task.status === "active"
    ).length
    const completed_count = props.tasks.length - active_count
    const filter_button = (filter: "All" | "Active" | "Completed"): Html =>
        h.button(
            [
                h.Type("button"),
                h.OnClick(props.onSelectTaskFilter(filter)),
                h.Class(
                    props.task_filter === filter
                        ? "rounded bg-primary px-3 py-1 text-primary-foreground"
                        : "rounded bg-muted px-3 py-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                ),
            ],
            [filter]
        )
    const footer =
        props.tasks.length === 0
            ? h.empty
            : h.div(
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
                              `${active_count} active, ${completed_count} completed`,
                          ]
                      ),
                      h.div(
                          [h.Class("flex justify-center gap-2")],
                          [
                              filter_button("All"),
                              filter_button("Active"),
                              filter_button("Completed"),
                          ]
                      ),
                      h.div(
                          [h.Class("flex justify-center gap-2")],
                          [
                              h.button(
                                  [
                                      h.Type("button"),
                                      h.Disabled(props.can_write === false),
                                      h.OnClick(props.onToggleAllTasks),
                                      h.Class(
                                          "rounded border-(length:--control-border-width) border-border bg-muted px-3 py-1 text-sm text-muted-foreground [box-shadow:var(--shadow-control)] hover:bg-accent hover:text-accent-foreground"
                                      ),
                                  ],
                                  [
                                      completed_count === props.tasks.length
                                          ? "Mark all active"
                                          : "Mark all complete",
                                  ]
                              ),
                              completed_count > 0
                                  ? h.button(
                                        [
                                            h.Type("button"),
                                            h.Disabled(
                                                props.can_write === false
                                            ),
                                            h.OnClick(
                                                props.onClearCompletedTasks
                                            ),
                                            h.Class(
                                                "rounded bg-destructive/10 px-3 py-1 text-sm text-destructive hover:bg-destructive/20"
                                            ),
                                        ],
                                        [`Clear ${completed_count} completed`]
                                    )
                                  : h.empty,
                          ]
                      ),
                  ]
              )

    return h.div(
        [],
        [
            h.div(
                [h.Class("p-6")],
                [
                    filtered_tasks.length === 0
                        ? h.div(
                              [
                                  h.Class(
                                      "py-8 text-center text-muted-foreground"
                                  ),
                              ],
                              [
                                  props.task_filter === "All"
                                      ? "No tasks yet. Add one below."
                                      : props.task_filter === "Active"
                                        ? "No active tasks"
                                        : "No completed tasks",
                              ]
                          )
                        : h.keyed("ul")(
                              PROJECT_TASK_LIST_ID,
                              [
                                  h.Class("space-y-2"),
                                  ...Ui.DragAndDrop.droppable(
                                      PROJECT_TASK_LIST_ID,
                                      "Task list"
                                  ),
                              ],
                              elements_with_placeholder
                          ),
                    ghost,
                    footer,
                ]
            ),
            h.div(
                [
                    h.Class(
                        "border-t-(length:--surface-border-width) border-border p-6"
                    ),
                ],
                [
                    h.fieldset(
                        [
                            h.Disabled(props.can_write === false),
                            h.Class("contents"),
                        ],
                        [
                            h.form(
                                [
                                    h.Class("flex w-full gap-2"),
                                    h.OnSubmit(props.onSubmitTask),
                                ],
                                [
                                    h.label(
                                        [
                                            h.For("new-project-task"),
                                            h.Class("sr-only"),
                                        ],
                                        ["New task"]
                                    ),
                                    h.input([
                                        h.Id("new-project-task"),
                                        h.Value(props.new_task_title),
                                        h.Placeholder("Add a task"),
                                        h.Class(
                                            "flex-1 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        ),
                                        h.OnInput(props.onTaskTitleInput),
                                    ]),
                                    h.button(
                                        [
                                            h.Type("submit"),
                                            h.Class(
                                                "flex items-center gap-2 rounded-[var(--radius-control)] border-(length:--control-border-width) border-border bg-primary px-4 py-2 text-primary-foreground [box-shadow:var(--shadow-primary)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
                                            ),
                                        ],
                                        [
                                            icon(["M12 5v14", "M5 12h14"], h),
                                            "Add",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}
