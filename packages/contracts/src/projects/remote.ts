import { Entity, Mutation, Query, Remote } from "foldkit-remote"
import { Schema } from "effect"
import { ProjectCatalogRecord, ProjectAction } from "@urm/domain/projects"
export const ProjectCatalog = Entity.make(
    "ProjectCatalog",
    ProjectCatalogRecord
)
export const ProjectSummary = ProjectCatalog.select({
    id: true,
    projects: true,
    tasks: true,
    tags: true,
    entity_tags: true,
})
export const DomainProjects = Query.make("DomainProjects", {
    Input: { domain_id: Schema.String },
    Result: ProjectCatalog,
})
export const ChangeProjects = Mutation.make("ChangeProjects", {
    Input: {
        domain_id: Schema.String,
        account_id: Schema.optional(Schema.String),
        action: ProjectAction,
    },
    Output: { domain_id: Schema.String },
})
export const ProjectsRemote = Remote.define({
    entities: [ProjectCatalog],
    queries: [DomainProjects],
    mutations: [ChangeProjects],
})
