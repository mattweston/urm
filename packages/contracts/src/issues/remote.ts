import { Entity, Mutation, Query, Remote } from "foldkit-remote"
import { Schema } from "effect"
import { IssueCatalogRecord, IssueActions } from "@urm/domain/issues"
export const IssueCatalog = Entity.make("IssueCatalog", IssueCatalogRecord)
export const IssueSummary = IssueCatalog.select({
    id: true,
    issues: true,
    tags: true,
})
export const DomainIssues = Query.make("DomainIssues", {
    Input: { domain_id: Schema.String },
    Result: IssueCatalog,
})
export const ChangeIssues = Mutation.make("ChangeIssues", {
    Input: {
        account_id: Schema.optional(Schema.String),
        domain_id: Schema.String,
        actions: IssueActions,
    },
    Output: { domain_id: Schema.String },
})
export const IssuesRemote = Remote.define({
    entities: [IssueCatalog],
    queries: [DomainIssues],
    mutations: [ChangeIssues],
})
