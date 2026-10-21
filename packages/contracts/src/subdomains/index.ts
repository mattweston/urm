import { Entity, Mutation, Query, Remote } from "foldkit-remote"
import { Schema } from "effect"
import { SubdomainCatalogRecord, SubdomainAction } from "@urm/domain/subdomains"
export const SubdomainCatalog = Entity.make(
    "SubdomainCatalog",
    SubdomainCatalogRecord
)
export const SubdomainSummary = SubdomainCatalog.select({
    id: true,
    subdomains: true,
})
export const DomainSubdomains = Query.make("DomainSubdomains", {
    Input: { domain_id: Schema.String },
    Result: SubdomainCatalog,
})
export const ChangeSubdomains = Mutation.make("ChangeSubdomains", {
    Input: { domain_id: Schema.String, action: SubdomainAction },
    Output: { domain_id: Schema.String },
})
export const SubdomainsRemote = Remote.define({
    entities: [SubdomainCatalog],
    queries: [DomainSubdomains],
    mutations: [ChangeSubdomains],
})
