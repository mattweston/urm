import * as Array from "effect/Array"
import { Effect, Match as M, Option, Order, Schema as S, String } from "effect"
import { Command, Submodel, Subscription as FoldkitSubscription } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"
import * as Ui from "@foldkit/ui"

import {
    ProjectRecord as Project,
    TaskRecord as Task,
    ProjectId,
    TaskId,
    ProjectName,
    TaskTitle,
    TaskStatus,
} from "@urm/domain/projects"
type DomainId = string
const TagId = S.String

import {
    PROJECT_TASK_LIST_ID,
    taskListView,
} from "@urm/features/projects/kanban/task-list.view"
import * as ProjectTaskLists from "@urm/features/projects/task-lists"
import { Button } from "@urm/ui/foldkit/button/button.view.ts"
import { IconCheck } from "@urm/ui/foldkit/icons/view.ts"

import { DesktopRoute, projectHref, projectsHref } from "../routing/route.ts"

export const ProjectStatus = S.Literals(["backlog", "active", "done"])
export type ProjectStatus = typeof ProjectStatus.Type

const EditingTask = S.Struct({
    task_id: TaskId,
    title: S.String,
})
const TaskFilter = S.Literals(["All", "Active", "Completed"])
const EditingProject = S.Struct({ project_id: ProjectId, name: S.String })
export const Model = S.Struct({
    can_write: S.optionalKey(S.Boolean),
    route: DesktopRoute,
    projects: S.Array(Project),
    tasks: S.Array(Task),
    selected_project_id: S.Option(ProjectId),
    opened_project_id: S.Option(ProjectId),
    new_project_name: S.String,
    new_project_status: S.Option(ProjectStatus),
    new_task_title: S.String,
    editing_task: S.Option(EditingTask),
    editing_project: S.Option(EditingProject),
    saving_project: S.Boolean,
    task_filter: TaskFilter,
    pending_delete_project_id: S.Option(ProjectId),
    delete_project_dialog: Ui.Dialog.Model,
    project_announcement: S.String,
    maybe_error: S.Option(S.String),
    project_drag_and_drop: Ui.DragAndDrop.Model,
    task_drag_and_drop: Ui.DragAndDrop.Model,
})
export type Model = typeof Model.Type

export const ReceivedProjects = taggedStruct("ReceivedProjects", {
    projects: S.Array(Project),
})
export const ReceivedTasks = taggedStruct("ReceivedTasks", {
    tasks: S.Array(Task),
})
export const FailedData = taggedStruct("FailedData", { details: S.String })
export const ClickedAddProject = taggedStruct("ClickedAddProject", {
    status: ProjectStatus,
})
export const CancelledNewProject = taggedStruct("CancelledNewProject")
export const ChangedNewProjectName = taggedStruct("ChangedNewProjectName", {
    value: S.String,
})
export const SubmittedNewProject = taggedStruct("SubmittedNewProject", {
    status: ProjectStatus,
})
export const SucceededCreateProject = taggedStruct("SucceededCreateProject", {
    project_id: ProjectId,
})
export const ClickedSetProjectStatus = taggedStruct("ClickedSetProjectStatus", {
    project_id: ProjectId,
    status: ProjectStatus,
})
export const GotProjectDragAndDropMessage = taggedStruct(
    "GotProjectDragAndDropMessage",
    {
        message: Ui.DragAndDrop.Message,
    }
)
export const SucceededReorderProjects = taggedStruct("SucceededReorderProjects")
export const ClickedDeleteProject = taggedStruct("ClickedDeleteProject", {
    project_id: ProjectId,
})
export const ClickedEditProject = taggedStruct("ClickedEditProject", {
    project_id: ProjectId,
})
export const ChangedProjectName = taggedStruct("ChangedProjectName", {
    value: S.String,
})
export const SubmittedProjectName = taggedStruct("SubmittedProjectName")
export const CancelledProjectName = taggedStruct("CancelledProjectName")
export const SucceededRenameProject = taggedStruct("SucceededRenameProject", {
    project: Project,
})
export const FailedRenameProject = taggedStruct("FailedRenameProject", {
    details: S.String,
})
export const GotDeleteProjectDialogMessage = taggedStruct(
    "GotDeleteProjectDialogMessage",
    { message: Ui.Dialog.Message }
)
export const ConfirmedDeleteProject = taggedStruct("ConfirmedDeleteProject")
export const SucceededDeleteProject = taggedStruct("SucceededDeleteProject", {
    project_id: ProjectId,
})
export const GotTaskDragAndDropMessage = taggedStruct(
    "GotTaskDragAndDropMessage",
    {
        message: Ui.DragAndDrop.Message,
    }
)
export const SucceededReorderTasks = taggedStruct("SucceededReorderTasks")
export const ChangedNewTaskTitle = taggedStruct("ChangedNewTaskTitle", {
    value: S.String,
})
export const SubmittedNewTask = taggedStruct("SubmittedNewTask")
export const SucceededCreateTask = taggedStruct("SucceededCreateTask", {
    task_id: TaskId,
})
export const ClickedSetTaskStatus = taggedStruct("ClickedSetTaskStatus", {
    task_id: TaskId,
    status: S.Literals(["active", "done"]),
})
export const SucceededSetTaskStatus = taggedStruct("SucceededSetTaskStatus")
export const ClickedEditTask = taggedStruct("ClickedEditTask", {
    task_id: TaskId,
})
export const ChangedEditingTaskTitle = taggedStruct("ChangedEditingTaskTitle", {
    value: S.String,
})
export const SubmittedEditingTask = taggedStruct("SubmittedEditingTask")
export const CancelledEditingTask = taggedStruct("CancelledEditingTask")
export const SucceededUpdateTaskTitle = taggedStruct("SucceededUpdateTaskTitle")
export const ClickedDeleteTask = taggedStruct("ClickedDeleteTask", {
    task_id: TaskId,
})
export const SucceededDeleteTask = taggedStruct("SucceededDeleteTask")
export const SelectedTaskFilter = taggedStruct("SelectedTaskFilter", {
    filter: TaskFilter,
})
export const ClickedToggleAllTasks = taggedStruct("ClickedToggleAllTasks")
export const SucceededSetAllTaskStatus = taggedStruct(
    "SucceededSetAllTaskStatus"
)
export const ClickedClearCompletedTasks = taggedStruct(
    "ClickedClearCompletedTasks"
)
export const SucceededClearCompletedTasks = taggedStruct(
    "SucceededClearCompletedTasks"
)
export const ChangedEntityTags = taggedStruct("ChangedEntityTags", {
    entity_type: S.Literals(["project", "task"]),
    entity_id: S.String,
    tag_ids: S.Array(TagId),
})
export const SucceededSetEntityTags = taggedStruct("SucceededSetEntityTags")

