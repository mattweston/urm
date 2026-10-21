import { Schema } from "effect"
import { Tag, EntityTag } from "./schemas/tags.ts"
export const ProjectId = Schema.String
export type ProjectId = typeof ProjectId.Type
export const TaskId = Schema.String
export type TaskId = typeof TaskId.Type
export const ProjectName = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(255)
)
export const TaskTitle = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(1000)
)
export const ProjectStatus = Schema.Literals(["backlog", "active", "done"])
export const TaskStatus = Schema.Literals(["active", "done"])
export const ProjectRecord = Schema.Struct({
    id: ProjectId,
    domain_id: Schema.String,
    name: ProjectName,
    slug: Schema.String,
    status: ProjectStatus,
    order: Schema.Finite,
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export type ProjectRecord = typeof ProjectRecord.Type
export const TaskRecord = Schema.Struct({
    id: TaskId,
    domain_id: Schema.String,
    project_id: ProjectId,
    title: TaskTitle,
    status: TaskStatus,
    order: Schema.Finite,
    updated_at: Schema.Number,
})
export type TaskRecord = typeof TaskRecord.Type
export const ProjectCatalogRecord = Schema.Struct({
    id: Schema.String,
    projects: Schema.Array(ProjectRecord),
    tasks: Schema.Array(TaskRecord),
    tags: Schema.Array(Tag),
    entity_tags: Schema.Array(EntityTag),
})
export const ProjectAction = Schema.Union([
    Schema.Struct({
        _tag: Schema.Literal("CreateProject"),
        id: Schema.String,
        name: ProjectName,
        status: ProjectStatus,
        order: Schema.Finite,
    }),
    Schema.Struct({
        _tag: Schema.Literal("RenameProject"),
        project_id: ProjectId,
        name: ProjectName,
    }),
    Schema.Struct({
        _tag: Schema.Literal("ReorderProjects"),
        positions: Schema.Array(
            Schema.Struct({
                project_id: ProjectId,
                status: ProjectStatus,
                order: Schema.Finite,
            })
        ).check(Schema.isMaxLength(50)),
    }),
    Schema.Struct({
        _tag: Schema.Literal("DeleteProject"),
        project_id: ProjectId,
    }),
    Schema.Struct({
        _tag: Schema.Literal("CreateTask"),
        id: Schema.String,
        project_id: ProjectId,
        title: TaskTitle,
    }),
    Schema.Struct({
        _tag: Schema.Literal("ReorderTasks"),
        project_id: ProjectId,
        positions: Schema.Array(
            Schema.Struct({ task_id: TaskId, order: Schema.Finite })
        ).check(Schema.isMaxLength(100)),
    }),
    Schema.Struct({
        _tag: Schema.Literal("SetTaskStatus"),
        task_id: TaskId,
        status: TaskStatus,
    }),
    Schema.Struct({
        _tag: Schema.Literal("UpdateTaskTitle"),
        task_id: TaskId,
        title: TaskTitle,
    }),
    Schema.Struct({ _tag: Schema.Literal("DeleteTask"), task_id: TaskId }),
    Schema.Struct({
        _tag: Schema.Literal("SetAllTaskStatus"),
        project_id: ProjectId,
        status: TaskStatus,
    }),
    Schema.Struct({
        _tag: Schema.Literal("ClearCompletedTasks"),
        project_id: ProjectId,
    }),
    Schema.Struct({
        _tag: Schema.Literal("SetEntityTags"),
        entity_type: Schema.Literals(["project", "task"]),
        entity_id: Schema.String,
        tag_ids: Schema.Array(Schema.String).check(Schema.isMaxLength(50)),
    }),
])
export type ProjectAction = typeof ProjectAction.Type
export class ProjectWriteError extends Schema.TaggedErrorClass<ProjectWriteError>()(
    "ProjectWriteError",
    { message: Schema.String }
) {}
export const slugify_project_name = (name: string) =>
    name
        .trim()
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "project"
