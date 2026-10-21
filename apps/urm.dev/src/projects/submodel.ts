import { Effect, Option, Schema as S, Struct, Function } from "effect"
import { Command, Submodel } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { defineMessageUnion } from "foldkit/message"
import { Surface } from "foldkit-surface"
import { Remote, RemoteMutationError } from "foldkit-remote"
import { ProjectAction } from "@urm/domain/projects"
import {
    ProjectCatalog,
    ProjectSummary,
    DomainProjects,
    ChangeProjects,
    ProjectsRemote,
} from "@urm/contracts/projects"
import { ContactsApi, AccountRequestError } from "../contacts/api.ts"
import type { DesktopRoute } from "../routing/route.ts"
import * as Projects from "./projects-ui.ts"
const ui_schema = S.Struct(
    Struct.omit(Projects.Model.fields, ["projects", "tasks", "can_write"])
)
const ui_only = (model: Projects.Model) =>
    Struct.omit(model, ["projects", "tasks", "can_write"])
export const Model = S.Struct({
    ui: ui_schema,
    remote: Remote.Model,
    account_id: S.String,
    domain_id: S.String,
    can_write: S.Boolean,
    epoch: S.Number,
    pending: S.Boolean,
    refresh_requested: S.Boolean,
})
export type Model = typeof Model.Type
const Loaded = taggedStruct("ProjectCatalogLoaded", {
    epoch: S.Number,
    remote: Remote.Model,
    action: S.optional(ProjectAction),
})
const Failed = taggedStruct("ProjectCatalogFailed", {
    epoch: S.Number,
    error: S.String,
})
export const Refreshed = taggedStruct("ProjectCatalogRefreshed")
const Settled = taggedStruct("ProjectMutationSettled", {
    epoch: S.Number,
    action: ProjectAction,
    message: ProjectsRemote.Message,
})
export const Message = S.Union([
    Projects.Message,
    Loaded,
    Failed,
    Refreshed,
    Settled,
])
export type Message = typeof Message.Type
export type UpdateReturn = readonly [
    Model,
    ReadonlyArray<Command.Command<Message, never, ContactsApi>>,
]
const Cache = Surface.application({
    Model: S.Struct({ remote: Remote.Model }),
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: { readonly remote: typeof Remote.Model.Type }) => ({
        model,
    }),
})
export const Data = Remote.make({
    model: Cache.model.remote,
    entities: [ProjectCatalog],
    queries: [DomainProjects],
    mutations: [ChangeProjects],
})
const query = (domain_id: string) =>
    Data.query(
        DomainProjects,
        { domain_id },
        { select: ProjectSummary, first: 1 }
    )