export const Message = S.Union([
    ReceivedProjects,
    ReceivedTasks,
    FailedData,
    ClickedAddProject,
    CancelledNewProject,
    ChangedNewProjectName,
    SubmittedNewProject,
    SucceededCreateProject,
    ClickedSetProjectStatus,
    GotProjectDragAndDropMessage,
    SucceededReorderProjects,
    ClickedDeleteProject,
    ClickedEditProject,
    ChangedProjectName,
    SubmittedProjectName,
    CancelledProjectName,
    SucceededRenameProject,
    FailedRenameProject,
    GotDeleteProjectDialogMessage,
    ConfirmedDeleteProject,
    SucceededDeleteProject,
    GotTaskDragAndDropMessage,
    SucceededReorderTasks,
    ChangedNewTaskTitle,
    SubmittedNewTask,
    SucceededCreateTask,
    ClickedSetTaskStatus,
    SucceededSetTaskStatus,
    ClickedEditTask,
    ChangedEditingTaskTitle,
    SubmittedEditingTask,
    CancelledEditingTask,
    SucceededUpdateTaskTitle,
    ClickedDeleteTask,
    SucceededDeleteTask,
    SelectedTaskFilter,
    ClickedToggleAllTasks,
    SucceededSetAllTaskStatus,
    ClickedClearCompletedTasks,
    SucceededClearCompletedTasks,
    ChangedEntityTags,
    SucceededSetEntityTags,
])
export type Message = typeof Message.Type

type Commands = ReadonlyArray<Command.Command<Message>>
export type UpdateReturn = readonly [Model, Commands]

export const init = (route: DesktopRoute): Model =>
    Model.make({
        route,
        projects: [],
        tasks: [],
        selected_project_id: Option.none(),
        opened_project_id: Option.none(),
        new_project_name: "",
        new_project_status: Option.none(),
        new_task_title: "",
        editing_task: Option.none(),
        editing_project: Option.none(),
        saving_project: false,
        task_filter: "All",
        pending_delete_project_id: Option.none(),
        delete_project_dialog: Ui.Dialog.init({
            id: "desktop-delete-project",
        }),
        project_announcement: "",
        maybe_error: Option.none(),
        project_drag_and_drop: Ui.DragAndDrop.init({
            id: "desktop-projects-board",
        }),
        task_drag_and_drop: Ui.DragAndDrop.init({
            id: PROJECT_TASK_LIST_ID,
        }),
    })

export const clear = (model: Model): Model => init(model.route)

const CreateProject = Command.define("CreateProject", {
    args: {
        domain_id: S.String,
        name: ProjectName,
        status: ProjectStatus,
        order: S.Finite,
    },
    messages: [FailedData],
    execute: () =>
        Effect.succeed(
            FailedData({ details: "Projects persistence adapter unavailable" })
        ),
})
const RenameProject = Command.define("RenameProject", {
    args: { project_id: ProjectId, name: ProjectName },
    messages: [FailedData],
    execute: () =>
        Effect.succeed(
            FailedData({ details: "Projects persistence adapter unavailable" })
        ),
})
const ReorderProjects = Command.define("ReorderProjects", {
    args: {
        positions: S.Array(
            S.Struct({
                project_id: ProjectId,
                status: ProjectStatus,
                order: S.Finite,
            })
        ).check(S.isMaxLength(50)),
    },
    messages: [FailedData],
    execute: () =>
        Effect.succeed(
            FailedData({ details: "Projects persistence adapter unavailable" })
        ),
})
const DeleteProject = Command.define("DeleteProject", {
    args: { project_id: ProjectId },
    messages: [FailedData],
    execute: () =>
        Effect.succeed(
            FailedData({ details: "Projects persistence adapter unavailable" })
        ),
})
const CreateTask = Command.define("CreateTask", {
    args: { project_id: ProjectId, title: TaskTitle },
    messages: [FailedData],
    execute: () =>
        Effect.succeed(
            FailedData({ details: "Projects persistence adapter unavailable" })
        ),
})
const ReorderTasks = Command.define("ReorderTasks", {
    args: {
        project_id: ProjectId,
        positions: S.Array(
            S.Struct({ task_id: TaskId, order: S.Finite })
        ).check(S.isMaxLength(100)),
    },
    messages: [FailedData],
    execute: () =>
        Effect.succeed(
            FailedData({ details: "Projects persistence adapter unavailable" })
        ),
})
const SetTaskStatus = Command.define("SetTaskStatus", {
    args: { task_id: TaskId, status: TaskStatus },
    messages: [FailedData],
    execute: () =>
        Effect.succeed(
            FailedData({ details: "Projects persistence adapter unavailable" })
        ),
})
const UpdateTaskTitle = Command.define("UpdateTaskTitle", {
    args: { task_id: TaskId, title: TaskTitle },
    messages: [FailedData],
    execute: () =>
        Effect.succeed(
            FailedData({ details: "Projects persistence adapter unavailable" })
        ),
})
const DeleteTask = Command.define("DeleteTask", {
    args: { task_id: TaskId },
    messages: [FailedData],
    execute: () =>
        Effect.succeed(
            FailedData({ details: "Projects persistence adapter unavailable" })
        ),
})
const SetAllTaskStatus = Command.define("SetAllTaskStatus", {
    args: { project_id: ProjectId, status: TaskStatus },
    messages: [FailedData],
    execute: () =>
        Effect.succeed(
            FailedData({ details: "Projects persistence adapter unavailable" })
        ),
})
const ClearCompletedTasks = Command.define("ClearCompletedTasks", {
    args: { project_id: ProjectId },
    messages: [FailedData],
    execute: () =>
        Effect.succeed(
            FailedData({ details: "Projects persistence adapter unavailable" })
        ),
})
const SetEntityTags = Command.define("SetEntityTags", {
    args: {
        domain_id: S.String,
        entity_type: S.Literals(["project", "task"]),
        entity_id: S.String,
        tag_ids: S.Array(S.String).check(S.isMaxLength(50)),
    },
    messages: [FailedData],
    execute: () =>
        Effect.succeed(
            FailedData({ details: "Projects persistence adapter unavailable" })
        ),
})

