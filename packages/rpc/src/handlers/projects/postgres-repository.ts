import { Context, Effect, Layer, Schema } from "effect"
import { sql } from "drizzle-orm"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import { Sql, query_rows } from "@urm/db/sql"
import {
    ProjectRecord,
    TaskRecord,
    ProjectAction,
    ProjectWriteError,
    slugify_project_name,
} from "@urm/domain/projects"
import { Tag, EntityTag } from "@urm/domain/schemas/tags"
export interface ProjectsPrincipal extends AccountPrincipal {
    readonly domain_id: string
}
const denied = () =>
    new ProjectWriteError({
        message: "Project, task or tag unavailable, changed or access denied.",
    })
const authorize_projects = Effect.fn("Projects.authorize")(function* (
    principal: ProjectsPrincipal,
    domain_id: string,
    write = false
) {
    if (domain_id !== principal.domain_id) return yield* Effect.fail(denied())
    yield* require_account_domain(principal, domain_id, write, "Projects")
})
const load_catalog = Effect.fn("Projects.load")(function* (
    principal: ProjectsPrincipal
) {
    yield* authorize_projects(principal, principal.domain_id)
    const d = principal.domain_id
    const projects = yield* query_rows(
        ProjectRecord,
        sql`SELECT id,domain_id,name,slug,status,"order",created_at::float8 AS created_at,updated_at::float8 AS updated_at FROM projects WHERE domain_id=${d} ORDER BY "order",id LIMIT 51`
    )
    const tasks = yield* query_rows(
        TaskRecord,
        sql`SELECT id,domain_id,project_id,title,status,"order",updated_at::float8 AS updated_at FROM tasks WHERE domain_id=${d} ORDER BY project_id,"order",id LIMIT 5001`
    )
    const tags = yield* query_rows(
        Schema.Struct({ tag: Tag }),
        sql`SELECT jsonb_strip_nulls(to_jsonb(t)-'domain_id'-'created_at') AS tag FROM (SELECT * FROM tags WHERE domain_id=${d} AND deleted_at IS NULL ORDER BY name,id LIMIT 101) t`
    )
    const links = yield* query_rows(
        Schema.Struct({ link: EntityTag }),
        sql`SELECT to_jsonb(e)-'domain_id'-'created_at' AS link FROM entity_tags e JOIN tags t ON t.id=e.tag_id AND t.domain_id=e.domain_id AND t.deleted_at IS NULL WHERE e.domain_id=${d} AND e.entity_type IN ('project','task') ORDER BY e.id LIMIT 501`
    )
    if (
        projects.length > 50 ||
        tasks.length > 5000 ||
        projects.some(
            (project) =>
                tasks.filter((task) => task.project_id === project.id).length >
                100
        ) ||
        tags.length > 100 ||
        links.length > 500
    )
        return yield* Effect.fail(
            new ProjectWriteError({
                message:
                    "This workspace exceeds the supported Projects catalog size (50 projects, 100 tasks per project, 100 tags, 500 tag assignments).",
            })
        )
    return {
        id: d,
        projects,
        tasks,
        tags: tags.map((row) => row.tag),
        entity_tags: links.map((row) => row.link),
    }
})
const change_projects = Effect.fn("Projects.change")(function* (
    principal: ProjectsPrincipal,
    input: ProjectAction
) {
    const db = yield* Sql
    return yield* db.transaction(
        Effect.gen(function* () {
            const tx = yield* Sql
            const d = principal.domain_id
            yield* tx.query(
                sql`SELECT id FROM domains WHERE id=${d} FOR UPDATE`
            )
            yield* authorize_projects(principal, d, true)
            const action =
                yield* Schema.decodeUnknownEffect(ProjectAction)(input)
            if (action._tag === "SetTaskStatus") {
                const changed = yield* query_rows(
                    Schema.Struct({ id: Schema.String }),
                    sql`UPDATE tasks SET status=${action.status},updated_at=${Date.now()} WHERE domain_id=${d} AND id=${action.task_id} RETURNING id`
                )
                if (changed.length !== 1) return yield* Effect.fail(denied())
                return yield* load_catalog(principal)
            }
            const current = yield* load_catalog(principal)
            const now = Date.now()
            if (
                "project_id" in action &&
                !current.projects.some((row) => row.id === action.project_id)
            )
                return yield* Effect.fail(denied())
            if (
                "task_id" in action &&
                !current.tasks.some((row) => row.id === action.task_id)
            )
                return yield* Effect.fail(denied())
            switch (action._tag) {
                case "CreateProject": {
                    if (current.projects.length >= 50)
                        return yield* Effect.fail(
                            new ProjectWriteError({
                                message:
                                    "This workspace supports up to 50 projects.",
                            })
                        )
                    const base = slugify_project_name(action.name)
                    let slug = base.slice(0, 255).replace(/-+$/g, "")
                    for (
                        let suffix = 2;
                        current.projects.some((row) => row.slug === slug);
                        suffix++
                    ) {
                        const ending = `-${suffix}`
                        slug =
                            base
                                .slice(0, 255 - ending.length)
                                .replace(/-+$/g, "") + ending
                    }
                    yield* tx.query(
                        sql`INSERT INTO projects (id,domain_id,name,slug,status,"order",created_at,updated_at) VALUES (${action.id},${d},${action.name},${slug},${action.status},${action.order},${now},${now})`
                    )
                    break
                }
                case "RenameProject":
                    yield* tx.query(
                        sql`UPDATE projects SET name=${action.name},updated_at=${now} WHERE domain_id=${d} AND id=${action.project_id}`
                    )
                    break
                case "ReorderProjects":
                    if (
                        new Set(action.positions.map((row) => row.project_id))
                            .size !== action.positions.length ||
                        action.positions.some(
                            (position) =>
                                !current.projects.some(
                                    (row) => row.id === position.project_id
                                )
                        )
                    )
                        return yield* Effect.fail(denied())
                    for (const position of action.positions)
                        yield* tx.query(
                            sql`UPDATE projects SET status=${position.status},"order"=${position.order},updated_at=${now} WHERE domain_id=${d} AND id=${position.project_id}`
                        )
                    break
                case "DeleteProject":
                    yield* tx.query(
                        sql`DELETE FROM entity_tags WHERE domain_id=${d} AND ((entity_type='project' AND entity_id=${action.project_id}) OR (entity_type='task' AND entity_id IN (SELECT id FROM tasks WHERE domain_id=${d} AND project_id=${action.project_id})))`
                    )
                    yield* tx.query(
                        sql`DELETE FROM projects WHERE domain_id=${d} AND id=${action.project_id}`
                    )
                    break
                case "CreateTask": {
                    const siblings = current.tasks.filter(
                        (task) => task.project_id === action.project_id
                    )
                    if (siblings.length >= 100)
                        return yield* Effect.fail(
                            new ProjectWriteError({
                                message: "A project supports up to 100 tasks.",
                            })
                        )
                    const order =
                        siblings.length === 0
                            ? 0
                            : Math.max(...siblings.map((task) => task.order)) +
                              1
                    yield* tx.query(
                        sql`INSERT INTO tasks (id,domain_id,project_id,title,status,"order",created_at,updated_at) VALUES (${action.id},${d},${action.project_id},${action.title},'active',${order},${now},${now})`
                    )
                    break
                }
                case "ReorderTasks":
                    if (
                        new Set(action.positions.map((row) => row.task_id))
                            .size !== action.positions.length ||
                        action.positions.some(
                            (position) =>
                                !current.tasks.some(
                                    (task) =>
                                        task.id === position.task_id &&
                                        task.project_id === action.project_id
                                )
                        )
                    )
                        return yield* Effect.fail(denied())
                    for (const position of action.positions)
                        yield* tx.query(
                            sql`UPDATE tasks SET "order"=${position.order},updated_at=${now} WHERE domain_id=${d} AND project_id=${action.project_id} AND id=${position.task_id}`
                        )
                    break
                case "UpdateTaskTitle":
                    yield* tx.query(
                        sql`UPDATE tasks SET title=${action.title},updated_at=${now} WHERE domain_id=${d} AND id=${action.task_id}`
                    )
                    break
                case "DeleteTask":
                    yield* tx.query(
                        sql`DELETE FROM entity_tags WHERE domain_id=${d} AND entity_type='task' AND entity_id=${action.task_id}`
                    )
                    yield* tx.query(
                        sql`DELETE FROM tasks WHERE domain_id=${d} AND id=${action.task_id}`
                    )
                    break
                case "SetAllTaskStatus":
                    yield* tx.query(
                        sql`UPDATE tasks SET status=${action.status},updated_at=${now} WHERE domain_id=${d} AND project_id=${action.project_id} AND status<>${action.status}`
                    )
                    break
                case "ClearCompletedTasks":
                    yield* tx.query(
                        sql`DELETE FROM entity_tags WHERE domain_id=${d} AND entity_type='task' AND entity_id IN (SELECT id FROM tasks WHERE domain_id=${d} AND project_id=${action.project_id} AND status='done')`
                    )
                    yield* tx.query(
                        sql`DELETE FROM tasks WHERE domain_id=${d} AND project_id=${action.project_id} AND status='done'`
                    )
                    break
                case "SetEntityTags":
                    if (
                        !(
                            action.entity_type === "project"
                                ? current.projects
                                : current.tasks
                        ).some((row) => row.id === action.entity_id) ||
                        action.tag_ids.some(
                            (id) => !current.tags.some((tag) => tag.id === id)
                        )
                    )
                        return yield* Effect.fail(denied())
                    yield* tx.query(
                        sql`DELETE FROM entity_tags WHERE domain_id=${d} AND entity_type=${action.entity_type} AND entity_id=${action.entity_id}`
                    )
                    for (const tag_id of new Set(action.tag_ids))
                        yield* tx.query(
                            sql`INSERT INTO entity_tags (id,domain_id,entity_type,entity_id,tag_id,created_at,updated_at) VALUES (${crypto.randomUUID()},${d},${action.entity_type},${action.entity_id},${tag_id},${now},${now})`
                        )
            }
            return yield* load_catalog(principal)
        })
    )
})
const make = Effect.gen(function* () {
    const db = yield* Sql
    return {
        authorize_projects: (...args: Parameters<typeof authorize_projects>) =>
            authorize_projects(...args).pipe(Effect.provideService(Sql, db)),
        load_catalog: (...args: Parameters<typeof load_catalog>) =>
            load_catalog(...args).pipe(Effect.provideService(Sql, db)),
        change_projects: (...args: Parameters<typeof change_projects>) =>
            change_projects(...args).pipe(Effect.provideService(Sql, db)),
    }
})
export class ProjectsLibraryRepository extends Context.Service<
    ProjectsLibraryRepository,
    Effect.Success<typeof make>
>()("@urm/rpc/ProjectsLibraryRepository") {}
export const ProjectsLibraryRepositoryLive = Layer.effect(
    ProjectsLibraryRepository,
    make
)