export const library = Function.memoize((model: Model) => {
    const result = query(model.domain_id).read({ remote: model.remote })
    return result._tag === "Ready" ? (result.value.items[0] ?? null) : null
})
export const project = Function.memoize((model: Model): Projects.Model => {
    const catalog = library(model)
    return {
        ...model.ui,
        can_write: model.can_write && !model.pending,
        projects: catalog?.projects ?? [],
        tasks: (catalog?.tasks ?? []).filter((task) =>
            Option.contains(model.ui.selected_project_id, task.project_id)
        ),
    }
})
export const init = (route: DesktopRoute): Model => ({
    ui: ui_only(Projects.init(route)),
    remote: Remote.initial,
    account_id: "",
    domain_id: "",
    can_write: false,
    epoch: 0,
    pending: false,
    refresh_requested: false,
})
export const clear = (model: Model): Model => ({
    ...init(model.ui.route),
    epoch: model.epoch + 1,
})
const scope_fields = {
    account_id: S.String,
    domain_id: S.String,
    epoch: S.Number,
}
const scope = (model: Model) => ({
    account_id: model.account_id,
    domain_id: model.domain_id,
    epoch: model.epoch,
})
const LoadProjectCatalog = Command.define("LoadProjectCatalog", {
    args: { ...scope_fields, action: S.optional(ProjectAction) },
    messages: [Loaded, Failed],
    execute: ({ account_id, domain_id, epoch, action }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const session = yield* api.session()
            if (
                session.account_id !== account_id ||
                !session.domains.some(
                    (workspace) =>
                        workspace.id === domain_id &&
                        (action === undefined || workspace.can_write)
                )
            )
                return yield* Effect.fail(
                    new AccountRequestError({
                        status: 403,
                        message: "Project access changed. Sign in or refresh.",
                    })
                )
            if (action)
                yield* Remote.mutate(
                    ChangeProjects,
                    { domain_id, action },
                    crypto.randomUUID()
                ).pipe(Effect.provide(api.remote(domain_id)))
            const loaded = yield* Data.prefetch(
                { remote: Remote.initial },
                query(domain_id)
            ).pipe(Effect.provide(api.remote(domain_id)))
            if (query(domain_id).read(loaded)._tag !== "Ready")
                return yield* Effect.fail(
                    new AccountRequestError({
                        status: 403,
                        message:
                            "Projects could not be loaded. Check access and refresh.",
                    })
                )
            return Loaded({
                epoch,
                remote: loaded.remote,
                ...(action === undefined ? {} : { action }),
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Failed({
                        epoch,
                        error:
                            error instanceof AccountRequestError ||
                            error instanceof RemoteMutationError
                                ? error.message
                                : "Project operation could not be confirmed. Refresh before retrying.",
                    })
                )
            )
        ),
})
const SaveProjectCatalog = Command.define("SaveProjectCatalog", {
    args: { ...scope_fields, request_id: S.String, action: ProjectAction },
    messages: [Settled],
    execute: ({ account_id, domain_id, epoch, request_id, action }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const outcome = yield* Remote.mutate(
                ChangeProjects,
                { domain_id, account_id, action },
                request_id
            ).pipe(Effect.provide(api.remote(domain_id)))
            return Settled({
                epoch,
                action,
                message: {
                    _tag: "MutationSucceeded",
                    requestId: request_id,
                    entities: outcome.entities,
                    connections: outcome.connections,
                },
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Settled({
                        epoch,
                        action,
                        message: {
                            _tag: "MutationFailed",
                            requestId: request_id,
                            error: {
                                _tag: "ProjectWriteFailed",
                                message:
                                    error instanceof RemoteMutationError
                                        ? error.message
                                        : "Save failed. Refresh before retrying.",
                            },
                        },
                    })
                )
            )
        ),
})
export const synchronize = (
    model: Model,
    account: {
        account_id: string
        domain_id: string
        can_write: boolean
    } | null
): UpdateReturn => {
    if (account === null || account.domain_id === "")
        return [model.domain_id === "" ? model : clear(model), []]
    if (
        model.account_id === account.account_id &&
        model.domain_id === account.domain_id &&
        model.can_write === account.can_write
    )
        return [model, []]
    const next = { ...clear(model), ...account, pending: true }
    return [next, [LoadProjectCatalog(scope(next))]]
}
export const changed_route = (model: Model, route: DesktopRoute): Model => ({
    ...model,
    ui: ui_only(Projects.changed_route(project(model), route)),
})
const write_commands = new Set([
    "CreateProject",
    "RenameProject",
    "ReorderProjects",
    "DeleteProject",
    "CreateTask",
    "ReorderTasks",
    "SetTaskStatus",
    "UpdateTaskTitle",
    "DeleteTask",
    "SetAllTaskStatus",
    "ClearCompletedTasks",
    "SetEntityTags",
])
const apply = (model: Model, message: Projects.Message): UpdateReturn => {
    const [ui, commands] = Projects.update(
        project(model),
        message,
        Option.fromNullishOr(model.domain_id || null)
    )
    const translated: Array<Command.Command<Message, never, ContactsApi>> = []
    let next = { ...model, ui: ui_only(ui) }
    for (const command of commands) {
        if (write_commands.has(command.name)) {
            if (!model.can_write || model.pending) return [model, []]
            const args = S.decodeUnknownOption(S.Record(S.String, S.Unknown))(
                command.args
            )
            const action = Option.flatMap(args, (args) =>
                S.decodeUnknownOption(ProjectAction)({
                    ...args,
                    _tag: command.name,
                    ...(command.name === "CreateProject" ||
                    command.name === "CreateTask"
                        ? { id: crypto.randomUUID() }
                        : {}),
                })
            )
            if (Option.isNone(action))
                return [
                    {
                        ...model,
                        ui: {
                            ...model.ui,
                            saving_project: false,
                            maybe_error: Option.some(
                                "Check the project or task fields before saving."
                            ),
                        },
                    },
                    [],
                ]
            const request_id = crypto.randomUUID()
            const catalog = library(model)
            const change = action.value
            const optimistic =
                change._tag === "SetTaskStatus" && catalog
                    ? [
                          ProjectCatalog.patch(model.domain_id, {
                              tasks: catalog.tasks.map((task) =>
                                  task.id === change.task_id
                                      ? { ...task, status: change.status }
                                      : task
                              ),
                          }),
                      ]
                    : []
            const started = Data.reduce(
                { remote: model.remote },
                { _tag: "MutationStarted", requestId: request_id, optimistic }
            )
            translated.push(
                SaveProjectCatalog({
                    ...scope(model),
                    request_id,
                    action: action.value,
                })
            )
            next = {
                ...next,
                remote: started.remote,
                pending: true,
                ui: { ...next.ui, editing_task: model.ui.editing_task },
            }
        } else translated.push(command)
    }
    return [next, translated]
}
const feedback = (
    model: Model,
    action: ProjectAction
): Projects.Message | undefined => {
    switch (action._tag) {
        case "CreateProject":
            return Projects.SucceededCreateProject({ project_id: action.id })
        case "RenameProject": {
            const project = library(model)?.projects.find(
                (row) => row.id === action.project_id
            )
            return project
                ? Projects.SucceededRenameProject({ project })
                : undefined
        }
        case "DeleteProject":
            return Projects.SucceededDeleteProject({
                project_id: action.project_id,
            })
        case "CreateTask":
            return Projects.SucceededCreateTask({ task_id: action.id })
        case "ReorderProjects":
            return Projects.SucceededReorderProjects()
        case "ReorderTasks":
            return Projects.SucceededReorderTasks()
        case "SetTaskStatus":
            return Projects.SucceededSetTaskStatus()
        case "UpdateTaskTitle":
            return Projects.SucceededUpdateTaskTitle()
        case "DeleteTask":
            return Projects.SucceededDeleteTask()
        case "SetAllTaskStatus":
            return Projects.SucceededSetAllTaskStatus()
        case "ClearCompletedTasks":
            return Projects.SucceededClearCompletedTasks()
        case "SetEntityTags":
            return Projects.SucceededSetEntityTags()
    }
}
const update_current = (
    model: Model,
    message: Message,
    _active_domain_id: Option.Option<string> = Option.none()
): UpdateReturn => {
    if ("epoch" in message && message.epoch !== model.epoch) return [model, []]
    if (message._tag === "ProjectCatalogRefreshed") {
        if (model.pending) return [{ ...model, refresh_requested: true }, []]

        return model.pending || model.domain_id === ""
            ? [model, []]
            : [{ ...model, pending: true }, [LoadProjectCatalog(scope(model))]]
    }
    if (message._tag === "ProjectCatalogFailed")
        return [
            {
                ...model,
                pending: false,
                ui: {
                    ...model.ui,
                    saving_project: false,
                    maybe_error: Option.some(message.error),
                },
            },
            [],
        ]
    if (message._tag === "ProjectMutationSettled") {
        const remote = Data.reduce(
            { remote: model.remote },
            message.message
        ).remote
        const next = {
            ...model,
            remote,
            pending: false,
            ui: {
                ...model.ui,
                saving_project: false,
                maybe_error: Option.none<string>(),
            },
        }
        if (message.message._tag === "MutationFailed")
            return [
                {
                    ...next,
                    ui: {
                        ...next.ui,
                        maybe_error: Option.some(message.message.error.message),
                    },
                },
                [],
            ]
        if (
            message.action._tag === "SetTaskStatus" ||
            message.action._tag === "ReorderTasks" ||
            message.action._tag === "SetAllTaskStatus" ||
            message.action._tag === "ClearCompletedTasks" ||
            message.action._tag === "SetEntityTags"
        )
            return [next, []]
        if (
            message.action._tag === "UpdateTaskTitle" ||
            message.action._tag === "DeleteTask"
        )
            return [
                { ...next, ui: { ...next.ui, editing_task: Option.none() } },
                [],
            ]
        const [loaded] = apply(
            next,
            Projects.ReceivedProjects({
                projects: library(next)?.projects ?? [],
            })
        )
        const completed = feedback(loaded, message.action)
        return completed ? apply(loaded, completed) : [loaded, []]
    }
    if (message._tag === "ProjectCatalogLoaded") {
        const next = {
            ...model,
            remote: message.remote,
            pending: false,
            ui: {
                ...model.ui,
                maybe_error: Option.none<string>(),
                saving_project: false,
            },
        }
        const [loaded] = apply(
            next,
            Projects.ReceivedProjects({
                projects: library(next)?.projects ?? [],
            })
        )
        if (!message.action) return [loaded, []]
        const completed = feedback(loaded, message.action)
        const result = completed
            ? apply(loaded, completed)
            : ([loaded, []] satisfies UpdateReturn)
        if (
            message.action._tag === "UpdateTaskTitle" ||
            message.action._tag === "DeleteTask"
        )
            return [
                {
                    ...result[0],
                    ui: { ...result[0].ui, editing_task: Option.none() },
                },
                result[1],
            ]
        return result
    }
    if (
        message._tag === "ReceivedProjects" ||
        message._tag === "ReceivedTasks" ||
        message._tag.startsWith("Succeeded")
    )
        return [model, []]
    if (
        (!model.can_write || model.pending) &&
        (message._tag === "GotProjectDragAndDropMessage" ||
            message._tag === "GotTaskDragAndDropMessage")
    )
        return [model, []]
    return apply(model, message)
}
export const update = (
    model: Model,
    message: Message,
    active_domain_id: Option.Option<string> = Option.none()
): UpdateReturn => {
    const [next, commands] = update_current(model, message, active_domain_id)
    if (!next.pending && next.refresh_requested && next.domain_id !== "")
        return [
            { ...next, pending: true, refresh_requested: false },
            [...commands, LoadProjectCatalog(scope(next))],
        ]
    return [next, commands]
}
export const subscriptions = <ParentModel, ParentMessage>(config: {
    toChildModel: (model: ParentModel) => Model
    toActiveDomainId: (model: ParentModel) => Option.Option<string>
    toParentMessage: (message: Message) => ParentMessage
}) =>
    Projects.subscriptions<ParentModel, ParentMessage>({
        ...config,
        toChildModel: (parent) => project(config.toChildModel(parent)),
    })
export const view = Submodel.defineView<Model, Message>((model, h) =>
    h.div(
        [],
        [
            h.button(
                [
                    h.Type("button"),
                    h.Disabled(model.pending),
                    h.OnClick(Refreshed()),
                ],
                ["Refresh projects"]
            ),
            ...(!model.can_write ? [h.p([], ["Read-only access"])] : []),
            h.div(
                [],
                [
                    h.submodel({
                        slotId: "projects-ui",
                        model: project(model),
                        view: Projects.view,
                        viewInputs: {
                            tags: library(model)?.tags ?? [],
                            entity_tags: library(model)?.entity_tags ?? [],
                        },
                        toParentMessage: (message) => message,
                    }),
                ]
            ),
        ]
    )
)

export {
    ProjectStatus,
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
} from "./projects-ui.ts"