const first_project_id = (projects: ReadonlyArray<Project>) =>
    Option.map(Array.head(projects), (project) => project.id)

const project_route_slug = (project: Project): string => project.slug

const project_id_for_slug = (
    projects: ReadonlyArray<Project>,
    project_slug: string
): Option.Option<ProjectId> =>
    Option.map(
        Array.findFirst(
            projects,
            (project) => project_route_slug(project) === project_slug
        ),
        (project) => project.id
    )

const selected_project_for_route = (
    projects: ReadonlyArray<Project>,
    route: DesktopRoute
): Option.Option<ProjectId> => {
    switch (route._tag) {
        case "Project":
            return project_id_for_slug(projects, route.project_slug)
        case "Projects":
            return first_project_id(projects)
        case "Dashboard":
        case "Stats":
        case "Marketing":
        case "Shop":
        case "Labs":
        case "Dev":
        case "Learn":
        case "Issues":
        case "Issue":
        case "Tags":
        case "Finance":
        case "Media":
        case "Events":
        case "Mail":
        case "Data":
        case "Content":
        case "Documents":
        case "Web":
        case "Pages":
        case "Blog":
        case "Design":
        case "Forms":
        case "Sysadmin":
        case "Domains":
        case "Social":
        case "Chat":
        case "Settings":
            return Option.none()
    }
}

const opened_project_for_route = (
    projects: ReadonlyArray<Project>,
    route: DesktopRoute
): Option.Option<ProjectId> =>
    route._tag === "Project"
        ? project_id_for_slug(projects, route.project_slug)
        : Option.none()

const is_project_status = (value: string): value is ProjectStatus =>
    value === "backlog" || value === "active" || value === "done"

const reorder_projects = (
    projects: ReadonlyArray<Project>,
    project_id: string,
    target_status: ProjectStatus,
    target_index: number
): ReadonlyArray<Project> =>
    Option.match(
        Array.findFirst(projects, (project) => project.id === project_id),
        {
            onNone: () => projects,
            onSome: (project) => {
                const without_project = Array.filter(
                    projects,
                    (candidate) => candidate.id !== project_id
                )
                const target_projects = Array.filter(
                    without_project,
                    (candidate) => candidate.status === target_status
                )
                const moved_project: Project = {
                    ...project,
                    status: target_status,
                }
                const ordered_target = Option.getOrElse(
                    Array.insertAt(
                        target_projects,
                        target_index,
                        moved_project
                    ),
                    () => [...target_projects, moved_project]
                )

                return Array.flatMap(
                    [
                        "backlog",
                        "active",
                        "done",
                    ] satisfies ReadonlyArray<ProjectStatus>,
                    (status) =>
                        Array.map(
                            status === target_status
                                ? ordered_target
                                : Array.filter(
                                      without_project,
                                      (candidate) => candidate.status === status
                                  ),
                            (candidate, order): Project => ({
                                ...candidate,
                                order,
                            })
                        )
                )
            },
        }
    )

const project_positions = (projects: ReadonlyArray<Project>) =>
    Array.map(projects, (project) => ({
        project_id: project.id,
        status: project.status,
        order: project.order ?? 0,
    }))

const reorder_tasks = (
    tasks: ReadonlyArray<Task>,
    task_id: string,
    target_index: number
): ReadonlyArray<Task> =>
    Option.match(
        Array.findFirst(tasks, (task) => task.id === task_id),
        {
            onNone: () => tasks,
            onSome: (task) => {
                const tasks_without_item = Array.filter(
                    tasks,
                    (candidate) => candidate.id !== task_id
                )
                const ordered_tasks = Option.getOrElse(
                    Array.insertAt(tasks_without_item, target_index, task),
                    () => [...tasks_without_item, task]
                )

                return Array.map(
                    ordered_tasks,
                    (candidate, order): Task => ({
                        ...candidate,
                        order,
                    })
                )
            },
        }
    )

const task_positions = (tasks: ReadonlyArray<Task>) =>
    Array.map(tasks, (task) => ({
        task_id: task.id,
        order: task.order,
    }))

export const changed_route = (model: Model, route: DesktopRoute): Model => {
    const selected_project_id = selected_project_for_route(
        model.projects,
        route
    )
    const keeps_selected_project = Option.match(selected_project_id, {
        onNone: () => false,
        onSome: (project_id) =>
            Option.contains(model.selected_project_id, project_id),
    })

    return modifyFields(model, {
        route: () => route,
        selected_project_id: () => selected_project_id,
        opened_project_id: () =>
            opened_project_for_route(model.projects, route),
        tasks: (tasks) => (keeps_selected_project ? tasks : []),
        editing_task: () => Option.none(),
        editing_project: () => Option.none(),
    })
}

