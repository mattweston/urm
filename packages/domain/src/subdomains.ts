import { Schema } from "effect"
import {
    SubdomainName,
    SubdomainSlug,
    SubdomainKind,
    PublicationStatus,
    PublicationAccess,
} from "./schemas/publications.ts"
export const SubdomainFields = Schema.Struct({
    name: SubdomainName,
    slug: SubdomainSlug,
    kind: SubdomainKind,
    status: PublicationStatus,
    access: PublicationAccess,
    expires_at: Schema.NullOr(Schema.Int),
})
export const SubdomainRecord = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    ...SubdomainFields.fields,
    updated_at: Schema.Number,
})
export const SubdomainCatalogRecord = Schema.Struct({
    id: Schema.String,
    subdomains: Schema.Array(SubdomainRecord),
})
export const SubdomainAction = Schema.Union([
    Schema.TaggedStruct("create", {
        id: Schema.String,
        ...SubdomainFields.fields,
    }),
    Schema.TaggedStruct("update", {
        id: Schema.String,
        ...SubdomainFields.fields,
    }),
    Schema.TaggedStruct("delete", { id: Schema.String }),
])
export type SubdomainAction = typeof SubdomainAction.Type
export class SubdomainError extends Schema.TaggedError<SubdomainError>()(
    "SubdomainError",
    { message: Schema.String }
) {}