export const update = (
    model: Model,
    message: Message,
    active_domain_id: Option.Option<DomainId>
): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ReceivedProjects: ({ projects }) => [
                modifyFields(model, {
                    projects: () => projects,
                    selected_project_id: () =>
                        selected_project_for_route(projects, model.route),
                    opened_project_id: () =>
                        opened_project_for_route(projects, model.route),
                    maybe_error: () => Option.none(),
                }),
                [],
            ],
            ReceivedTasks: ({ tasks }) => [
                modifyFields(model, {
                    tasks: () => tasks,
                    maybe_error: () => Option.none(),
                }),
                [],
            ],
            FailedData: ({ details }) => [
                modifyFields(model, { maybe_error: () => Option.some(details) }),
                [],
            ],
            ClickedAddProject: ({ status }) => [
                modifyFields(model, {
                    new_project_status: () => Option.some(status),
                    new_project_name: () => "",
                }),
                [],
            ],
            CancelledNewProject: () => [
                modifyFields(model, {
                    new_project_status: () => Option.none(),
                    new_project_name: () => "",
                }),
                [],
            ],
            ChangedNewProjectName: ({ value }) => [
                modifyFields(model, { new_project_name: () => value }),
                [],
            ],
            SubmittedNewProject: ({ status }) => {
                const name = String.trim(model.new_project_name)
                const order = Array.filter(
                    model.projects,
                    (project) => project.status === status
                ).length
                return Option.match(active_domain_id, {
                    onNone: () => [model, []],
                    onSome: (domain_id) =>
                        name.length === 0
                            ? [model, []]
                            : [
                                  model,
                                  [
                                      CreateProject({
                                          domain_id,
                                          name,
                                          order,
                                          status,
                                      }),
                                  ],
                              ],
                })
            },
            SucceededCreateProject: ({ project_id }) => [
                modifyFields(model, {
                    selected_project_id: () => Option.some(project_id),
                    new_project_name: () => "",
                    new_project_status: () => Option.none(),
                    maybe_error: () => Option.none(),
                }),
                [],
            ],
            ClickedSetProjectStatus: ({ project_id, status }) => {
                const projects = reorder_projects(
                    model.projects,
                    project_id,
                    status,
                    Array.filter(
                        model.projects,
                        (project) => project.status === status
                    ).length
                )

                return [
                    modifyFields(model, { projects: () => projects }),
                    [
                        ReorderProjects({
                            positions: project_positions(projects),
                        }),
                    ],
                ]
            },
            GotProjectDragAndDropMessage: ({ message: drag_message }) => {
                const {
                    model: drag_and_drop,
                    commands = [],
                    outMessage: maybe_out_message_value,
                } = Ui.DragAndDrop.update(
                    model.project_drag_and_drop,
                    drag_message
                )
                const maybe_out_message = Option.fromUndefinedOr(
                    maybe_out_message_value
                )

                const mapped_commands = commands.map(
                    Command.mapEffect(
                        Effect.map((next_message) =>
                            GotProjectDragAndDropMessage({
                                message: next_message,
                            })
                        )
                    )
                )

                return Option.match(maybe_out_message, {
                    onNone: () => [
                        modifyFields(model, {
                            project_drag_and_drop: () => drag_and_drop,
                        }),
                        mapped_commands,
                    ],
                    onSome: (out_message) =>
                        M.value(out_message).pipe(
                            M.withReturnType<readonly [Model, Commands]>(),
                            M.tagsExhaustive({
                                Cancelled: () => [
                                    modifyFields(model, {
                                        project_drag_and_drop: () =>
                                            drag_and_drop,
                                        project_announcement: () =>
                                            "Project drag cancelled.",
                                    }),
                                    mapped_commands,
                                ],
                                Reordered: ({
                                    itemId,
                                    toContainerId,
                                    toIndex,
                                }) => {
                                    if (!is_project_status(toContainerId)) {
                                        return [model, mapped_commands]
                                    }

                                    const projects = reorder_projects(
                                        model.projects,
                                        itemId,
                                        toContainerId,
                                        toIndex
                                    )
                                    return [
                                        modifyFields(model, {
                                            projects: () => projects,
                                            project_drag_and_drop: () =>
                                                drag_and_drop,
                                            project_announcement: () =>
                                                `Project moved to position ${toIndex + 1} of ${toContainerId}.`,
                                        }),
                                        [
                                            ...mapped_commands,
                                            ReorderProjects({
                                                positions:
                                                    project_positions(projects),
                                            }),
                                        ],
                                    ]
                                },
                            })
                        ),
                })
            },
            SucceededReorderProjects: () => [model, []],
            ClickedEditProject: ({ project_id }) => [
                modifyFields(model, {
                    editing_project: () =>
                        Option.map(
                            Array.findFirst(
                                model.projects,
                                (project) => project.id === project_id
                            ),
                            (project) => ({ project_id, name: project.name })
                        ),
                    maybe_error: () => Option.none(),
                }),
                [],
            ],
            ChangedProjectName: ({ value }) =>
                model.saving_project
                    ? [model, []]
                    : [
                          modifyFields(model, {
                              editing_project: (editing) =>
                                  Option.map(editing, (project) => ({
                                      ...project,
                                      name: value,
                                  })),
                          }),
                          [],
                      ],
            CancelledProjectName: () =>
                model.saving_project
                    ? [model, []]
                    : [
                          modifyFields(model, {
                              editing_project: () => Option.none(),
                              maybe_error: () => Option.none(),
                          }),
                          [],
                      ],
            SubmittedProjectName: () =>
                Option.match(model.editing_project, {
                    onNone: () => [model, []],
                    onSome: ({ project_id, name }) => {
                        if (model.saving_project) return [model, []]
                        const trimmed_name = name.trim()
                        if (
                            trimmed_name.length === 0 ||
                            trimmed_name.length > 255
                        ) {
                            return [
                                modifyFields(model, {
                                    maybe_error: () =>
                                        Option.some(
                                            "Enter a project title between 1 and 255 characters."
                                        ),
                                }),
                                [],
                            ]
                        }
                        return [
                            modifyFields(model, {
                                saving_project: () => true,
                                maybe_error: () => Option.none(),
                            }),
                            [RenameProject({ project_id, name: trimmed_name })],
                        ]
                    },
                }),
            SucceededRenameProject: ({ project }) => [
                modifyFields(model, {
                    projects: (projects) =>
                        projects.map((existing) =>
                            existing.id === project.id ? project : existing
                        ),
                    editing_project: (editing) =>
                        Option.filter(
                            editing,
                            ({ project_id }) => project_id !== project.id
                        ),
                    saving_project: () => false,
                    maybe_error: () => Option.none(),
                    project_announcement: () =>
                        `Renamed project to ${project.name}.`,
                }),
                [],
            ],
            FailedRenameProject: ({ details }) => [
                modifyFields(model, {
                    saving_project: () => false,
                    maybe_error: () => Option.some(details),
                }),
                [],
            ],
            ClickedDeleteProject: ({ project_id }) => {
                const { model: delete_project_dialog, commands = [] } =
                    Ui.Dialog.update(
                        model.delete_project_dialog,
                        Ui.Dialog.Message.RequestedOpen()
                    )

                return [
                    modifyFields(model, {
                        pending_delete_project_id: () =>
                            Option.some(project_id),
                        delete_project_dialog: () => delete_project_dialog,
                    }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotDeleteProjectDialogMessage({ message })
                            )
                        )
                    ),
                ]
            },
            GotDeleteProjectDialogMessage: ({ message }) => {
                const { model: delete_project_dialog, commands = [] } =
                    Ui.Dialog.update(model.delete_project_dialog, message)

                return [
                    modifyFields(model, {
                        delete_project_dialog: () => delete_project_dialog,
                    }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((next_message) =>
                                GotDeleteProjectDialogMessage({
                                    message: next_message,
                                })
                            )
                        )
                    ),
                ]
            },
            ConfirmedDeleteProject: () =>
                Option.match(model.pending_delete_project_id, {
                    onNone: () => [model, []],
                    onSome: (project_id) => {
                        const { model: delete_project_dialog, commands = [] } =
                            Ui.Dialog.update(
                                model.delete_project_dialog,
                                Ui.Dialog.Message.RequestedClose()
                            )

                        return [
                            modifyFields(model, {
                                pending_delete_project_id: () => Option.none(),
                                delete_project_dialog: () =>
                                    delete_project_dialog,
                            }),
                            [
                                ...commands.map(
                                    Command.mapEffect(
                                        Effect.map((message) =>
                                            GotDeleteProjectDialogMessage({
                                                message,
                                            })
                                        )
                                    )
                                ),
                                DeleteProject({ project_id }),
                            ],
                        ]
                    },
                }),
            SucceededDeleteProject: ({ project_id }) => [
                modifyFields(model, {
                    opened_project_id: (opened) =>
                        Option.filter(opened, (id) => id !== project_id),
                    selected_project_id: (selected) =>
                        Option.filter(selected, (id) => id !== project_id),
                    tasks: (tasks) =>
                        tasks.filter((task) => task.project_id !== project_id),
                    editing_project: (editing) =>
                        Option.filter(
                            editing,
                            (project) => project.project_id !== project_id
                        ),
                    projects: (projects) =>
                        Array.filter(
                            projects,
                            (project) => project.id !== project_id
                        ),
                    maybe_error: () => Option.none(),
                    project_announcement: () =>
                        Option.match(
                            Array.findFirst(
                                model.projects,
                                (project) => project.id === project_id
                            ),
                            {
                                onNone: () => "Project deleted.",
                                onSome: ({ name }) => `Deleted ${name}.`,
                            }
                        ),
                }),
                [],
            ],
            GotTaskDragAndDropMessage: ({ message: drag_message }) => {
                const {
                    model: drag_and_drop,
                    commands = [],
                    outMessage: maybe_out_message_value,
                } = Ui.DragAndDrop.update(
                    model.task_drag_and_drop,
                    drag_message
                )
                const maybe_out_message = Option.fromUndefinedOr(
                    maybe_out_message_value
                )

                const mapped_commands = commands.map(
                    Command.mapEffect(
                        Effect.map((next_message) =>
                            GotTaskDragAndDropMessage({
                                message: next_message,
                            })
                        )
                    )
                )

                return Option.match(maybe_out_message, {
                    onNone: () => [
                        modifyFields(model, {
                            task_drag_and_drop: () => drag_and_drop,
                        }),
                        mapped_commands,
                    ],
                    onSome: (out_message) =>
                        M.value(out_message).pipe(
                            M.withReturnType<readonly [Model, Commands]>(),
                            M.tagsExhaustive({
                                Cancelled: () => [
                                    modifyFields(model, {
                                        task_drag_and_drop: () => drag_and_drop,
                                    }),
                                    mapped_commands,
                                ],
                                Reordered: ({
                                    itemId,
                                    toContainerId,
                                    toIndex,
                                }) => {
                                    if (
                                        toContainerId !== PROJECT_TASK_LIST_ID
                                    ) {
                                        return [model, mapped_commands]
                                    }

                                    return Option.match(
                                        model.selected_project_id,
                                        {
                                            onNone: () => [
                                                modifyFields(model, {
                                                    task_drag_and_drop: () =>
                                                        drag_and_drop,
                                                }),
                                                mapped_commands,
                                            ],
                                            onSome: (project_id) => {
                                                const tasks = reorder_tasks(
                                                    model.tasks,
                                                    itemId,
                                                    toIndex
                                                )

                                                return [
                                                    modifyFields(model, {
                                                        tasks: () => tasks,
                                                        task_drag_and_drop:
                                                            () => drag_and_drop,
                                                    }),
                                                    [
                                                        ...mapped_commands,
                                                        ReorderTasks({
                                                            project_id,
                                                            positions:
                                                                task_positions(
                                                                    tasks
                                                                ),
                                                        }),
                                                    ],
                                                ]
                                            },
                                        }
                                    )
                                },
                            })
                        ),
                })
            },
            SucceededReorderTasks: () => [model, []],
            ChangedNewTaskTitle: ({ value }) => [
                modifyFields(model, { new_task_title: () => value }),
                [],
            ],
            SubmittedNewTask: () => {
                const title = String.trim(model.new_task_title)
                return Option.match(model.selected_project_id, {
                    onNone: () => [model, []],
                    onSome: (project_id) =>
                        title.length === 0
                            ? [model, []]
                            : [model, [CreateTask({ project_id, title })]],
                })
            },
            SucceededCreateTask: () => [
                modifyFields(model, {
                    new_task_title: () => "",
                    maybe_error: () => Option.none(),
                }),
                [],
            ],
            ClickedSetTaskStatus: ({ task_id, status }) => [
                modifyFields(model, {
                    tasks: (tasks) =>
                        Array.map(tasks, (task) =>
                            task.id === task_id ? { ...task, status } : task
                        ),
                }),
                [SetTaskStatus({ task_id, status })],
            ],
            SucceededSetTaskStatus: () => [model, []],
            ClickedEditTask: ({ task_id }) => [
                modifyFields(model, {
                    editing_task: () =>
                        Option.map(
                            Array.findFirst(
                                model.tasks,
                                (task) => task.id === task_id
                            ),
                            (task) => ({ task_id, title: task.title })
                        ),
                }),
                [],
            ],
            ChangedEditingTaskTitle: ({ value }) => [
                modifyFields(model, {
                    editing_task: (editing_task) =>
                        Option.map(editing_task, ({ task_id }) => ({
                            task_id,
                            title: value,
                        })),
                }),
                [],
            ],
            SubmittedEditingTask: () =>
                Option.match(model.editing_task, {
                    onNone: () => [model, []],
                    onSome: ({ task_id, title }) => {
                        const trimmed_title = String.trim(title)

                        return trimmed_title.length === 0
                            ? [
                                  modifyFields(model, {
                                      editing_task: () => Option.none(),
                                  }),
                                  [],
                              ]
                            : [
                                  modifyFields(model, {
                                      tasks: (tasks) =>
                                          Array.map(tasks, (task) =>
                                              task.id === task_id
                                                  ? {
                                                        ...task,
                                                        title: trimmed_title,
                                                    }
                                                  : task
                                          ),
                                      editing_task: () => Option.none(),
                                  }),
                                  [
                                      UpdateTaskTitle({
                                          task_id,
                                          title: trimmed_title,
                                      }),
                                  ],
                              ]
                    },
                }),
            CancelledEditingTask: () => [
                modifyFields(model, { editing_task: () => Option.none() }),
                [],
            ],
            SucceededUpdateTaskTitle: () => [model, []],
            ClickedDeleteTask: ({ task_id }) => [
                modifyFields(model, {
                    tasks: (tasks) =>
                        Array.filter(tasks, (task) => task.id !== task_id),
                    editing_task: () => Option.none(),
                }),
                [DeleteTask({ task_id })],
            ],
            SucceededDeleteTask: () => [model, []],
            SelectedTaskFilter: ({ filter }) => [
                modifyFields(model, { task_filter: () => filter }),
                [],
            ],
            ClickedToggleAllTasks: () => {
                const status = Array.every(
                    model.tasks,
                    (task) => task.status === "done"
                )
                    ? "active"
                    : "done"

                return Option.match(model.selected_project_id, {
                    onNone: () => [model, []],
                    onSome: (project_id) => [
                        modifyFields(model, {
                            tasks: (tasks) =>
                                Array.map(tasks, (task) => ({
                                    ...task,
                                    status,
                                })),
                        }),
                        [SetAllTaskStatus({ project_id, status })],
                    ],
                })
            },
            SucceededSetAllTaskStatus: () => [model, []],
            ClickedClearCompletedTasks: () =>
                Option.match(model.selected_project_id, {
                    onNone: () => [model, []],
                    onSome: (project_id) => [
                        modifyFields(model, {
                            tasks: (tasks) =>
                                Array.filter(
                                    tasks,
                                    (task) => task.status !== "done"
                                ),
                            editing_task: () => Option.none(),
                        }),
                        [ClearCompletedTasks({ project_id })],
                    ],
                }),
            SucceededClearCompletedTasks: () => [model, []],
            ChangedEntityTags: ({ entity_type, entity_id, tag_ids }) =>
                Option.match(active_domain_id, {
                    onNone: () => [model, []],
                    onSome: (domain_id) => [
                        model,
                        [
                            SetEntityTags({
                                domain_id,
                                entity_type,
                                entity_id,
                                tag_ids,
                            }),
                        ],
                    ],
                }),
            SucceededSetEntityTags: () => [model, []],
        })
    )

const project_drag_subscriptions = FoldkitSubscription.lift(
    Ui.DragAndDrop.subscriptions
)<Model, Message>({
    toChildModel: (model) => model.project_drag_and_drop,
    toParentMessage: (message) => GotProjectDragAndDropMessage({ message }),
})

const task_drag_subscriptions = FoldkitSubscription.lift(
    Ui.DragAndDrop.subscriptions
)<Model, Message>({
    toChildModel: (model) => model.task_drag_and_drop,
    toParentMessage: (message) => GotTaskDragAndDropMessage({ message }),
})

const interaction_subscriptions = FoldkitSubscription.make<Model, Message>()(
    () => ({
        projectDragPointer: project_drag_subscriptions.documentPointer,
        projectDragEscape: project_drag_subscriptions.documentEscape,
        projectDragKeyboard: project_drag_subscriptions.documentKeyboard,
        projectDragAutoScroll: project_drag_subscriptions.autoScroll,
        taskDragPointer: task_drag_subscriptions.documentPointer,
        taskDragEscape: task_drag_subscriptions.documentEscape,
        taskDragKeyboard: task_drag_subscriptions.documentKeyboard,
        taskDragAutoScroll: task_drag_subscriptions.autoScroll,
    })
)

export const subscriptions = <ParentModel, ParentMessage>(
    config: Readonly<{
        toChildModel: (model: ParentModel) => Model
        toActiveDomainId: (model: ParentModel) => Option.Option<DomainId>
        toParentMessage: (message: Message) => ParentMessage
    }>
) => {
    const interactions = FoldkitSubscription.lift(interaction_subscriptions)<
        ParentModel,
        ParentMessage
    >({
        toChildModel: config.toChildModel,
        toParentMessage: config.toParentMessage,
    })
    return interactions
}

const next_project_status = (status: ProjectStatus): ProjectStatus => {
    if (status === "backlog") {
        return "active"
    }
    if (status === "active") {
        return "done"
    }
    return "backlog"
}

const project_message_for_id = (
    model: Model,
    project_id: string,
    to_message: (project: Project) => Message
): Message =>
    Option.match(
        Array.findFirst(model.projects, (project) => project.id === project_id),
        {
            onNone: () =>
                FailedData({
                    details: `Project ${project_id} is no longer available.`,
                }),
            onSome: to_message,
        }
    )

const project_task_lists_model = (
    model: Model
): ProjectTaskLists.ModelType => ({
    can_write: model.can_write !== false,
    lists: Array.map(
        Array.sort(
            model.projects,
            Order.mapInput(
                Order.Number,
                (project: Project) => project.order ?? 0
            )
        ),
        (project) => ({
            id: project.id,
            slug: project.slug,
            title: project.name,
            status: project.status,
            order: project.order ?? 0,
            updatedAt: project.updated_at,
            createdAt: project.created_at,
        })
    ),
    loaded: true,
    error: "",
    dragAndDrop: model.project_drag_and_drop,
    maybeNewListStatus: model.new_project_status,
    newListTitle: model.new_project_name,
    announcement: model.project_announcement,
    pendingDeleteListId: Option.getOrNull(model.pending_delete_project_id),
    deletingListId: null,
    deleteConfirmationDialog: model.delete_project_dialog,
})

const to_project_message = (
    model: Model,
    message: ProjectTaskLists.ViewMessage
): Message =>
    M.value(message).pipe(
        M.withReturnType<Message>(),
        M.tagsExhaustive({
            ClickedAddTaskList: ({ status }) => ClickedAddProject({ status }),
            ChangedNewTaskListTitle: ({ value }) =>
                ChangedNewProjectName({ value }),
            SubmittedNewTaskList: () =>
                Option.match(model.new_project_status, {
                    onNone: () => CancelledNewProject(),
                    onSome: (status) => SubmittedNewProject({ status }),
                }),
            CancelledNewTaskList: () => CancelledNewProject(),
            GotDragAndDropMessage: ({ message }) =>
                GotProjectDragAndDropMessage({ message }),
            ClickedDeleteTaskList: ({ id }) =>
                project_message_for_id(model, id, (project) =>
                    ClickedDeleteProject({ project_id: project.id })
                ),
            GotDeleteConfirmationDialogMessage: ({ message }) =>
                GotDeleteProjectDialogMessage({ message }),
            ConfirmedDeleteTaskList: () => ConfirmedDeleteProject(),
            MovedTaskListForward: ({ id }) =>
                project_message_for_id(model, id, (project) =>
                    ClickedSetProjectStatus({
                        project_id: project.id,
                        status: next_project_status(project.status),
                    })
                ),
        })
    )

export type ViewInputs = Readonly<{
    tags: ReadonlyArray<
        Readonly<{
            id: string
            name: string
            color: string
            kind?: "custom" | "role" | "person" | undefined
        }>
    >
    entity_tags: ReadonlyArray<
        Readonly<{
            entity_type: string
            entity_id: string
            tag_id: string
        }>
    >
}>

const selected_entity_tags = (
    inputs: ViewInputs,
    entity_type: "project" | "task",
    entity_id: string
) => {
    const selected_ids = inputs.entity_tags
        .filter(
            (link) =>
                link.entity_type === entity_type && link.entity_id === entity_id
        )
        .map((link) => link.tag_id)

    return inputs.tags.filter((tag) =>
        selected_ids.some((tag_id) => tag_id === tag.id)
    )
}

const entity_tag_badges = (
    inputs: ViewInputs,
    entity_type: "project" | "task",
    entity_id: string,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("flex min-h-[22px] flex-wrap gap-1")],
        selected_entity_tags(inputs, entity_type, entity_id).map((tag) =>
            h.keyed("span")(
                tag.id,
                [
                    h.Class(
                        "inline-flex items-center gap-1 rounded-[5px] border-(length:--surface-border-width) border-border bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
                    ),
                ],
                [
                    h.span(
                        [
                            h.Class("size-1.5 rounded-full"),
                            h.Style({ backgroundColor: tag.color }),
                        ],
                        []
                    ),
                    tag.name,
                ]
            )
        )
    )

const entity_tag_selector = (
    inputs: ViewInputs,
    entity_type: "project" | "task",
    entity_id: string,
    h: HtmlBuilder<Message>
): Html => {
    const selected_tags = selected_entity_tags(inputs, entity_type, entity_id)
    const selected_ids = selected_tags.flatMap((tag) =>
        Option.match(S.decodeUnknownOption(TagId)(tag.id), {
            onNone: () => [],
            onSome: (tag_id) => [tag_id],
        })
    )

    if (inputs.tags.length === 0) {
        return h.p(
            [h.Class("text-sm text-muted-foreground")],
            ["Create a tag from the Tags page to assign it."]
        )
    }

    return h.div(
        [h.Class("space-y-2")],
        [
            h.p(
                [h.Class("text-xs text-muted-foreground")],
                [
                    selected_tags.length === 0
                        ? "Select one or more tags. None selected."
                        : `${selected_tags.length} ${selected_tags.length === 1 ? "tag" : "tags"} selected.`,
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap gap-2")],
                inputs.tags.map((tag) => {
                    const maybe_tag_id = S.decodeUnknownOption(TagId)(tag.id)
                    const selected = Option.exists(maybe_tag_id, (tag_id) =>
                        selected_ids.some((id) => id === tag_id)
                    )
                    const next_ids = Option.match(maybe_tag_id, {
                        onNone: () => selected_ids,
                        onSome: (tag_id) =>
                            selected
                                ? selected_ids.filter((id) => id !== tag_id)
                                : [...selected_ids, tag_id],
                    })

                    return h.keyed("button")(
                        tag.id,
                        [
                            h.Type("button"),
                            h.AriaPressed(selected ? "true" : "false"),
                            h.Title(
                                selected
                                    ? `Remove ${tag.name}`
                                    : `Select ${tag.name}`
                            ),
                            h.OnClick(
                                ChangedEntityTags({
                                    entity_type,
                                    entity_id,
                                    tag_ids: next_ids,
                                })
                            ),
                            h.Class(
                                selected
                                    ? "inline-flex items-center gap-2 rounded-full border-(length:--control-border-width) border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground ring-2 ring-primary/25 [box-shadow:var(--shadow-primary)] active:scale-[0.96]"
                                    : "inline-flex items-center gap-2 rounded-full border-(length:--control-outline-border-width) border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)] active:scale-[0.96]"
                            ),
                        ],
                        [
                            h.span(
                                [
                                    h.Class("size-2 rounded-full"),
                                    h.Style({ backgroundColor: tag.color }),
                                ],
                                []
                            ),
                            tag.name,
                            h.span(
                                [
                                    h.Class(
                                        selected
                                            ? "ml-0.5 grid size-4 place-items-center rounded-full border border-primary-foreground/40 bg-primary-foreground/20"
                                            : "ml-0.5 size-4 rounded-full border border-current/40"
                                    ),
                                ],
                                selected ? [IconCheck({ class: "size-3" })] : []
                            ),
                        ]
                    )
                })
            ),
        ]
    )
}

const projects_board_view = (
    model: Model,
    inputs: ViewInputs,
    h: HtmlBuilder<Message>
): Html =>
    ProjectTaskLists.view(
        project_task_lists_model(model),
        projectHref,
        (message) => to_project_message(model, message),
        (project) =>
            h.div(
                [h.Class("mt-2")],
                [entity_tag_badges(inputs, "project", project.id, h)]
            ),
        h
    )

const delete_project_dialog_view = (
    model: Model,
    h: HtmlBuilder<Message>
): Html =>
    ProjectTaskLists.deleteConfirmationView(
        project_task_lists_model(model),
        (message) => to_project_message(model, message),
        h
    )

const project_title_view = (
    model: Model,
    project: Project,
    h: HtmlBuilder<Message>
): Html => {
    const editing = Option.filter(
        model.editing_project,
        ({ project_id }) => project_id === project.id
    )
    return Option.match(editing, {
        onNone: () =>
            h.div(
                [h.Class("mt-2 flex items-center justify-between gap-3")],
                [
                    h.h1(
                        [h.Class("text-3xl font-semibold tracking-tight")],
                        [project.name]
                    ),
                    Button(
                        {
                            variant: "outline",
                            disabled: model.can_write === false,
                            onClick: ClickedEditProject({
                                project_id: project.id,
                            }),
                            children: ["Edit title"],
                        },
                        h
                    ),
                ]
            ),
        onSome: ({ name }) =>
            h.form(
                [
                    h.Class("mt-2 flex flex-wrap items-end gap-3"),
                    h.OnSubmit(SubmittedProjectName()),
                ],
                [
                    h.div(
                        [h.Class("min-w-0 flex-1")],
                        [
                            h.label(
                                [
                                    h.For("project-title"),
                                    h.Class("mb-1 block text-sm font-medium"),
                                ],
                                ["Project title"]
                            ),
                            h.input([
                                h.Id("project-title"),
                                h.Name("project_title"),
                                h.Type("text"),
                                h.Value(name),
                                h.Required(true),
                                h.Maxlength(255),
                                h.Class(
                                    "w-full rounded border border-border bg-background px-3 py-2 text-base focus-visible:ring-2 focus-visible:ring-ring"
                                ),
                                ...(model.can_write === false ||
                                model.saving_project
                                    ? [h.Disabled(true)]
                                    : []),
                                h.OnInput((value) =>
                                    ChangedProjectName({ value })
                                ),
                                h.OnKeyDownPreventDefault((key) =>
                                    key === "Escape"
                                        ? Option.some(CancelledProjectName())
                                        : Option.none()
                                ),
                            ]),
                        ]
                    ),
                    Button(
                        {
                            type: "submit",
                            disabled:
                                model.can_write === false ||
                                model.saving_project,
                            children: [
                                model.saving_project ? "Saving…" : "Save title",
                            ],
                        },
                        h
                    ),
                    Button(
                        {
                            variant: "outline",
                            disabled:
                                model.can_write === false ||
                                model.saving_project,
                            onClick: CancelledProjectName(),
                            children: ["Cancel"],
                        },
                        h
                    ),
                ]
            ),
    })
}

const project_detail_view = (
    model: Model,
    project_id: ProjectId,
    inputs: ViewInputs,
    h: HtmlBuilder<Message>
): Html => {
    const project = Array.findFirst(
        model.projects,
        (candidate) => candidate.id === project_id
    )

    return h.div(
        [
            h.Class(
                "mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 p-6"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-center justify-between gap-3")],
                [
                    h.a(
                        [
                            h.Href(projectsHref()),
                            h.Class(
                                "rounded-[var(--radius-control)] px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                            ),
                        ],
                        ["← All projects"]
                    ),
                    Option.match(project, {
                        onNone: () => h.empty,
                        onSome: ({ id, name }) =>
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Disabled(model.can_write === false),
                                    h.OnClick(
                                        ClickedDeleteProject({
                                            project_id: id,
                                        })
                                    ),
                                    h.Class(
                                        "rounded-full border-(length:--surface-border-width) border-border px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
                                    ),
                                ],
                                [`Delete ${name}`]
                            ),
                    }),
                ]
            ),
            h.header(
                [h.Class("space-y-2")],
                [
                    h.p(
                        [
                            h.Class(
                                "text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground"
                            ),
                        ],
                        ["Project tasks"]
                    ),
                    Option.match(project, {
                        onNone: () =>
                            h.h1(
                                [
                                    h.Class(
                                        "text-3xl font-semibold tracking-tight"
                                    ),
                                ],
                                ["Project"]
                            ),
                        onSome: (project) =>
                            h.div(
                                [h.Class("space-y-3")],
                                [
                                    project_title_view(model, project, h),
                                    h.div(
                                        [h.Class("space-y-2")],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-sm font-medium text-foreground"
                                                    ),
                                                ],
                                                ["Tags"]
                                            ),
                                            h.fieldset(
                                                [
                                                    h.Disabled(
                                                        model.can_write ===
                                                            false
                                                    ),
                                                    h.Class("contents"),
                                                ],
                                                [
                                                    entity_tag_selector(
                                                        inputs,
                                                        "project",
                                                        project.id,
                                                        h
                                                    ),
                                                ]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                    }),
                ]
            ),
            h.section(
                [
                    h.Class(
                        "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    taskListView(
                        {
                            tasks: model.tasks,
                            can_write: model.can_write !== false,
                            toTaskId: (task) => task.id,
                            drag_and_drop: model.task_drag_and_drop,
                            new_task_title: model.new_task_title,
                            task_filter: model.task_filter,
                            editing_task: model.editing_task,
                            onTaskTitleInput: (value) =>
                                ChangedNewTaskTitle({ value }),
                            onSubmitTask: SubmittedNewTask(),
                            onSetTaskStatus: (task_id, status) =>
                                ClickedSetTaskStatus({ task_id, status }),
                            onEditTask: (task_id) =>
                                ClickedEditTask({ task_id }),
                            onEditingTaskTitleInput: (value) =>
                                ChangedEditingTaskTitle({ value }),
                            onSubmitEditingTask: SubmittedEditingTask(),
                            onCancelEditingTask: CancelledEditingTask(),
                            onDeleteTask: (task_id) =>
                                ClickedDeleteTask({ task_id }),
                            onSelectTaskFilter: (filter) =>
                                SelectedTaskFilter({ filter }),
                            onToggleAllTasks: ClickedToggleAllTasks(),
                            onClearCompletedTasks: ClickedClearCompletedTasks(),
                            toDragAndDropMessage: (message) =>
                                GotTaskDragAndDropMessage({ message }),
                            renderTaskMeta: (task) =>
                                entity_tag_badges(inputs, "task", task.id, h),
                            renderEditingTaskMeta: (task) =>
                                h.div(
                                    [h.Class("space-y-2")],
                                    [
                                        h.div(
                                            [
                                                h.Class(
                                                    "text-sm font-medium text-foreground"
                                                ),
                                            ],
                                            ["Tags"]
                                        ),
                                        h.fieldset(
                                            [
                                                h.Disabled(
                                                    model.can_write === false
                                                ),
                                                h.Class("contents"),
                                            ],
                                            [
                                                entity_tag_selector(
                                                    inputs,
                                                    "task",
                                                    task.id,
                                                    h
                                                ),
                                            ]
                                        ),
                                    ]
                                ),
                        },
                        h
                    ),
                ]
            ),
        ]
    )
}

const projects_view = (
    model: Model,
    inputs: ViewInputs,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [],
        [
            Option.match(model.maybe_error, {
                onNone: () => h.empty,
                onSome: (error) =>
                    h.p(
                        [
                            h.Role("alert"),
                            h.Class(
                                "m-6 rounded border border-destructive p-3 text-destructive"
                            ),
                        ],
                        [error]
                    ),
            }),
            Option.match(model.opened_project_id, {
                onNone: () => projects_board_view(model, inputs, h),
                onSome: (project_id) =>
                    h.div(
                        [],
                        [
                            project_detail_view(model, project_id, inputs, h),
                            delete_project_dialog_view(model, h),
                        ]
                    ),
            }),
        ]
    )

export const view = Submodel.defineView<Model, Message, ViewInputs>(
    projects_view
)
